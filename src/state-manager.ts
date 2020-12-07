import type { Immutable, lsOptions, subFct } from './@types';
import {
  Dict, Optional, objKeyVals, uiid, wait,
  objVals, equal, objExtract, isType,
} from '@giveback007/util-lib';

const LS_KEY = '-utilStateManager';

export class StateManager<State, Key extends keyof State = keyof State>
{
  /**
   * emittedState is used to check if an emit is
   * necessary, it is not the same as prevState.
   */
  private emittedState2: Immutable<State> = undefined as any;
  private emittedState: Immutable<State> = undefined as any;
  private state: Immutable<State> = {} as any;

  private readonly useLS:
    lsOptions<Key> | false = false;

  private subscriptions: Dict<subFct<State>> = { };

  /**
   * The local storage takes an id, this id
   * should be unique in order to ensure that the
   * storage is unique to the given state object
   */
  constructor(
    initialState: State,
    useLocalStorage?: lsOptions<Key>
  )
  {
      let state = { } as State;

      if (useLocalStorage) {
          const { useKeys, ignoreKeys, id } = useLocalStorage;

        if (useKeys && ignoreKeys) throw Error(
          '\'useKeys\' & \'ignoreKeys\' are'
          + ' mutually exclusive, only use one'
          + ' or the other.'
        );

        this.useLS = useLocalStorage;
        const lsId = this.useLS.id = id + LS_KEY;

        state = {
          ...initialState,
          ...this.stateFromLS()
        };

        addEventListener('storage', (e) => {
          if (e.key !== lsId) return;

          let fromLS = this.stateFromLS();

          if (useKeys)
            fromLS = objExtract(fromLS, useKeys);
          else if (ignoreKeys)
            ignoreKeys.forEach((key) => delete fromLS[key]);

          if (equal(this.state, { ...this.state, ...fromLS })) return;

          this.setState(fromLS);
        });
      } else state = initialState;

    this.setState(state);
  }

  getState = () => this.state;

  setState = async (updateState: Optional<State>) =>
  {
    const newState = { ...this.state } as State;

    objKeyVals(updateState).forEach((o) => newState[o.key] = o.val as any);

    const prevState = this.state;
    this.state = newState;
    await this.stateChanged(prevState);

    return this.getState();
  }

  /** Will execute the given function on state change */
  subscribe = ( funct: subFct<State>, fireOnInitSub = false) =>
  {
    const id = uiid();
    this.subscriptions[id] = funct;

    if (fireOnInitSub && this.emittedState)
      funct(this.emittedState, this.emittedState2);

    return { unsubscribe: () => delete this.subscriptions[id] };
  }

  /** Subscribe only to specific key(s) changes in state */
  subToKeys = <K extends Key = Key>(
    keys: K[] | K,
    funct: subFct<State>,
    fireOnInitSub = false
  ) => {
    if (isType(keys, 'array') && keys.length === 1) keys = keys[0];

    const id = uiid();
    let f: typeof funct;

    if (isType(keys, 'string')) f = (s, prev) => {
      if (
        !equal(this.emittedState[keys as K], this.state[keys as K])
      ) funct(s, prev);
    }

    else f = (s, prev) => {
      for (const k of keys as K[])
        if (!equal(this.emittedState[k], this.state[k]))
          return funct(s, prev);
    }

    this.subscriptions[id] = f;

    if (fireOnInitSub && this.emittedState)
      funct(this.emittedState, this.emittedState2);

    return { unsubscribe: () => delete this.subscriptions[id] };
  }

  private stateChanged = async (
    prevState: Immutable<State>
  ) => {
    
    // makes sure to run only after all sync
    // code updates the state
    await wait(0);

    if (equal(this.emittedState, this.state)) return;

    this.updateLocalStorage();

    objVals(this.subscriptions).forEach((f) => f(this.state, prevState));

    this.emittedState2 = this.emittedState;
    this.emittedState = this.state;
  }

  private stateFromLS = () =>
  {
    if (!this.useLS) return;

    const { id } = this.useLS;
    const strState = localStorage.getItem(id);
    if (!strState) return { };

    return JSON.parse(strState);
  }

  private updateLocalStorage = () =>
  {
    if (!this.useLS) return;

    const { id, ignoreKeys, useKeys } = this.useLS;

    let state = { ...this.state } as State;

    if (ignoreKeys)
      ignoreKeys.forEach((key) => delete state[key]);
    else if (useKeys)
      state = objExtract(state, useKeys);

    localStorage.setItem(id, JSON.stringify(state));
  }
}