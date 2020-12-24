import type { Dict, Optional } from '@giveback007/util-lib';
import type {
  Action, actSubFct, lsOptions, stateSubFct
} from './@types';
import {
  objKeyVals, uiid, wait, objVals, equal, objExtract, isType, objKeys,
} from '@giveback007/util-lib';

export class StateManager<
  State extends { },
  Act extends Action<any, any> = Action<any, any>,
  Key extends Extract<keyof State, string> = Extract<keyof State, string>
> {

  private prevState:    State | null = null;
  private emittedState: State | null = null;
  private state:        State;

  private readonly useLS: lsOptions<Key> | false = false;

  private stateSubDict:   Dict<stateSubFct<State>>  = { };
  private actionSubDict:  Dict<actSubFct<Act>>      = { };

  private stateWasUpdated = true;
  private keysChanged: { [K in Key]?: true } = { };

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
        '"useKeys" & "ignoreKeys" are mutually '
        + 'exclusive, only use one or the other.'
      );

      this.useLS = useLocalStorage;
      const lsId = this.useLS.id = id + '-utilStateManager';

      state = {
        ...initialState,
        ...this.stateFromLS(),
      };

      addEventListener('storage', (e: StorageEvent) => {
        if (e.key !== lsId) return;

        let fromLS = this.stateFromLS();

        if (useKeys)
          fromLS = objExtract(fromLS, useKeys);
        else if (ignoreKeys)
          ignoreKeys.forEach((key) => delete fromLS[key]);

        if (equal(this.state, { ...this.state, ...fromLS })) return;

        this.setState(fromLS);
      });
    } else {
      state = initialState;
    }

    this.state = state;
    this.setState(state);
  }

  getState = () => this.state;

  setState = async (updateState: Optional<State>) => {
    objKeyVals(updateState)
      .forEach(({ key, val }) => this.state[key] = val as any);

    this.stateWasUpdated = true;
    await this.stateChanged();
    return this.getState();
  }

  action = <A extends Act = Act>(action: A) =>
    objVals(this.actionSubDict).forEach((f) => f(action));

  /**
   * Will execute the given function on state change. Subscribe to
   * specific key(s) changes in state by setting keys to the desired
   * key(s) to sub to. Set `keys: true` to sub to all state changes.
   */
  stateSub = <K extends Key = Key>(
    keys: true | K[] | K,
    fct: stateSubFct<State>,
    fireOnInitSub = false
  ) => {
    if (isType(keys, 'array') && keys.length === 1)
      keys = keys[0];

    let f = fct;

    if (isType(keys, 'string')) f = (s, prev) => {
      if (this.keysChanged[keys as K]) return fct(s, prev);
    }

    else if (isType(keys, 'array')) f = (s, prev) => {
      for (const k of keys as K[])
        if (this.keysChanged[k]) return fct(s, prev);
    }

    if (fireOnInitSub && this.emittedState && this.prevState)
      fct(this.emittedState, this.prevState);

    const id = uiid();
    this.stateSubDict[id] = f as any;
    return { unsubscribe: () => delete this.stateSubDict[id] };
  }

  /** set `true` if to subscribe to all actions */
  actionSub = <A extends Act = Act> (
    actions: true | A['type'] | A['type'][],
    fct: actSubFct<A>
  ) => {
    if (isType(actions, 'array') && actions.length === 1)
      actions = actions[0];

    let f = fct;

    if (isType(actions, 'string')) f = (a) => {
      if (a.type === actions) return fct(a)
    }

    else if (isType(actions, 'array')) f = (a) => {
      for (const act of actions as A['type'][])
        if (a.type === act) return fct(a);
    }

    const id = uiid();
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
  destroy = () => {
    if (this.useLS)
      localStorage.removeItem(this.useLS.id);

    objKeys(this).forEach((k) => delete this[k]);
    (this as any).type = 'StateManager';
    (this as any).destroyed = true;
  }

  private stateChanged = async () => {
    // Ensures to run only after all sync code updates the state.
    await wait(0);
    if (!this.stateWasUpdated) return;

    let stateDidNotChange = true;
    for (const k in this.state) {
      const em = this.emittedState || { } as State;
      if (!equal(this.state[k], em[k])) {
        stateDidNotChange = false;
        this.keysChanged[k as Key] = true;
      }
    }

    if (stateDidNotChange)
      return this.stateWasUpdated = false;

    this.updateLocalStorage();

    objVals(this.stateSubDict)
      .forEach((f) => f(this.state, this.prevState as State));

    this.prevState = this.emittedState;
    this.emittedState = this.state;
    this.state = { ...this.state }; // Make new obj (or get bugs)!

    this.keysChanged = { };
    this.stateWasUpdated = false;
    return true;
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

    let state = { ...this.state };

    if (ignoreKeys)
      ignoreKeys.forEach((key) => delete state[key]);
    else if (useKeys)
      state = objExtract(state, useKeys);

    localStorage.setItem(id, JSON.stringify(state));
  }
}
