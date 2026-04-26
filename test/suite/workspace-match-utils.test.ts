import * as assert from 'assert';
import * as vscode from 'vscode';
import { WorkspaceMatchUtils } from '../../src/utils/workspace-match-utils';
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
        getMockVSCodeWorkspace().findFiles = (async () => {
            findFilesCalls++;
            return [fallbackUri];
        }) as typeof vscode.workspace.findFiles;
        getMockVSCodeWorkspace().openTextDocument = (async () =>
            createMockDocument('TODO: fallback match', fallbackUri.toString())) as typeof vscode.workspace.openTextDocument;
        WorkspaceMatchUtils.setRipgrepCandidateProviderForTests(async () => ({ kind: 'fallback' }));

        const matches = await WorkspaceMatchUtils.findMatchesForTerm(createTerm('TODO:'), workspaceFolder, false);

        assert.strictEqual(findFilesCalls, 1);
        assert.strictEqual(matches.length, 1);
        assert.strictEqual(matches[0].fileName, 'src/fallback.ts');
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
