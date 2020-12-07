export type Immutable<T> = {
    readonly [K in keyof T]: Immutable<T[K]>;
}

export type subFct<S> = (s: Immutable<S>, prev: Immutable<S>) => any

export type lsOptions<P> = { id: string, useKeys?: P[], ignoreKeys?: P[] };
