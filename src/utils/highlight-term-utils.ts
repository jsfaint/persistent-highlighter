import * as vscode from "vscode";
import type {
    HighlightMatchMode,
    HighlightScopeType,
    HighlightedTerm
} from "../types";

const DEFAULT_MATCH_MODE: HighlightMatchMode = "wholeWord";
const DEFAULT_SCOPE_TYPE: HighlightScopeType = "global";

function createHighlightId(text: string): string {
    return `highlight:${encodeURIComponent(text.toLowerCase())}`;
}

function isHighlightMatchMode(value: unknown): value is HighlightMatchMode {
    return value === "wholeWord" || value === "substring" || value === "regex";
}

function isHighlightScopeType(value: unknown): value is HighlightScopeType {
    return value === "global" || value === "workspace" || value === "file" || value === "language";
}

function isBooleanOrUndefined(value: unknown): value is boolean | undefined {
    return typeof value === "boolean" || typeof value === "undefined";
}

export function getHighlightCaseSensitive(term: HighlightedTerm, defaultCaseSensitive: boolean): boolean {
    return typeof term.caseSensitive === "boolean" ? term.caseSensitive : defaultCaseSensitive;
}

export function normalizeHighlightedTerm(term: HighlightedTerm, defaultCaseSensitive: boolean): HighlightedTerm {
    const trimmedText = typeof term.text === "string" ? term.text.trim() : "";
    const normalizedScopeType = isHighlightScopeType(term.scopeType) ? term.scopeType : DEFAULT_SCOPE_TYPE;
    const normalizedScopeValue = typeof term.scopeValue === "string" && term.scopeValue.length > 0
        ? term.scopeValue
        : undefined;

    return {
        ...term,
        id: typeof term.id === "string" && term.id.length > 0 ? term.id : createHighlightId(trimmedText),
        text: trimmedText,
        enabled: term.enabled ?? true,
        caseSensitive: getHighlightCaseSensitive(term, defaultCaseSensitive),
        matchMode: isHighlightMatchMode(term.matchMode) ? term.matchMode : DEFAULT_MATCH_MODE,
        scopeType: normalizedScopeType,
        scopeValue: normalizedScopeType === "global" ? undefined : normalizedScopeValue,
        isAnnotationTag: isBooleanOrUndefined(term.isAnnotationTag) ? term.isAnnotationTag : undefined
    };
}

export function normalizeHighlightedTerms(terms: HighlightedTerm[], defaultCaseSensitive: boolean): HighlightedTerm[] {
    return terms
        .map((term) => normalizeHighlightedTerm(term, defaultCaseSensitive))
        .filter((term) => term.text.length > 0);
}

export function highlightedTermsNeedMigration(
    rawTerms: HighlightedTerm[],
    defaultCaseSensitive: boolean
): boolean {
    const normalizedTerms = normalizeHighlightedTerms(rawTerms, defaultCaseSensitive);
    return JSON.stringify(rawTerms) !== JSON.stringify(normalizedTerms);
}

export function doesHighlightApplyToDocument(term: HighlightedTerm, document: vscode.TextDocument): boolean {
    switch (term.scopeType) {
        case "workspace": {
            const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
            return workspaceFolder?.uri.toString() === term.scopeValue;
        }
        case "file":
            return document.uri.toString() === term.scopeValue;
        case "language":
            return document.languageId === term.scopeValue;
        case "global":
        default:
            return true;
    }
}

export function getHighlightScopeLabel(term: HighlightedTerm): string {
    switch (term.scopeType) {
        case "workspace":
            return "Workspace";
        case "file":
            return "File";
        case "language":
            return "Language";
        case "global":
        default:
            return "Global";
    }
}

export function getHighlightMatchModeLabel(term: HighlightedTerm): string {
    switch (term.matchMode) {
        case "substring":
            return "Substring";
        case "regex":
            return "Regex";
        case "wholeWord":
        default:
            return "Whole Word";
    }
}
