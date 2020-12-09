import type { Dict } from '@giveback007/util-lib';

export type Url = {
    origin: string;
    pathname: string;
    params: Dict<string | undefined>;
}