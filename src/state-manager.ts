import type { Dict, Optional } from '@giveback007/util-lib';
import type {
  Action, actSubFct, Immutable, lsOptions, stateSubFct
} from './@types';
import {
  objKeyVals, uiid, wait, objVals, equal, objExtract, isType, objKeys,
} from '@giveback007/util-lib';

const LS_KEY = '-utilStateManager';

export class StateManager<
  State,
  Act extends Action<any, any> = Action<any, any>,
  Key extends keyof State = keyof State
> {
  /**
   * emittedState is used to check if an emit is
   * necessary, it is not the same as prevState.
   */
  private emittedState2:  Immutable<State> = { } as any;
  private emittedState:   Immutable<State> = { } as any;
  private state:          Immutable<State> = { } as any;

  private readonly useLS:
    lsOptions<Key> | false = false;

  private stateSubDict: Dict<stateSubFct<State>> = { };
  private actionSubDict: Dict<actSubFct<Act>> = { };

  /**
   * The local storage takes an id, this id
   * should be unique in order to ensure that the
   * storage is unique to the given state object
   */
  constructor(
    initialState: State,
    useLocalStorage?: lsOptions<Key>
  ) {
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

  setState = async (updateState: Optional<State>) => {
    const newState = { ...this.state } as State;

    objKeyVals(updateState)
      .forEach((o) => newState[o.key] = o.val as any);

    const prevState = this.state;
    this.state = newState;
    await this.stateChanged(prevState);

    return this.getState();
  }

  /** Will execute the given function on state change */
  stateSub = (fct: stateSubFct<State>, fireOnInitSub = false) => {
    const id = uiid();
    this.stateSubDict[id] = fct;

    if (fireOnInitSub && this.emittedState)
      fct(this.emittedState, this.emittedState2);

    return { unsubscribe: () => delete this.stateSubDict[id] };
  }

  /** Subscribe only to specific key(s) changes in state */
  keysSub = <K extends Key = Key>(
    keys: K[] | K,
    fct: stateSubFct<State>,
    fireOnInitSub = false
  ) => {
    if (isType(keys, 'array') && keys.length === 1) keys = keys[0];

    const id = uiid();
    let f: typeof fct;

    if (isType(keys, 'string')) f = (s, prev) => {
      if (
        !equal(this.emittedState[keys as K], this.state[keys as K])
      ) fct(s, prev);
    }

    else f = (s, prev) => {
      for (const k of keys as K[])
        if (!equal(this.emittedState[k], this.state[k]))
          return fct(s, prev);
    }

    this.stateSubDict[id] = f;

    if (fireOnInitSub && this.emittedState)
      fct(this.emittedState, this.emittedState2);

    return { unsubscribe: () => delete this.stateSubDict[id] };
  }

  action<A extends Act>(action: A) {
    objVals(this.actionSubDict).forEach((f) => f(action));
  }

  /** set `true` if to subscribe to all actions */
  actionSub<A extends Act>(
    actions: true | A['type'] | A['type'][],
    fct: actSubFct<A>
  ) {
    if (
      isType(actions, 'array')
      &&
      actions.length === 1
    ) actions = actions[0];

    const id = uiid();
    let f = fct;

    if (isType(actions, 'string'))
      f = (a) => a.type === actions ? fct(a) : null;

    else if (isType(actions, 'array')) f = (a) => {
      for (const act of actions as A['type'][])
        if (a.type === act) return fct(a);
    }

    this.actionSubDict[id] = f as any;
    return { unsubscribe: () => delete this.actionSubDict[id] };
  }

  /**
   * Erases local storage managed by this instance of StateManager,
   * & removes all properties/methods on the object. (This way any
   * attempts of accessing the object should return an error);
   *
   * (For debugging purposes):
   * Object will have this appearance afterwards:
   * ```js
   * { type: 'StateManager', destroyed: true }
   * ```
   */
  destroy() {
    if (this.useLS)
      localStorage.removeItem(this.useLS.id);

    objKeys(this).forEach((k) => delete this[k]);
    (this as any).type = 'StateManager';
    (this as any).destroyed = true;
  }

  private stateChanged = async (
    prevState: Immutable<State>
  ) => {
    // makes sure to run only after all sync
    // code updates the state
    await wait(0);

    if (equal(this.emittedState, this.state)) return;

    this.updateLocalStorage();

    objVals(this.stateSubDict)
      .forEach((f) => f(this.state, prevState));

    this.emittedState2 = this.emittedState;
    this.emittedState = this.state;
  }

  private stateFromLS = () => {
    if (!this.useLS) return;

    const { id } = this.useLS;
    const strState = localStorage.getItem(id);
    if (!strState) return { };

    return JSON.parse(strState);
  }

  private updateLocalStorage = () => {
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
