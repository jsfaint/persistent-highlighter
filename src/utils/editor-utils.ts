import * as vscode from "vscode";
import type { HighlightedTerm, HighlightPosition } from "../types";
import { RegexCache } from "./regex-cache";

/**
 * 编辑器工具类
 * 提供与编辑器相关的通用功能
 */
export class EditorUtils {
    /**
     * 验证活动编辑器
     * @returns 有效的编辑器实例或 null
     */
    public static validateActiveEditor(): vscode.TextEditor | null {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage("No active editor found.");
            return null;
        }

        if (!editor.document) {
            vscode.window.showWarningMessage("No document found in active editor.");
            return null;
        }

        return editor;
    }

    /**
     * 获取选中的文本或光标下的单词
     */
    public static getSelectedText(editor: vscode.TextEditor): string | undefined {
        const selection = editor.selection;

        if (!selection.isEmpty) {
            return editor.document.getText(selection);
        }

        const wordRange = editor.document.getWordRangeAtPosition(selection.active);
        if (wordRange) {
            return editor.document.getText(wordRange);
        }

        return undefined;
    }

    /**
     * 选中并滚动到指定范围
     */
    public static selectAndRevealRange(editor: vscode.TextEditor, range: vscode.Range): void {
        editor.selection = new vscode.Selection(range.start, range.end);
        editor.revealRange(range, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
    }

    /**
     * Unicode感知的文本比较
     */
    public static textEquals(a: string, b: string, caseSensitive: boolean): boolean {
        if (caseSensitive) {
            return a === b;
        }
        // 使用 localeCompare 进行Unicode感知的大小写不敏感比较
        return a.localeCompare(b, undefined, { sensitivity: 'accent' }) === 0;
    }

    /**
     * 在文本中查找高亮词的所有位置
     */
    public static findHighlightRanges(
        document: vscode.TextDocument,
        term: HighlightedTerm,
        caseSensitive: boolean
    ): vscode.Range[] {
        const text = document.getText();
        const ranges: vscode.Range[] = [];

        try {
            const regex = RegexCache.getInstance().getRegex(term.text, caseSensitive);
            let match: RegExpExecArray | null;
            let matchCount = 0;
            const maxMatches = Math.min(text.length, 10000); // 安全上限

            while ((match = regex.exec(text)) !== null) {
                matchCount++;

                // 安全检查：防止无限循环
                if (matchCount > maxMatches) {
                    console.warn(`Max matches reached for term: ${term.text}`);
                    break;
                }

                const startPos = document.positionAt(match.index);
                const endPos = document.positionAt(match.index + match[0].length);
                ranges.push(new vscode.Range(startPos, endPos));

                // 防止无限循环：处理 zero-length match
                if (match.index === regex.lastIndex) {
                    regex.lastIndex++;
                    if (regex.lastIndex > text.length) {
                        break;
                    }
                }
            }
        } catch (error) {
            console.error(`Error finding highlights for term "${term.text}":`, error);
        }

        return ranges;
    }

    /**
     * 查找编辑器中所有的高亮位置
     */
    public static findAllHighlightsInEditor(
        editor: vscode.TextEditor,
        terms: HighlightedTerm[],
        caseSensitive: boolean
    ): HighlightPosition[] {
        const allHighlights: HighlightPosition[] = [];
        const document = editor.document;
        const textContent = document.getText();

        for (const term of terms) {
            if (!term.text) {
                continue;
            }

            try {
                const regex = RegexCache.getInstance().getRegex(term.text, caseSensitive);
                let match: RegExpExecArray | null;
                let matchCount = 0;
                const maxMatches = Math.min(textContent.length, 10000);

                while ((match = regex.exec(textContent)) !== null) {
                    matchCount++;

                    if (matchCount > maxMatches) {
                        console.warn(`Max matches reached for term: ${term.text}`);
                        break;
                    }

                    const startPos = document.positionAt(match.index);
                    const endPos = document.positionAt(match.index + match[0].length);

                    allHighlights.push({
                        text: term.text,
                        index: match.index,
                        range: new vscode.Range(startPos, endPos)
                    });

                    // 防止无限循环
                    if (match.index === regex.lastIndex) {
                        regex.lastIndex++;
                        if (regex.lastIndex > textContent.length) {
                            break;
                        }
                    }
                }
            } catch (error) {
                console.error(`Error processing term "${term.text}":`, error);
            }
        }

        return allHighlights;
    }

    /**
     * 查找指定位置的所有高亮
     */
    public static findHighlightsAtPosition(
        editor: vscode.TextEditor,
        position: vscode.Position,
        terms: HighlightedTerm[],
        caseSensitive: boolean
    ): string[] {
        if (terms.length === 0) {
            return [];
        }

        const document = editor.document;
        const text = document.getText();
        const offset = document.offsetAt(position);
        const highlightedTexts: string[] = [];

        for (const term of terms) {
            if (!term.text) {
                continue;
            }

            try {
                const regex = RegexCache.getInstance().getRegex(term.text, caseSensitive);
                let match: RegExpExecArray | null;
                let matchCount = 0;
                const maxMatches = Math.min(text.length, 10000);

                while ((match = regex.exec(text)) !== null) {
                    matchCount++;

                    if (matchCount > maxMatches) {
                        console.warn(`Max matches reached for term: ${term.text}`);
                        break;
                    }

                    const matchStart = match.index;
                    const matchEnd = matchStart + match[0].length;

                    // 检查光标位置是否在这个高亮范围内
                    if (offset >= matchStart && offset <= matchEnd) {
                        highlightedTexts.push(term.text);
                        break;
                    }

                    // 防止无限循环
                    if (match.index === regex.lastIndex) {
                        regex.lastIndex++;
                        if (regex.lastIndex > text.length) {
                            break;
                        }
                    }
                }
            } catch (error) {
                console.error(`Error finding highlight at position for term "${term.text}":`, error);
            }
        }

        return highlightedTexts;
    }

    /**
     * 检查词项是否在文件中存在
     */
    public static isTermInFile(
        term: HighlightedTerm,
        fileContent: string,
        caseSensitive: boolean
    ): boolean {
        if (!term.text || typeof term.text !== 'string') {
            return false;
        }

        try {
            if (caseSensitive) {
                return fileContent.includes(term.text);
            }
            return fileContent.toLowerCase().includes(term.text.toLowerCase());
        } catch {
            return false;
        }
    }
}
