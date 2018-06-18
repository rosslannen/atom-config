import * as assert from 'assert';
import { directory } from '.';
import { normalize } from 'path';

it('should take only file by findFileExtensions', async () => {
    const result = await directory(__dirname + '/../fixtures');
    assert(result);
    assert(result.filter(m => !m.name).length === 0, 'all entries must have name');
    assert(result.filter(x => x.name === 'NotADummyComponent').length === 0);
    assert.equal(result[0].name, 'DummyComponent');
    assert.equal(result[0].filepath, normalize(__dirname + '/../fixtures/dummy.component.ts'));
});
