import * as assert from 'assert';
import { Entry } from './entry';
import { module as parse } from './module';
const pkgDir = require('pkg-dir');
const rootPath = pkgDir.sync();

it('parse module smoke', () => {
    assert(parse);
});

it('angular2-calendar', async function() {
    const result = await parse('angular2-calendar', { basedir: rootPath });
    const [first] = result;
    assert.equal(first.module, 'angular2-calendar');
    const calendarEventTitleEntry = result.find(item => item.name === 'CalendarEventTitle');
    assert(calendarEventTitleEntry);
    assert.equal(calendarEventTitleEntry.module, 'angular2-calendar');
    assert(result.filter(m => !m.name).length === 0, 'all entries must have name');
});

it('rxjs module, node_modules names should be uniq', async () => {
    const result = await parse('rxjs', { basedir: rootPath });
    const ids = result.map(item => item.id());
    const uniqIds: string[] = [...new Set(ids)];
    assert.equal(uniqIds.length, ids.length);
    assert(result.filter(m => !m.name).length === 0, 'all entries must have name');
});

it('gulp-tslint', async () => {
    const result = await parse('gulp-tslint', { basedir: rootPath });
    const falsyNodes = result.filter(v => !v);
    assert(falsyNodes.length === 0);
    const pluginOptions = result.find(v => v.name === 'PluginOptions');
    assert(pluginOptions);
    assert(pluginOptions.module === 'gulp-tslint');
    assert(result.filter(m => !m.name).length === 0, 'all entries must have name');
});

it('no falsy nodes', async () => {
    const result = await parse('@angular/core', { basedir: rootPath });
    const falsyNodes = result.filter(v => !v);
    assert(falsyNodes.length === 0);
    assert(result.filter(m => !m.name).length === 0, 'all entries must have name');
});

it('parse unknown module', async () => {
    const result = await parse('unknown_module_foo', { basedir: rootPath });
    assert(result.length === 0);
    assert(result.filter(m => !m.name).length === 0, 'all entries must have name');
});

it('inner module', async () => {
    const result = await parse('@angular/core/testing', { basedir: rootPath });
    const inject = result.find(n => n.name === 'inject');
    assert(inject);
    const TestBed = result.find(n => n.name === 'TestBed');
    assert(TestBed);
    assert(result.filter(m => !m.name).length === 0, 'all entries must have name');
});

it('should find inner module properly', async () => {
    const result = await parse('@angular/core', { basedir: rootPath });
    const testing = result.filter(n => n.module === '@angular/core/testing');
    assert(testing.length);
    const inject = result.filter(n => n.name === 'inject');
    assert.notEqual(inject.length, 0);
    assert(result.filter(m => !m.name).length === 0, 'all entries must have name');
});

it('should not contain duplicated entries (modules)', async () => {
    const result = await parse('@angular/core', { basedir: rootPath });
    const inject = result.filter(n => n.name === 'inject' && n.module === '@angular/core');
    assert.equal(inject.length, 1);
    const TestBed = result.filter(n => n.name === 'TestBed');
    assert.equal(TestBed.length, 1);
    assert(result.filter(m => !m.name).length === 0, 'all entries must have name');
});

it('types node', async () => {
    const result = await parse('@types/node', { basedir: rootPath });
    const bastards = result.filter(m => m.module === '@types/node');
    assert.equal(bastards.length, 0, 'globals should be eliminated');
    const buffer = result.filter(m => m.module === 'buffer');
    const events = result.filter(m => m.module === 'events');
    assert(events.length > 0);
    assert(buffer.length > 0);
    const spawnSyncList = result.filter(m => m.name === 'spawnSync' && m.module === 'child_precess');
    assert(result.filter(m => !m.name).length === 0, 'all entries must have name');
});

it('commonjs modules pkg-dir', async () => {
    const result = await parse('pkg-dir', { basedir: rootPath });
    assert(result.length > 0);
    assert(result.filter(m => m.module !== 'pkg-dir').length === 0);
    const [entry] = result;
    assert(entry.module === 'pkg-dir');
    assert(entry.cjs === true);
});

it('types express', async () => {
    const result = await parse('@types/express', { basedir: rootPath });
    assert(result.length > 0);
    const request = result.find(n => n.name === 'Request');
    assert(request);
    assert(request.module === 'express');
});

it('types fs-extra', async () => {
    const result = await parse('@types/fs-extra', { basedir: rootPath });
    assert(result.length > 0);
    const [copy] = result.filter(m => m.name === 'copy');
    assert(copy);
    const [copyOptions] = result.filter(m => m.name === 'CopyOptions');
    assert(copyOptions);
});

it('preact', async () => {
    const result = await parse('preact', { basedir: rootPath });
    assert(result.length > 0);
});

it('hover', async () => {
    const result = await parse('hover', { basedir: rootPath });
    assert(result.length > 0);
});

it('type-zoo', async () => {
    const result = await parse('type-zoo', { basedir: rootPath });
    assert.notEqual(result.length, 0);
    assert(result.find(f => f.name === 'Required'));
    assert(result.find(f => f.name === 'unknown'));
});
