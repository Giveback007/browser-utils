import type { Dict } from '@giveback007/util-lib';

export type UrlObj = {
    origin?: string;
    pathname?: string;
    params: Dict<string | undefined>;
};

export type Immutable<T> = {
    readonly [K in keyof T]: Immutable<T[K]>;
};

export type Action<T extends string, D> =
    Readonly<{type: T} | { type: T, data: D }>;

export type stateSubFct<S> = (s: S, prev: S | null) => any;

export type actSubFct<A extends Action<any, any>, S = any> = (a: A, s: S) => any;

export type lsOptions<P> =
    { id: string, useKeys?: P[], ignoreKeys?: P[] };
