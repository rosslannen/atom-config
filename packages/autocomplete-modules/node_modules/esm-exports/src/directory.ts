import { readdir, stat } from 'fs';
import { Entry } from './entry';
import { file as parse } from './file';
import { resolve as resolvePath, parse as parsePath } from 'path';
import { fileExtensions } from './file-extensions';

const objectValues = require('object-values');
const ignoreDirectoryList = ['node_modules'];

type DirectoryOptions = {
    basedir?: string;
};

export function directory(path: string, options: DirectoryOptions = {}): Promise<Entry[]> {
    try {
        var dirpath = resolvePath(options.basedir || '.', path); // eslint-disable-line tslint/config
    } catch (err) {
        return Promise.reject(err);
    }
    return new Promise<string[]>((done, reject) => {
        readdir(dirpath, (err, files) => {
            if (err) {
                return reject(err);
            }
            done(files);
        });
    }).then((items: string[]) => {
        const directories: string[] = [];
        let count = items.length;
        if (count === 0) {
            return Promise.resolve([]);
        }
        return new Promise<{ directories: string[], files: string[] }>((done, reject) => {
            const names: { [name: string]: [number, string] } = Object.create(null);
            items.forEach(item => {
                stat(resolvePath(dirpath, item), (err, stats) => {
                    if (err) {
                        return reject(err);
                    }
                    if (stats.isDirectory()) {
                        if (!ignoreDirectoryList.includes(item)) {
                            directories.push(item);
                        }
                    } else if (stats.isFile()) {
                        const { name, ext } = parsePath(item);
                        const extIndex = fileExtensions.indexOf(ext);
                        if (extIndex !== - 1) {
                            const [nameIndex] = names[name] || [Infinity];
                            if (extIndex < nameIndex) {
                                names[name] = [extIndex, item];
                            }
                        }
                    }
                    count--;
                    if (count === 0) {
                        done({ directories, files: objectValues(names).map(([, file]) => file) });
                    }
                });
            });
        }).then(({ directories, files }) => {
            const result: Entry[] = [];
            const options = { basedir: dirpath };
            const promises = files.map(file => parse(file, options)
                .then(entries => {
                    result.push(...entries);
                }));
            return Promise.all(promises)
                .then(() => {
                    const promises = directories.map(d => {
                        return directory(d, options).then(entries => {
                            result.push(...entries);
                        });
                    });
                    return Promise.all(promises).then(() => result);
                });
        });
    });
}
