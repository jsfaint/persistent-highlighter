import * as vscode from "vscode";
import type { HighlightedTerm } from "../types";
import { ANNOTATION_TAG_COLOR_ID, DEFAULT_ANNOTATION_TAGS } from "../constants";
import { EditorUtils } from "./editor-utils";
import {
    getAnnotationTagColorId,
    getAnnotationTagIdentity,
    isBuiltInAnnotationTagText,
    isValidAnnotationTagColorId,
    normalizeHighlightedTerm
} from "./highlight-term-utils";

type AnnotationTagState = "enabled" | "disabled" | "removed";

/**
 * 标签管理器
 * 负责管理 annotation tag 的所有相关逻辑
 * 从 HighlightManager 提取，提升模块化程度和可测试性
 */
export class AnnotationTagManager {
    /**
     * 同步 annotation tag profile
     * 接收 terms，返回更新后的 terms，不直接读写 globalState
     */
    syncProfile(terms: HighlightedTerm[], caseSensitive: boolean): HighlightedTerm[] {
        const tags = this.getConfiguredTags();
        if (tags.length === 0) {
            return terms;
        }

        const tagStates = this.getTagStates();
        const result = [...terms];
        let changed = false;

        for (const tag of tags) {
            const identity = this.isBuiltInTag(tag) ? getAnnotationTagIdentity(tag) : undefined;
            const state = identity ? tagStates[identity] : undefined;

            // Skip "removed" tags entirely
            if (state === "removed") {
                const existingIndex = this.findPreferredIndex(result, tag);
                if (existingIndex !== -1) {
                    result.splice(existingIndex, 1);
                    changed = true;
                }
                continue;
            }

            let existingIndex = this.findPreferredIndex(result, tag);

            if (existingIndex === -1) {
                result.push(this.createTagHighlight(tag, state !== "disabled"));
                changed = true;
                continue;
            }

            for (const duplicateIndex of this.findDuplicateIndexes(result, tag, existingIndex)) {
                result.splice(duplicateIndex, 1);
                if (duplicateIndex < existingIndex) {
                    existingIndex--;
                }
                changed = true;
            }

            const existing = result[existingIndex];
            const semanticColorId = this.isBuiltInTag(tag) ? getAnnotationTagColorId(tag) : undefined;
            const needsAnnotationColor = typeof semanticColorId === "number"
                ? existing.annotationColorId !== semanticColorId
                : !isValidAnnotationTagColorId(existing.annotationColorId);
            const needsTextUpgrade = this.isBuiltInTag(tag) && !EditorUtils.textEquals(existing.text, tag, false);
            const targetEnabled = state !== "disabled";
            if (existing.enabled !== targetEnabled || existing.isAnnotationTag !== true || needsAnnotationColor || needsTextUpgrade) {
                result[existingIndex] = normalizeHighlightedTerm(
                    {
                        ...existing,
                        text: needsTextUpgrade ? tag : existing.text,
                        enabled: targetEnabled,
                        isAnnotationTag: true,
                        annotationColorId: needsAnnotationColor ? semanticColorId : existing.annotationColorId
                    },
                    caseSensitive
                );
                changed = true;
            }
        }

        return changed ? result : terms;
    }

    /**
     * 切换标签状态（enabled ↔ disabled）
     */
    toggleTag(tagText: string): void {
        const identity = getAnnotationTagIdentity(tagText);
        const state = this.getTagStates()[identity];
        const current = state ?? "enabled";
        const next = current === "enabled" ? "disabled" : "enabled";
        this.setTagState(identity, next);
    }

    /**
     * 启用标签（用于 toggleHighlight 命中 disabled 标签时的恢复）
     */
    enableTag(tagText: string): void {
        this.setTagState(getAnnotationTagIdentity(tagText), "enabled");
    }

    /**
     * 获取所有标签状态
     */
    getTagStates(): Record<string, AnnotationTagState> {
        return vscode.workspace
            .getConfiguration('persistent-highlighter')
            .get<Record<string, AnnotationTagState>>('annotationTagStates', {});
    }

    /**
     * 设置标签状态
     */
    setTagState(identity: string, state: AnnotationTagState): void {
        const config = vscode.workspace.getConfiguration('persistent-highlighter');
        const current = config.get<Record<string, string>>('annotationTagStates', {});
        current[identity] = state;
        void config.update('annotationTagStates', current, vscode.ConfigurationTarget.Global);
    }

    /**
     * 获取去重后的配置标签列表（含内置标签）
     */
    getConfiguredTags(): string[] {
        const configuredTags = vscode.workspace
            .getConfiguration('persistent-highlighter')
            .get<string[]>('annotationTags', []);
        const uniqueTags = new Map<string, string>();

        for (const tag of [...DEFAULT_ANNOTATION_TAGS, ...configuredTags]) {
            const normalizedTag = typeof tag === "string" ? tag.trim() : "";
            if (normalizedTag.length === 0) {
                continue;
            }

            const key = this.isBuiltInTag(normalizedTag)
                ? `builtin:${getAnnotationTagIdentity(normalizedTag)}`
                : `custom:${normalizedTag.toLocaleLowerCase()}`;
            if (!uniqueTags.has(key)) {
                uniqueTags.set(key, normalizedTag);
            }
        }

        return [...uniqueTags.values()];
    }

    /**
     * 判断 term 和 tag 是否等价
     */
    areEquivalent(term: HighlightedTerm, tag: string): boolean {
        if (this.isBuiltInTag(tag) && this.isBuiltInTag(term.text)) {
            return getAnnotationTagIdentity(term.text) === getAnnotationTagIdentity(tag);
        }

        return EditorUtils.textEquals(term.text, tag, false);
    }

    /**
     * 查找偏好的规则索引（优先完全匹配）
     */
    findPreferredIndex(terms: HighlightedTerm[], tag: string): number {
        const equivalentIndexes = terms.reduce<number[]>((indexes, term, index) => {
            if (this.areEquivalent(term, tag)) {
                indexes.push(index);
            }
            return indexes;
        }, []);

        return equivalentIndexes.find((index) => EditorUtils.textEquals(terms[index].text, tag, false))
            ?? equivalentIndexes[0]
            ?? -1;
    }

    /**
     * 查找重复规则索引（排除偏好索引）
     */
    findDuplicateIndexes(
        terms: HighlightedTerm[],
        tag: string,
        preferredIndex: number
    ): number[] {
        return terms
            .map((term, index) => ({ term, index }))
            .filter(({ term, index }) => index !== preferredIndex && this.areEquivalent(term, tag))
            .map(({ index }) => index)
            .sort((left, right) => right - left);
    }

    /**
     * 判断文本是否为内置标签
     */
    isBuiltInTag(text: string): boolean {
        return isBuiltInAnnotationTagText(text);
    }

    /**
     * 创建标签高亮项
     */
    createTagHighlight(tag: string, enabled: boolean = true): HighlightedTerm {
        return normalizeHighlightedTerm(
            {
                text: tag,
                colorId: ANNOTATION_TAG_COLOR_ID,
                enabled,
                caseSensitive: false,
                matchMode: "wholeWord",
                scopeType: "global",
                isAnnotationTag: true
            },
            false
        );
    }
}
