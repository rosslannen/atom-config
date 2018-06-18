import resolve = require('resolve');
import { fileExtensions } from './file-extensions';
import { file } from './file';
import { Entry } from './entry';
import { AsyncOpts } from 'resolve';
import { dirname, extname, resolve as resolvePath } from 'path';
import { readdir, stat } from 'fs';

export const resolveOptions: AsyncOpts = {
    extensions: fileExtensions,
    packageFilter: (pkg: any) => {
        const { typings, module } = pkg;
        if (typings) {
            pkg.main = typings;
        } else if (module) {
            pkg.main = module;
        }
        return pkg;
    },
};

type ModuleOptions = {
    basedir?: string;
};

export function module(id: string, options: ModuleOptions = {}): Promise<Entry[]> {
    let name = id;
    let isTypes = false;
    if (name.indexOf('@types/') === 0) {
        isTypes = true;
        name = name.slice(7);
    }
    return new Promise<{ entries: Entry[], resolved?: string }>((done, reject) => {
        resolve(id, { ...resolveOptions, ...options }, (err: Error & { code?: string }, resolved) => {
            const next = (resolved: string) => {
                if (resolved) {
                    return file(resolved, { module: name }).then(entries => done({ entries, resolved }), reject);
                }
                done({ entries: [], resolved: undefined });
            };
            if (err) {
                if (err.code === 'MODULE_NOT_FOUND' && !isTypes) {
                    resolve(`${id}/types`, { ...resolveOptions, ...options }, (err, resolved) => {
                        if (err) {
                            return reject(err);
                        } else {
                            return next(resolved);
                        }
                    });
                } else {
                    reject(err);
                }
            } else {
                next(resolved);
            }
        });
    }).then(function next({ entries, resolved }): Promise<Entry[]> {
        if (!resolved) {
            return Promise.resolve(entries);
        }
        if (entries.length === 0 && extname(resolved) === '.js') {
            // Looks like commonjs module.
            return Promise.resolve([new Entry({ module: name, cjs: true })]);
        }
        let unnamed: Entry[];
        [unnamed, entries] = entries.reduce((result: Entry[][], m) => {
            result[Number(m.name != null)].push(m);
            return result;
        }, [[], []]);
        if (unnamed.length === 0) {
            return Promise.resolve(entries);
        }
        const basedir = dirname(resolved);
        const promises = unnamed.map(m => {
            return new Promise<Entry[]>((done, reject) => {
                if (!m.specifier) {
                    return done([]);
                }
                resolve(m.specifier, { ...resolveOptions, basedir }, (err, resolved) => {
                    if (err) {
                        return reject(err);
                    }
                    if (resolved) {
                        return file(resolved, { module: name }).then(items => {
                            return next({ entries: items, resolved }).then(done);
                        }, reject);
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
    }).then(entries => {
        const dirpath = resolvePath(options.basedir || '.', 'node_modules', id);
        const submodules: string[] = [];
        return new Promise<string[]>((done, reject) => {
            readdir(dirpath, (err, items) => {
                if (err) {
                    return reject(err);
                }
                let count = items.length;
                if (count === 0) {
                    done([]);
                }
                items.forEach(item => {
                    stat(resolvePath(dirpath, item, 'package.json'), (err, stats) => {
                        if (stats && stats.isFile()) {
                            submodules.push(`${id}/${item}`);
                        }
                        if (--count === 0) {
                            done(submodules);
                        }
                    });
                });
            });
        }).then(submodules => {
            if (submodules.length > 0) {
                const promises = submodules.map(m => module(m, options).then(items => {
                    entries.push(...items);
                }, err => {
                    if (err && err.code === 'MODULE_NOT_FOUND') {
                        return Promise.resolve([]);
                    }
                    return err;
                }));
                return Promise.all(promises).then(() => entries);
            }
            return entries;
        });
    }).catch(err => {
        if (err && (err.code === 'MODULE_NOT_FOUND' || err.code === 'ENOENT')) {
            return Promise.resolve([]);
        }
        return Promise.reject(err);
    });
}
