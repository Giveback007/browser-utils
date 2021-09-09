import type {
  Action, actSubFct, lsOptions, stateSubFct
} from './@types';
import {
  uiid, wait, equal, objExtract, isType, objKeys, clone, KeysOfValueType
} from '@giveback007/util-lib';
import type { Dict } from '@giveback007/util-lib';

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

  private throttledState: Dict<Partial<State>> = { };
  private throttlersRunning: Dict<boolean> = { };
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

  setState = async (updateState: Partial<State>) => {
    // Do this, otherwise you are mutating the value.
    // (Would make bugs in this case)
    this.state = { ...this.state };

    for (const k in updateState)
      this.state[k] = updateState[k] as any;

    this.stateWasUpdated = true;
    await this.stateChanged();
    return this.getState();
  }

  action = <A extends Act = Act>(action: A | A['type']) => {
    if (isType(action, 'string')) action = { type: action } as A;
    const state = this.getState();

    for (const k in this.actionSubDict)
      this.actionSubDict[k](action, state);

    return action;
  }

  // -- State Set Throttler -- //
  /**
   * Aggregates state updates by this method over the course of
   * `msCycle` time and sets the state only once per `msCycle` time.
   *
   * Different `msCycle` timings run on separate loops, therefore can
   * run multiple `msCycle` at the same time.
   *
   * To keep state consistent and to prevent bugs, any key run-ins set
   * in previous `msCycle`(s) will be overwritten by latest
   * `throttledSetState()` call.
   *
   * Will wait the full designated time in `msCycle` on first run.
   */
  throttledSetState = async (
    msCycle: number,
    updateState: Partial<State>
  ) => {
    if (!this.throttledState[msCycle])
      this.throttledState[msCycle] = { };

    const tsKeys = objKeys(this.throttledState);
    for (const k in updateState) {
      this.throttledState[msCycle][k] = updateState[k];

      tsKeys.forEach((tsKey) => // To keep state consistent
        this.throttledState[tsKey][k] = updateState[k]);
    }

    this.throttledStateSetter(msCycle);
  }

  private throttledStateSetter = async (msCycle: number) => {
    if (this.throttlersRunning[msCycle]) return;
    this.throttlersRunning[msCycle] = true;

    await wait(msCycle);
    while (this.throttledState[msCycle]) {
      this.setState(this.throttledState[msCycle]);
      delete this.throttledState[msCycle];
      await wait(msCycle);
    }

    this.throttlersRunning[msCycle] = false;
  }
  // -- State Set Throttler -- //

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

    if (fireOnInitSub)
      fct(this.emittedState || this.state, this.prevState);

    const id = uiid();
    this.stateSubDict[id] = f as any;
    return { unsubscribe: () => delete this.stateSubDict[id] };
  }

  /** set `true` if to subscribe to all actions */
  actionSub = <
    T extends Act['type'] = Act['type'],
    A extends Extract<Act, { type: T }> = Extract<Act, { type: T }>
  > (
    actions: true | T | T[],
    fct: actSubFct<A, State>
  ) => {
    if (isType(actions, 'array') && actions.length === 1)
      actions = actions[0];

    let f = fct;

    if (isType(actions, 'string')) f = (a, s) => {
      if (a.type === actions) return fct(a, s);
    }

    else if (isType(actions, 'array')) f = (a, s) => {
      for (const act of actions as T['type'][])
        if (a.type === act) return fct(a, s);
    }

    const id = uiid();
    this.actionSubDict[id] = f as any;
    return { unsubscribe: () => delete this.actionSubDict[id] };
  }

  /**
   * Allows you to toggle any key with a boolean value true/false.
   */
  toggle = (key: KeysOfValueType<State, boolean>) =>
     this.setState({ [key]: (!this.getState()[key]) } as any);

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

    objKeys(this).forEach(k => delete this[k]);
    (this as any).type = 'StateManager';
    (this as any).destroyed = true;
  }

  cloneKey =
    <K extends Key>(key: K): State[K] => clone(this.state[key]);

  private stateChanged = async () => {
    // Ensures to run only after all sync code updates the state.
    await wait(0);
    if (!this.stateWasUpdated) return false;

    let stateDidNotChange = true;

    objKeys(this.state).forEach((k) => {
        const em = this.emittedState || { } as Partial<State>;

        if (// only check equality if not already changed.
            !this.keysChanged[k as Key] && equal(this.state[k], em[k])
        ) return;

        stateDidNotChange = false;
        this.keysChanged[k as Key] = true;
    });

    if (stateDidNotChange)
      return this.stateWasUpdated = false;

    this.updateLocalStorage();

    for (const k in this.stateSubDict)
      this.stateSubDict[k](this.state, this.prevState as State);

    this.prevState = this.emittedState;
    this.emittedState = this.state;
    this.state = { ...this.state }; // use obj spread (or get bugs)!

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
