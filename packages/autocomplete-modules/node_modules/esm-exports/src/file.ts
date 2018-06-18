import { readFile } from 'fs';
import { parse } from './parse';
import { Entry } from './entry';
import { dirname, resolve as resolvePath } from 'path';
import { resolveOptions } from './module';
import resolve = require('resolve');

type FileOptions = {
    basedir?: string;
    module?: string;
    filepath?: string;
};

export function file(path: string, options: FileOptions = {}): Promise<Entry[]> {
    const filepath = resolvePath(options.basedir || '.', path);
    return new Promise<{ entries: Entry[], options: FileOptions }>((done, reject) => {
        readFile(filepath, { encoding: 'utf8' }, (err, data: string) => {
            if (err) {
                return reject(err);
            }
            options = { ...options, filepath: options.filepath || filepath };
            const entries = parse(data, options);
            done({ entries, options });
        });
    })
        .then(function next({ entries, options }) {
            let unnamed: Entry[];
            [unnamed, entries] = entries.reduce((result: Entry[][], m) => {
                result[Number(m.name != null)].push(m);
                return result;
            }, [[], []]);
            if (unnamed.length === 0) {
                return Promise.resolve(entries);
            }
            const basedir = dirname(filepath);
            const promises = unnamed.map(m => {
                return new Promise<Entry[]>((done) => {
                    if (!m.specifier) {
                        done([]);
                        return;
                    }
                    resolve(m.specifier, { ...resolveOptions, basedir }, (err, resolved) => {
                        // Supress error, file do not exists or not readable
                        // E.g. export * from "fs"
                        if (err) {
                            done([]);
                            return;
                        }
                        if (resolved) {
                            return file(resolved, options).then(items => {
                                done(items);
                            }, () => {
                                done([]);
                            });
                        }
                        done([]);
                    });
                }).then(items => {
                    entries.push(...items);
                });
            });
            return Promise.all(promises).then(() => {
                return entries;
            });
        });
}
