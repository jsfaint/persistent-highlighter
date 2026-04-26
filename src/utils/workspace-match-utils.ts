import * as path from "path";
import * as vscode from "vscode";
import {
    WORKSPACE_MATCH_EXCLUDE,
    WORKSPACE_MATCH_FILE_LIMIT,
    WORKSPACE_MATCH_RESULT_LIMIT
} from "../constants";
import type { HighlightMatchLocation, HighlightedTerm } from "../types";
import { doesHighlightApplyToDocument } from "./highlight-term-utils";
import { EditorUtils } from "./editor-utils";

export class WorkspaceMatchUtils {
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

        const files = await vscode.workspace.findFiles(
            new vscode.RelativePattern(workspaceFolder, "**/*"),
            WORKSPACE_MATCH_EXCLUDE,
            WORKSPACE_MATCH_FILE_LIMIT
        );
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
