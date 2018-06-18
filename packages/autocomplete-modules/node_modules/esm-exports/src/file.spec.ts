import * as assert from 'assert';
import { file } from './file';
import { normalize } from 'path';
const pkgDir = require('pkg-dir');
const rootPath = pkgDir.sync();

it('import all should contain name', async () => {
    const result = await file(`${rootPath}/fixtures/component/index.ts`);
    assert(result.length > 0);
    assert(result.filter(m => !m.name).length === 0, 'all entries must have name');
    assert(result.filter(m => m.module).length === 0, 'module property must be falsy');
    const [abc] = result.filter(m => m.name === 'AbcComponent');
    assert.equal(abc.filepath, normalize(`${rootPath}/fixtures/component/index.ts`));
    const [x2] = result.filter(m => m.name === 'x2');
    assert.equal(x2.filepath, normalize(`${rootPath}/fixtures/component/index.ts`));
});

it('try to parse unexisting file', async () => {
    const result = await file(`${rootPath}/fixtures/lead-to-unknown.ts`);
    assert(result.length === 0);
});
