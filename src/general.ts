export const copyToClipboard = (str: string) => navigator.clipboard.writeText(str);

export const viewSize = ({ innerWidth, innerHeight } = window) =>
    ({ width: innerWidth, height: innerHeight });

export function elmById(id: string)
{
    const el = document.getElementById(id);
    if (!el) throw Error('no element with id: ' + id);

    return el;
};
