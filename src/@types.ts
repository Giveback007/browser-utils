import type { Dict } from '@giveback007/util-lib';

export type UrlObj = {
    origin?: string;
    pathname?: string;
    params: Dict<string | undefined>;
};
