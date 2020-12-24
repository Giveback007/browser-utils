import type { ComponentType, FunctionComponent, ComponentClass } from 'react';
import * as React from 'react';
import { equal, Optional } from '@giveback007/util-lib';
import type { StateManager } from './state-manager';

/**
 * Links `StateManager` with a react component.
 *
 * ```ts
 * const store = new StateManager(initState);
 * const linker = stateManagerReactLinker(store);
 *
 * class App extends React.Component<{ prop1: Val, prop2: Val }> {}
 * export const AppComponent = linker(s => ({ prop1: s.prop }), App);
 *
 * // now it looks like this:
 * <App prop2={someVal} />
 * // prop1 is assigned by stateLinker
 * ```
 */
export function stateManagerReactLinker<S>(store: StateManager<S>)
{
    class Linker<ChildProps, M, FP> extends React.Component<
        { mapper: (s: S) => M, Child: ComponentType<FP>, childProps: ChildProps }, M
    > {
        state = this.props.mapper(store.getState());
        sub: { unsubscribe: () => boolean; } | null = null;

        componentDidMount = () => this.sub = store.stateSub(true, (s) => {
            const newState = this.props.mapper(s);
            if (!equal(newState, this.state)) this.setState(newState);
        });

        componentWillUnmount = () => this.sub?.unsubscribe();

        shouldComponentUpdate = (nextProps: any, nextState: any) =>
            !equal(nextState, this.state)
            ||
            !equal(nextProps.childProps, this.props.childProps)

        render() {
            // tslint:disable-next-line: variable-name
            const Child: ComponentType<ChildProps & M> = this.props.Child as any;
            return <Child {...{ ...this.state, ...this.props.childProps }} />;
        }
    }

    return function connect<
        FP,
        C extends ComponentClass<FP, any> | FunctionComponent<FP>,
        M extends Optional<FP>
    // tslint:disable-next-line: variable-name
    >(mapper: (s: S) => M, Comp: C | ComponentType<FP>) {
        type Props = Pick<FP, Exclude<keyof FP, keyof M | 'children'>>;

        return ((props: Props) => {
            return <Linker<Props, M, FP> {...{ mapper, Child: Comp, childProps: props }} />
        }) as FunctionComponent<{ [K in keyof Props]: Props[K] }>;
    }
}
