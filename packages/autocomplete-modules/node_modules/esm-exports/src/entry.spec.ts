import { equal, deepEqual } from 'assert';
import { Entry } from './entry';

it('id function', () => {
    const entry = new Entry({ name: 'abc', module: 'mod' });
    equal(entry.id(), 'abc/mod');
});

it('serialization should not contain private properties', () => {
    const entry = new Entry({ name: 'abc', module: 'mod' });
    const unserialized = JSON.parse(JSON.stringify(entry));
    deepEqual(Object.keys(unserialized), ['name', 'isDefault', 'module']);
});
