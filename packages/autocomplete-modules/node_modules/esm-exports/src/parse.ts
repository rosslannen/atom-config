import * as ts from 'typescript';
import { Entry } from './entry';
import { get } from './get';
import resolve = require('resolve');

export type ParseOptions = {
    module?: string;
    basedir?: string;
    filepath?: string;
};

function hasDefaultKeyword(node?: ts.Node) {
    return Boolean(node && node.modifiers && node.modifiers.find(m => m.kind === ts.SyntaxKind.DefaultKeyword));
}

class EntrySet {

    readonly result: Entry[] = [];
    private set = new Set<string>();

    push(entry: Entry) {
        const id = entry.id();
        if (!this.set.has(id)) {
            this.set.add(id);
            this.result.push(entry);
        }
    }
}

function getDeclarations(node: ts.Node, options: any) {
    const result: Entry[] = [];
    const declarations = get('declarationList.declarations', node) || [];
    declarations.forEach(d => {
        const name: string = d && d.name && d.name.text;
        if (name) {
            result.push(new Entry({ ...options, name }));
        }
        const names = get('name.elements', d) || [];
        names.forEach(d => {
            const name: string = d && d.name && d.name.text;
            result.push(new Entry({ ...options, name }));
        });
    });
    const name: string = (node as any).name && (node as any).name.text;
    if (name) {
        const isDefault = hasDefaultKeyword(node);
        result.push(new Entry({ ...options, name, isDefault }));
    }
    return result;
}

export function parse(sourceText: string, options: ParseOptions = {}): Entry[] {
    const sourceFile = ts.createSourceFile('dummy.ts', sourceText, ts.ScriptTarget.ES2015, true);
    let { module, filepath } = options; // eslint-disable-line tslint/config
    let moduleEnd: number | undefined;
    let moduleName: string | undefined;
    const moduleBlockDeclarations: { [k: string]: Entry[] } = {};
    const entrySet = new EntrySet();
    let exportExpression: ts.Expression;
    walk(sourceFile);
    function walk(statement: ts.Node) {
        const node = statement;
        if (node.pos >= moduleEnd!) {
            module = options.module;
            moduleName = undefined;
            moduleEnd = undefined;
        }
        switch (node.kind) { // eslint-disable-line tslint/config
            case ts.SyntaxKind.ModuleDeclaration: {
                const isDeclare = Boolean(node.modifiers && node.modifiers.find(m => m.kind === ts.SyntaxKind.DeclareKeyword));
                if (!isDeclare) {
                    break;
                }
                moduleName = (node as any).name && (node as any).name.text;
                if (moduleName) {
                    if (resolve.isCore(moduleName)) {
                        module = moduleName;
                    }
                }
                moduleEnd = node.end;
            } break;
            // case ts.SyntaxKind.VariableStatement:
            case ts.SyntaxKind.VariableDeclarationList:
            case ts.SyntaxKind.FunctionDeclaration:
            case ts.SyntaxKind.ClassDeclaration:
            case ts.SyntaxKind.InterfaceDeclaration:
            case ts.SyntaxKind.TypeAliasDeclaration:
            case ts.SyntaxKind.EnumDeclaration:
            case ts.SyntaxKind.VariableDeclaration: {
                if (node.parent!.kind === ts.SyntaxKind.ModuleBlock) {
                    if (moduleName) {
                        const entries = getDeclarations(node, { module, filepath });
                        if (!Array.isArray(moduleBlockDeclarations[moduleName])) {
                            moduleBlockDeclarations[moduleName] = [];
                        }
                        moduleBlockDeclarations[moduleName].push(...entries);
                    }
                }
            } break;
            case ts.SyntaxKind.ExportDeclaration: {
                const node = statement as ts.ExportDeclaration;
                const names: Array<(string | undefined)> = [];
                const exportAll = !(node.exportClause && node.exportClause.elements);
                if (exportAll) {
                    names.push(undefined);
                } else if (node.exportClause) {
                    node.exportClause.elements.forEach(e => names.push(e.name.text));
                }
                const specifier: string = get('moduleSpecifier.text', node);
                const isDefault = hasDefaultKeyword(node);
                names.forEach(name => {
                    const entry = new Entry({ name, module, filepath, specifier, isDefault });
                    entrySet.push(entry);
                });
            } break;
            case ts.SyntaxKind.ExportKeyword: {
                const entries = getDeclarations(node.parent!, { module, filepath });
                entries.forEach(entry => entrySet.push(entry));
            } break;
            case ts.SyntaxKind.ExportAssignment: {
                exportExpression = (node as ts.ExportAssignment).expression;
            } break;
            case ts.SyntaxKind.BinaryExpression: {
                const node = (statement as ts.BinaryExpression);
                if (node.left.kind === ts.SyntaxKind.PropertyAccessExpression && (node.left as ts.PropertyAccessExpression).expression.kind === ts.SyntaxKind.PropertyAccessExpression) {
                    const property = node.left as ts.PropertyAccessExpression;
                    if (property.expression.getText() === 'module.exports') {
                        const name = property.name.text;
                        entrySet.push(new Entry({ name, module, filepath, cjs: true }));
                    }
                }
            } break;
        }
        if (node.kind === ts.SyntaxKind.SourceFile
            || node.kind === ts.SyntaxKind.ModuleDeclaration
            || (node.parent && node.parent.kind === ts.SyntaxKind.SourceFile)
            || (node.parent && node.parent.kind === ts.SyntaxKind.ModuleDeclaration)
            || (node.parent && node.parent.parent && node.parent.parent.kind === ts.SyntaxKind.SourceFile)
            || (node.parent && node.parent.parent && node.parent.parent.kind === ts.SyntaxKind.ModuleDeclaration)
        ) {
            ts.forEachChild(node, walk);
        }
    }

    if (exportExpression) {
        const exportText = exportExpression.getText();
        const declarations = moduleBlockDeclarations[exportText];
        if (Array.isArray(declarations)) {
            declarations.forEach(entry => {
                entry.cjs = true;
                entry.ts = true;
                entrySet.push(entry);
            });
        } else if (module) {
            entrySet.result.push(new Entry({ module, cjs: true, ts: true }));
        } else if (exportExpression.kind === ts.SyntaxKind.Identifier && exportText) {
            entrySet.result.push(new Entry({ name: exportText, module, filepath, isDefault: true }));
        }
    }

    return entrySet.result;
}
