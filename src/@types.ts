export type Immutable<T> = {
    readonly [K in keyof T]: Immutable<T[K]>;
}

export type Action<T extends string, D> = Readonly<{
    type: T,
    data: D,
}>

export type stateSubFct<S> = (s: Immutable<S>, prev: Immutable<S>) => any;

export type actSubFct<A extends Action<any, any>> = (a: A) => any;

export type lsOptions<P> = { id: string, useKeys?: P[], ignoreKeys?: P[] };
