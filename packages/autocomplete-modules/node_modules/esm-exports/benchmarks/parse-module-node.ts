import { parse } from '../src/index';
import { readFileSync } from 'fs';
const nodeDefinitions = readFileSync(require.resolve('@types/node/index.d.ts'), { encoding: 'utf8' });
function parseNodeDefinitions(done) {
    parse(nodeDefinitions);
    done();
}
export = parseNodeDefinitions;
