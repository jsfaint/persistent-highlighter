import * as assert from 'assert';
import * as vscode from 'vscode';
import { WorkspaceMatchUtils } from '../../src/utils/workspace-match-utils';
import { WORKSPACE_MATCH_EXCLUDE } from '../../src/constants';
import { createMockDocument, getMockVSCodeWorkspace, setupVSCodeMocks } from './helpers';
import type { HighlightedTerm } from '../../src/types';

suite('WorkspaceMatchUtils tests', () => {
    let workspaceFolder: vscode.WorkspaceFolder;

    setup(() => {
        setupVSCodeMocks();
        workspaceFolder = getMockVSCodeWorkspace().workspaceFolders?.[0] as vscode.WorkspaceFolder;
    });

    teardown(() => {
        WorkspaceMatchUtils.setRipgrepCandidateProviderForTests(undefined);
    });

    test('uses a flat VS Code exclude glob for binary and non-editable files', () => {
        assert.strictEqual((WORKSPACE_MATCH_EXCLUDE.match(/{/g) ?? []).length, 1);
        assert.strictEqual((WORKSPACE_MATCH_EXCLUDE.match(/}/g) ?? []).length, 1);

        const excludeEntries = WORKSPACE_MATCH_EXCLUDE.slice(1, -1).split(',');
        assert.ok(excludeEntries.includes('**/*.pdf'));
        assert.ok(excludeEntries.includes('**/*.xlsx'));
        assert.ok(excludeEntries.includes('**/*.svgz'));
        assert.ok(!excludeEntries.includes('**/*.svg'));
    });

    test('uses rg candidates for non-regex terms and opens only candidate files', async () => {
        const candidateUri = vscode.Uri.parse('file:///mock/src/candidate.ts');
        let findFilesCalls = 0;
        let openTextDocumentCalls = 0;
        getMockVSCodeWorkspace().findFiles = (async () => {
            findFilesCalls++;
            return [vscode.Uri.parse('file:///mock/src/other.ts')];
        }) as typeof vscode.workspace.findFiles;
        getMockVSCodeWorkspace().openTextDocument = (async (uri: vscode.Uri) => {
            openTextDocumentCalls++;
            assert.strictEqual(uri.toString(), candidateUri.toString());
            return createMockDocument('TODO: first\nnot relevant\nTODO: second', candidateUri.toString());
        }) as unknown as typeof vscode.workspace.openTextDocument;
        WorkspaceMatchUtils.setRipgrepCandidateProviderForTests(async () => ({
            kind: 'success',
            uris: [candidateUri]
        }));

        const matches = await WorkspaceMatchUtils.findMatchesForTerm(createTerm('TODO:'), workspaceFolder, false);

        assert.strictEqual(findFilesCalls, 0);
        assert.strictEqual(openTextDocumentCalls, 1);
        assert.strictEqual(matches.length, 2);
        assert.strictEqual(matches[0].fileName, 'src/candidate.ts');
    });

    test('matches built-in annotation tags case-sensitively when default is insensitive', async () => {
        const candidateUri = vscode.Uri.parse('file:///mock/src/candidate.ts');
        getMockVSCodeWorkspace().openTextDocument = (async () =>
            createMockDocument('todo: lower\nTODO: upper', candidateUri.toString())) as typeof vscode.workspace.openTextDocument;
        WorkspaceMatchUtils.setRipgrepCandidateProviderForTests(async () => ({
            kind: 'success',
            uris: [candidateUri]
        }));

        const matches = await WorkspaceMatchUtils.findMatchesForTerm(
            { ...createTerm('TODO:'), isAnnotationTag: true, caseSensitive: false },
            workspaceFolder,
            false
        );

        assert.strictEqual(matches.length, 1);
        assert.strictEqual(matches[0].preview, 'TODO: upper');
    });

    test('forces built-in annotation tags to whole-word workspace matching before migration', async () => {
        const candidateUri = vscode.Uri.parse('file:///mock/src/candidate.ts');
        let rgProviderCalls = 0;
        getMockVSCodeWorkspace().openTextDocument = (async () =>
            createMockDocument('TODOGRAPH prefix\nTODO exact', candidateUri.toString())) as typeof vscode.workspace.openTextDocument;
        WorkspaceMatchUtils.setRipgrepCandidateProviderForTests(async () => {
            rgProviderCalls++;
            return {
                kind: 'success',
                uris: [candidateUri]
            };
        });

        const matches = await WorkspaceMatchUtils.findMatchesForTerm(
            { ...createTerm('TODO'), isAnnotationTag: true, caseSensitive: false, matchMode: 'substring' },
            workspaceFolder,
            false
        );

        assert.strictEqual(rgProviderCalls, 1);
        assert.strictEqual(matches.length, 1);
        assert.strictEqual(matches[0].preview, 'TODO exact');
    });

    test('uses rg candidates for built-in annotation tags stored with regex mode before migration', async () => {
        const candidateUri = vscode.Uri.parse('file:///mock/src/candidate.ts');
        let findFilesCalls = 0;
        let rgProviderCalls = 0;
        getMockVSCodeWorkspace().findFiles = (async () => {
            findFilesCalls++;
            return [];
        }) as typeof vscode.workspace.findFiles;
        getMockVSCodeWorkspace().openTextDocument = (async () =>
            createMockDocument('TODO: exact', candidateUri.toString())) as typeof vscode.workspace.openTextDocument;
        WorkspaceMatchUtils.setRipgrepCandidateProviderForTests(async () => {
            rgProviderCalls++;
            return {
                kind: 'success',
                uris: [candidateUri]
            };
        });

        const matches = await WorkspaceMatchUtils.findMatchesForTerm(
            { ...createTerm('TODO:'), isAnnotationTag: true, caseSensitive: false, matchMode: 'regex' },
            workspaceFolder,
            false
        );

        assert.strictEqual(rgProviderCalls, 1);
        assert.strictEqual(findFilesCalls, 0);
        assert.strictEqual(matches.length, 1);
    });

    test('skips excluded rg candidate files before opening documents', async () => {
        const candidateUri = vscode.Uri.parse('file:///mock/src/candidate.ts');
        const pdfUri = vscode.Uri.parse('file:///mock/docs/manual.pdf');
        const openedUris: string[] = [];
        getMockVSCodeWorkspace().openTextDocument = (async (uri: vscode.Uri) => {
            openedUris.push(uri.toString());
            return createMockDocument('TODO: candidate', uri.toString());
        }) as unknown as typeof vscode.workspace.openTextDocument;
        WorkspaceMatchUtils.setRipgrepCandidateProviderForTests(async () => ({
            kind: 'success',
            uris: [candidateUri, pdfUri]
        }));

        const matches = await WorkspaceMatchUtils.findMatchesForTerm(createTerm('TODO:'), workspaceFolder, false);

        assert.deepStrictEqual(openedUris, [candidateUri.toString()]);
        assert.strictEqual(matches.length, 1);
        assert.strictEqual(matches[0].fileName, 'src/candidate.ts');
    });

    test('treats rg no-match result as empty candidates without fallback', async () => {
        let findFilesCalls = 0;
        let openTextDocumentCalls = 0;
        getMockVSCodeWorkspace().findFiles = (async () => {
            findFilesCalls++;
            return [vscode.Uri.parse('file:///mock/src/fallback.ts')];
        }) as typeof vscode.workspace.findFiles;
        getMockVSCodeWorkspace().openTextDocument = (async () => {
            openTextDocumentCalls++;
            return createMockDocument('TODO:', 'file:///mock/src/fallback.ts');
        }) as typeof vscode.workspace.openTextDocument;
        WorkspaceMatchUtils.setRipgrepCandidateProviderForTests(async () => ({
            kind: 'success',
            uris: []
        }));

        const matches = await WorkspaceMatchUtils.findMatchesForTerm(createTerm('TODO:'), workspaceFolder, false);

        assert.strictEqual(matches.length, 0);
        assert.strictEqual(findFilesCalls, 0);
        assert.strictEqual(openTextDocumentCalls, 0);
    });

    test('falls back to VS Code file scan when rg is unavailable or fails', async () => {
        const fallbackUri = vscode.Uri.parse('file:///mock/src/fallback.ts');
        let findFilesCalls = 0;
        let excludePattern: vscode.GlobPattern | null | undefined;
        getMockVSCodeWorkspace().findFiles = (async (_, exclude) => {
            findFilesCalls++;
            excludePattern = exclude;
            return [fallbackUri];
        }) as typeof vscode.workspace.findFiles;
        getMockVSCodeWorkspace().openTextDocument = (async () =>
            createMockDocument('TODO: fallback match', fallbackUri.toString())) as typeof vscode.workspace.openTextDocument;
        WorkspaceMatchUtils.setRipgrepCandidateProviderForTests(async () => ({ kind: 'fallback' }));

        const matches = await WorkspaceMatchUtils.findMatchesForTerm(createTerm('TODO:'), workspaceFolder, false);

        assert.strictEqual(findFilesCalls, 1);
        assert.strictEqual(excludePattern, WORKSPACE_MATCH_EXCLUDE);
        assert.strictEqual(matches.length, 1);
        assert.strictEqual(matches[0].fileName, 'src/fallback.ts');
    });

    test('skips excluded fallback files before opening documents', async () => {
        const textUri = vscode.Uri.parse('file:///mock/notes.txt');
        const sheetUri = vscode.Uri.parse('file:///mock/reports/sheet.xlsx');
        const openedUris: string[] = [];
        getMockVSCodeWorkspace().findFiles = (async () => [textUri, sheetUri]) as typeof vscode.workspace.findFiles;
        getMockVSCodeWorkspace().openTextDocument = (async (uri: vscode.Uri) => {
            openedUris.push(uri.toString());
            return createMockDocument('TODO: fallback match', uri.toString());
        }) as unknown as typeof vscode.workspace.openTextDocument;
        WorkspaceMatchUtils.setRipgrepCandidateProviderForTests(async () => ({ kind: 'fallback' }));

        const matches = await WorkspaceMatchUtils.findMatchesForTerm(createTerm('TODO:'), workspaceFolder, false);

        assert.deepStrictEqual(openedUris, [textUri.toString()]);
        assert.strictEqual(matches.length, 1);
        assert.strictEqual(matches[0].fileName, 'notes.txt');
    });

    test('keeps svg searchable while skipping svgz files', async () => {
        const svgUri = vscode.Uri.parse('file:///mock/assets/icon.svg');
        const svgzUri = vscode.Uri.parse('file:///mock/assets/icon.svgz');
        const openedUris: string[] = [];
        getMockVSCodeWorkspace().openTextDocument = (async (uri: vscode.Uri) => {
            openedUris.push(uri.toString());
            return createMockDocument('TODO: vector asset', uri.toString());
        }) as unknown as typeof vscode.workspace.openTextDocument;
        WorkspaceMatchUtils.setRipgrepCandidateProviderForTests(async () => ({
            kind: 'success',
            uris: [svgUri, svgzUri]
        }));

        const matches = await WorkspaceMatchUtils.findMatchesForTerm(createTerm('TODO:'), workspaceFolder, false);

        assert.deepStrictEqual(openedUris, [svgUri.toString()]);
        assert.strictEqual(matches.length, 1);
        assert.strictEqual(matches[0].fileName, 'assets/icon.svg');
    });

    test('keeps regex terms on the VS Code scan path', async () => {
        const fallbackUri = vscode.Uri.parse('file:///mock/src/regex.ts');
        let findFilesCalls = 0;
        let rgProviderCalls = 0;
        getMockVSCodeWorkspace().findFiles = (async () => {
            findFilesCalls++;
            return [fallbackUri];
        }) as typeof vscode.workspace.findFiles;
        getMockVSCodeWorkspace().openTextDocument = (async () =>
            createMockDocument('TODO: regex match', fallbackUri.toString())) as typeof vscode.workspace.openTextDocument;
        WorkspaceMatchUtils.setRipgrepCandidateProviderForTests(async () => {
            rgProviderCalls++;
            return { kind: 'success', uris: [] };
        });

        const matches = await WorkspaceMatchUtils.findMatchesForTerm(
            { ...createTerm('TODO:.*match'), matchMode: 'regex' },
            workspaceFolder,
            false
        );

        assert.strictEqual(rgProviderCalls, 0);
        assert.strictEqual(findFilesCalls, 1);
        assert.strictEqual(matches.length, 1);
    });
});

function createTerm(text: string): HighlightedTerm {
    return {
        id: `highlight:${text}`,
        text,
        colorId: 0,
        enabled: true,
        caseSensitive: false,
        matchMode: 'wholeWord',
        scopeType: 'global'
    };
}
