import * as path from "path";
import { spawn } from "child_process";
import * as vscode from "vscode";
import {
    WORKSPACE_MATCH_EXCLUDE,
    WORKSPACE_MATCH_FILE_LIMIT,
    WORKSPACE_MATCH_RESULT_LIMIT
} from "../constants";
import type { HighlightMatchLocation, HighlightedTerm } from "../types";
import { doesHighlightApplyToDocument } from "./highlight-term-utils";
import { EditorUtils } from "./editor-utils";

const RIPGREP_TIMEOUT_MS = 5000;
const RIPGREP_EXCLUDE_GLOBS = [
    "!**/node_modules/**",
    "!**/.git/**",
    "!**/out/**",
    "!**/dist/**",
    "!**/build/**"
];

export type RipgrepCandidateResult =
    | { readonly kind: "success"; readonly uris: vscode.Uri[] }
    | { readonly kind: "fallback" };

export type RipgrepCandidateProvider = (
    term: HighlightedTerm,
    workspaceFolder: vscode.WorkspaceFolder,
    defaultCaseSensitive: boolean
) => Promise<RipgrepCandidateResult>;

export class WorkspaceMatchUtils {
    private static ripgrepCandidateProvider: RipgrepCandidateProvider | undefined;

    public static setRipgrepCandidateProviderForTests(provider: RipgrepCandidateProvider | undefined): void {
        this.ripgrepCandidateProvider = provider;
    }

    public static getCurrentWorkspaceFolder(editor?: vscode.TextEditor): vscode.WorkspaceFolder | undefined {
        if (editor) {
            return vscode.workspace.getWorkspaceFolder(editor.document.uri);
        }

        return vscode.workspace.workspaceFolders?.at(0);
    }

    public static async findMatchesForTerm(
        term: HighlightedTerm,
        workspaceFolder: vscode.WorkspaceFolder,
        defaultCaseSensitive: boolean
    ): Promise<HighlightMatchLocation[]> {
        if (!term.text || term.enabled === false) {
            return [];
        }

        const candidateFiles = await this.findCandidateFiles(term, workspaceFolder, defaultCaseSensitive);
        return this.findMatchesInFiles(term, workspaceFolder, defaultCaseSensitive, candidateFiles);
    }

    private static async findCandidateFiles(
        term: HighlightedTerm,
        workspaceFolder: vscode.WorkspaceFolder,
        defaultCaseSensitive: boolean
    ): Promise<vscode.Uri[]> {
        const ripgrepResult = await this.findCandidateFilesWithRipgrep(term, workspaceFolder, defaultCaseSensitive);
        if (ripgrepResult.kind === "success") {
            return ripgrepResult.uris;
        }

        return vscode.workspace.findFiles(
            new vscode.RelativePattern(workspaceFolder, "**/*"),
            WORKSPACE_MATCH_EXCLUDE,
            WORKSPACE_MATCH_FILE_LIMIT
        );
    }

    private static async findMatchesInFiles(
        term: HighlightedTerm,
        workspaceFolder: vscode.WorkspaceFolder,
        defaultCaseSensitive: boolean,
        files: vscode.Uri[]
    ): Promise<HighlightMatchLocation[]> {
        const matches: HighlightMatchLocation[] = [];

        for (const uri of files) {
            if (matches.length >= WORKSPACE_MATCH_RESULT_LIMIT) {
                break;
            }

            try {
                const document = await vscode.workspace.openTextDocument(uri);
                if (!doesHighlightApplyToDocument(term, document)) {
                    continue;
                }

                const ranges = EditorUtils.findHighlightRanges(document, term, defaultCaseSensitive);
                for (const range of ranges) {
                    if (matches.length >= WORKSPACE_MATCH_RESULT_LIMIT) {
                        break;
                    }

                    matches.push(this.createMatchLocation(term, document, workspaceFolder, range));
                }
            } catch (error) {
                console.warn(`Skipping workspace match scan for ${uri.toString()}:`, error);
            }
        }

        return matches;
    }

    private static async findCandidateFilesWithRipgrep(
        term: HighlightedTerm,
        workspaceFolder: vscode.WorkspaceFolder,
        defaultCaseSensitive: boolean
    ): Promise<RipgrepCandidateResult> {
        if (workspaceFolder.uri.scheme !== "file" || term.matchMode === "regex") {
            return { kind: "fallback" };
        }

        if (this.ripgrepCandidateProvider) {
            return this.ripgrepCandidateProvider(term, workspaceFolder, defaultCaseSensitive);
        }

        return this.runRipgrepCandidateSearch(term, workspaceFolder, defaultCaseSensitive);
    }

    private static runRipgrepCandidateSearch(
        term: HighlightedTerm,
        workspaceFolder: vscode.WorkspaceFolder,
        defaultCaseSensitive: boolean
    ): Promise<RipgrepCandidateResult> {
        const caseSensitive = term.caseSensitive ?? defaultCaseSensitive;
        const args = [
            "--files-with-matches",
            "--fixed-strings",
            "--color",
            "never",
            "--glob",
            RIPGREP_EXCLUDE_GLOBS[0],
            "--glob",
            RIPGREP_EXCLUDE_GLOBS[1],
            "--glob",
            RIPGREP_EXCLUDE_GLOBS[2],
            "--glob",
            RIPGREP_EXCLUDE_GLOBS[3],
            "--glob",
            RIPGREP_EXCLUDE_GLOBS[4]
        ];

        if (!caseSensitive) {
            args.push("--ignore-case");
        }

        args.push("--", term.text, ".");

        return new Promise((resolve) => {
            const child = spawn("rg", args, {
                cwd: workspaceFolder.uri.fsPath,
                shell: false,
                windowsHide: true
            });
            let stdout = "";
            let settled = false;
            const timer = setTimeout(() => {
                settled = true;
                child.kill();
                resolve({ kind: "fallback" });
            }, RIPGREP_TIMEOUT_MS);

            child.stdout.setEncoding("utf8");
            child.stdout.on("data", (chunk: string) => {
                stdout += chunk;
            });
            child.on("error", () => {
                if (!settled) {
                    settled = true;
                    clearTimeout(timer);
                    resolve({ kind: "fallback" });
                }
            });
            child.on("close", (code) => {
                if (settled) {
                    return;
                }

                settled = true;
                clearTimeout(timer);
                if (code === 1) {
                    resolve({ kind: "success", uris: [] });
                    return;
                }

                if (code !== 0) {
                    resolve({ kind: "fallback" });
                    return;
                }

                resolve({ kind: "success", uris: this.parseRipgrepFiles(stdout, workspaceFolder) });
            });
        });
    }

    private static parseRipgrepFiles(stdout: string, workspaceFolder: vscode.WorkspaceFolder): vscode.Uri[] {
        const seen = new Set<string>();
        const uris: vscode.Uri[] = [];

        for (const line of stdout.split(/\r?\n/)) {
            if (!line) {
                continue;
            }

            const absolutePath = path.resolve(workspaceFolder.uri.fsPath, line);
            if (seen.has(absolutePath)) {
                continue;
            }

            seen.add(absolutePath);
            uris.push(vscode.Uri.file(absolutePath));
            if (uris.length >= WORKSPACE_MATCH_FILE_LIMIT) {
                break;
            }
        }

        return uris;
    }

    public static createMatchLocation(
        term: HighlightedTerm,
        document: vscode.TextDocument,
        workspaceFolder: vscode.WorkspaceFolder,
        range: vscode.Range
    ): HighlightMatchLocation {
        const relativePath = path.relative(workspaceFolder.uri.fsPath, document.uri.fsPath) || document.uri.fsPath;
        const line = document.lineAt(range.start.line);

        return {
            ruleId: term.id ?? term.text,
            text: term.text,
            uri: document.uri.toString(),
            fileName: relativePath,
            line: range.start.line + 1,
            character: range.start.character + 1,
            preview: line.text.trim(),
            range: {
                startLine: range.start.line,
                startCharacter: range.start.character,
                endLine: range.end.line,
                endCharacter: range.end.character
            }
        };
    }
}
