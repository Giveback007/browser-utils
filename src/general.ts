import { Dict, objKeyVals } from '@giveback007/util-lib';
import type { Url as UrlObj } from './@types';

export const copyToClipboard = (str: string) => navigator.clipboard.writeText(str);

export const viewSize = ({ innerWidth, innerHeight } = window) =>
    ({ width: innerWidth, height: innerHeight });

export function elmById(id: string)
{
    const el = document.getElementById(id);
    if (!el) throw Error('no element with id: ' + id);

    return el;
};


// function inspired by this discussion:
// https://gist.github.com/pirate/9298155edda679510723
export function getUrlParams(loc: Location = window.location): UrlObj {
    const { origin, pathname, hash, search } = loc;
    const str = '' + hash ? hash : '' + search ? search : '';

    const hashes = str.slice(search.indexOf('?') + 1).split('&');
    const params: Dict<string | undefined> = hashes.reduce((obj, x) => {
      const [key, val] = x.split('=');
      if (!key || !val) return obj;

      return { ...obj, [key]: decodeURIComponent(val) };
    }, { });

    return { origin, pathname, params };
};

export function urlObjToString(urlObj: UrlObj): string {
    let str = urlObj.origin + urlObj.pathname;
    const params = objKeyVals(urlObj.params) as { key: string; val: string; }[];

    if (params.length) {
        str += '?'
        params.map(({ key, val }) => str += `&${key}=${val}`);
    }

    return str;
}
