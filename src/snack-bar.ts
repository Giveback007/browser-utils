import type { AnyObj } from '@giveback007/util-lib';
import { isType } from '@giveback007/util-lib';

export const snackBar = (item: any, time?: number) =>
{
    const str = isType(item, 'string') ? item : JSON.stringify(item);

    const stylesToString = (obj: AnyObj) => Object.entries(
        obj).reduce((s, x) => s + `${x[0]}: ${x[1]}; `, '');

    const body = document.getElementsByTagName('body').item(0);
    if (!body) throw new Error('<body> not found');

    let snack = document.getElementById('snack') as HTMLDivElement;
    let snackText = document.getElementById('snack-text') as HTMLDivElement;

    if (snackText) snackText.remove();
    if (snack) snack.remove();

    snack = document.createElement('div');
    snackText = document.createElement('div');

    snack.setAttribute('id', 'snack');
    snackText.setAttribute('id', 'snack-text');

    snack.appendChild(snackText);
    body.appendChild(snack);

    const textStyles =
    {
        'margin': 'auto',
        'max-width': '80%',
        'background': 'black',
        'opacity': '0.6',
        'font-size': '20px',
        'color': 'white',
        'padding': '2px 10px',
        'transition': 'all 0s',
        'text-align': 'center',
    }

    snack.setAttribute('style', stylesToString(
    {
        'position': 'fixed',
        'left': '0',
        'bottom': '10vh',
        'width': '100vw',
        'display': 'flex',
        'pointer-events': 'none',
        'z-index': '101',
    }));

    snackText.setAttribute('style', stylesToString(textStyles));

    snackText.innerText = isType(str, 'string') ? str : JSON.stringify(str);

    if (!time) {
        const y = str.length * 120;
        time = y < 4000 ? 4000 : y;
    }

    setTimeout(() => {
        snackText.setAttribute('style', stylesToString(
        {
            ...textStyles,
            'transition': `all ${time}ms`,
            'opacity': '0',
        }));
    }, 500);

    setTimeout(() =>
    {
        snack.remove();
        snackText.remove();
    }, time + 500);
}
