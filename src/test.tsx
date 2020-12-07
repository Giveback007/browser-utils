import * as React from 'react';
// import type { AnyObj } from "@giveback007/util-lib";
// import { Dict, isType, uiid } from "@giveback007/util-lib";
// import type { lsOptions, subFct } from "./@types";
// import { StateManager } from "./state-manager";

/* tslint:disable */
import type { Immutable } from './@types';
import type { StateManager } from './state-manager';

type P<S, M> = {
    mapper: (s: Immutable<S>) => M,
    store: StateManager<S>,
}

export class Applet<S, M> extends React.Component<P<S, M>> {

    state = this.props.mapper(this.props.store.getState());
    sub: { unsubscribe: () => boolean; } | null = null;

    private ref = React.createRef<HTMLDivElement>();
    get htmlRef() { return this.ref.current; }

    constructor(
        props: P<S, M>
    ) {
        super(props);
    }

    // componentDidMount = () =>

    render = () => <div ref={this.ref} />
}


function AppletIoInit<S>(store: StateManager<S>, uiID: string) {
    class AppletIO<UI, M> {

        private storeSubs;
        private uiSubs;
        private ID = uiID;

        constructor(
            mapper: (s: S) => M,
            initUiState: UI,
            uiData: {
                // min size
                // max size
            }
        ) {

        }

        onState = (
            ref: HTMLDivElement,
            props: { ui: UI, data: M },
            prev: { ui: UI, data: M }
        ) => {
            return { unsubscribe: () => {} }
        }

        onAction = (
            actionsToSub: string | string[],
            fct: (action: { type: string, data: any }) => any
        ) => {
            return { unsubscribe: () => {} }
        }

        onDestroy = () => {
            return { unsubscribe: () => {} }
        }

        /** DO NOT USE! */
        unmount() {
            // fire the onDestroy subscriptions

            // delete all subs |onState|onAction|onDestroy|storeSubs|
        }
    }

    return AppletIO;
}



// const x = SomeApplet;
// publishApplet(SomeApplet)

// --- --- --- //

// export class AppletInterOp<S, M> {
//     constructor(applet: Applet<S, M>) {
//         // const x = new applet({} as any);
//     }
// }

// type S_UI<UI> = { ui: UI };

// export class UiManager<
//     UI, State extends S_UI<UI>, Id extends keyof UI = keyof UI
// > extends StateManager<State> {

//     private uiSubs: Dict<subFct<UI[Id]>> = { };

//     constructor(
//         initialState: State,
//         useLocalStorage?: lsOptions<keyof State>
//     ) {
//         super(initialState, useLocalStorage);

//         this.subToKeys('ui', () => {

//         })
//     }

//     private uiStateChanged = () => {

//     }

//     uiState = <
//         UIID extends Id,
//         K extends keyof UI[UIID] = keyof UI[UIID],
//     >(uiID: UIID) => ({
//         stateOn: (
//             keys: K | K[] | true,
//             fct: (s: UI[UIID], prev: UI[UIID]) => any
//         ) => {
//             const sub = this.subToKeys('ui', (x => {
//                 const id = uiid();

//                 if (keys === true) {
//                     this.uiSubs[id] = fct as any;

//                     if (fireOnInitSub && this.emittedState)
//                       funct(this.emittedState, this.emittedState2);

//                     return { unsubscribe: () => {
//                         sub.unsubscribe();
//                         delete this.uiSubs[id]
//                     } };
//                 }

//                 if (isType(keys, 'array') && keys.length === 1) keys = keys[0];

//                 // const id = uiid();
//                 let f: typeof funct;

//                 if (isType(keys, 'string')) f = (s, prev) => {
//                     if (
//                     !equal(this.emittedState[keys as K], this.state[keys as K])
//                     ) funct(s, prev);
//                 }

//                 else f = (s, prev) => {
//                     for (const k of keys as K[])
//                     if (!equal(this.emittedState[k], this.state[k]))
//                         return funct(s, prev);
//                 }

//                 this.subscriptions[id] = f;

//                 if (fireOnInitSub && this.emittedState)
//                     funct(this.emittedState, this.emittedState2);

//                 return { unsubscribe: () => delete this.subscriptions[id] };
//             }))
//         }
//     })

//     uiAction(id: Id) {

//     }

// }
