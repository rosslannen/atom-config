import * as assert from 'assert';
import { parse } from './parse';
import { Entry } from './entry';

it('smoke test', () => {
    assert(parse);
});

it('var export', () => {
    const code = `export var aaa = 1`;
    const [result] = parse(code);
    assert.equal(result.name, 'aaa');
});

it('several var export', () => {
    const code = `export var aaa, bbb`;
    const [result, result2] = parse(code);
    assert.equal(result.name, 'aaa');
    assert.equal(result2.name, 'bbb');
});

it('export all', () => {
    const code = `export * from './provider'`;
    const [result] = parse(code);
    assert.equal(result.specifier, './provider');
});

it('export some from module', () => {
    const code = `export {var1} from './provider'`;
    const [result] = parse(code);
    assert.equal(result.name, 'var1');
    assert.equal(result.specifier, './provider');
});

it('pick export', () => {
    const code = `export { CalendarEvent, EventAction } from 'calendar-utils'`;
    const [first, second] = parse(code);
    assert.equal(first.name, 'CalendarEvent');
    assert.equal(first.specifier, 'calendar-utils');
    assert.equal(second.name, 'EventAction');
});

it('export declare class', () => {
    const code = `export declare class Calendar`;
    const [result] = parse(code);
    assert.equal(result.name, 'Calendar');
});

it('export class', () => {
    const code = `export class Aaa`;
    const [result] = parse(code);
    assert.equal(result.name, 'Aaa');
});

it('export interface', () => {
    const code = `export interface Entry {}`;
    const [result] = parse(code);
    assert.equal(result.name, 'Entry');
});

it('export function', () => {
    const code = `export function dummy() {}`;
    const [result] = parse(code);
    assert.equal(result.name, 'dummy');
});

it('export several vars', () => {
    const code = `export {somevar, otherVar}`;
    const [result, other] = parse(code);
    assert.equal(result.name, 'somevar');
    assert.equal(other.name, 'otherVar');
});

it('export default', () => {
    const code = `export default function foo() {}`;
    const [entry] = parse(code);
    assert.equal(entry.name, 'foo');
    assert.equal(entry.isDefault, true);
});

it('export default var', () => {
    const code = `export default component`;
    const [entry] = parse(code);
    assert(entry);
    assert.equal(entry.name, 'component');
    assert.equal(entry.isDefault, true);
});

it('empty source', () => {
    const code = ``;
    const result = parse(code);
    assert.deepEqual(result, []);
});

it('object binding', () => {
    const code = `export const {ModuleStore} = $traceurRuntime;`;
    const [result1] = parse(code);
    assert.equal(result1.name, 'ModuleStore');
});

it('should extract declared module http', () => {
    const source = `declare module "http" {
        export var METHODS: string[];
        export const c1, c2: any;
    }
    export var out1: number = 1;
    `;
    const result = parse(source);
    const out1 = result.find(e => e.name === 'out1');
    assert(out1);
    const httpEntries = result.filter(e => e.module === 'http');
    assert.equal(httpEntries.length, 3);
    assert.equal(httpEntries[0].name, 'METHODS');
    assert.equal(httpEntries[1].name, 'c1');
    assert.equal(httpEntries[2].name, 'c2');
});

it('should extract declared module events', () => {
    const source = `declare module "events" {
        class internal extends NodeJS.EventEmitter { }
        namespace internal {
            export class EventEmitter extends internal {
            }
        }
        export = internal;
    }`;
    const entries = parse(source);
    const event = entries.find(e => e.name === 'EventEmitter');
    assert(event);
    assert.equal(event.name, 'EventEmitter');
    assert.equal(event.module, 'events');
});

it('not too deep parse', () => {
    const source = `
    export function deep() {
        const x = {a: {c: {d: 1}}};
        return () => a => b => c => () => ({
            export = x;
        });
    };
}`;
    const result = parse(source);
    assert.equal(result.length, 1);
    assert.equal(result[0].name, 'deep');
});

it('duplicates must be removed', () => {
    const source = `
    export function spawnSync(command: string): SpawnSyncReturns<Buffer>;
    export function spawnSync(command: string, options?: SpawnSyncOptionsWithStringEncoding): SpawnSyncReturns<string>;
`;
    const result = parse(source);
    assert.equal(result.length, 1);
    assert.equal(result[0].name, 'spawnSync');
});

it('simulated commonjs', () => {
    const source = `
declare namespace e {
    interface Request extends core.Request { }
}
declare namespace d {
    declare const x = 1;
    function y() {}
}
export = e;
`;
    const result = parse(source, { module: 'somecjs' });
    assert.equal(result.length, 1);
    assert.equal(result[0].name, 'Request');
    assert.equal(result[0].cjs, true);
});

it('preact declaration', () => {
    const source = `
declare namespace preact {
    function rerender();
    type AnyComponent = {};
}
declare module "preact" {
    export = preact;
}
`;
    const result = parse(source, { module: 'preact' });
    assert(result[0].name === 'rerender');
    assert(result[1].name === 'AnyComponent');
});

it.skip('react definitions', () => {
    const source = `
export = React;
export as namespace React;
declare namespace React {
    type ReactType<P = any> = string | ComponentType<P>;
    interface Component<P = {}, S = {}> extends ComponentLifecycle<P, S> { }
    class PureComponent<P = {}, S = {}> extends Component<P, S> { }
}
`;
    const result = parse(source);
    assert(result.length > 0);
});

it('webpack', () => {
    const source = `
        export = webpack;
        declare function webpack(options?: webpack.Configuration): webpack.Compiler;
        declare namespace webpack {
            interface Configuration {
            }
        }
    `;
    const result = parse(source, { module: 'webpack' });
    const configuration: Entry = result.find(e => e.name === 'Configuration');
    assert(configuration);
});
