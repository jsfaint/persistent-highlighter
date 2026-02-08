/**
 * 默认缓存大小限制
 * 对于大型项目,可以通过配置调整此值
 */
const DEFAULT_CACHE_SIZE = 100;

/**
 * 正则表达式缓存管理器
 * 避免重复创建相同的正则表达式对象，提高性能
 *
 * @remarks
 * 使用 FIFO (First In First Out) 策略管理缓存:
 * - 当缓存达到上限时,删除最早添加的条目
 * - 默认缓存大小为 100,适用于大多数场景
 * - 对于包含大量独特搜索词的项目,可能需要增加此值
 */
export class RegexCache {
    private static instance: RegexCache;
    private cache = new Map<string, RegExp>();
    private readonly maxCacheSize: number;

    /**
     * 创建缓存实例
     * @param cacheSize 最大缓存条目数,默认为 100
     */
    private constructor(cacheSize: number = DEFAULT_CACHE_SIZE) {
        this.maxCacheSize = cacheSize;
    }

    /**
     * 获取单例实例
     * @param cacheSize 可选的缓存大小,仅在首次创建时生效
     * @returns RegexCache 单例实例
     */
    public static getInstance(cacheSize?: number): RegexCache {
        if (!RegexCache.instance) {
            RegexCache.instance = new RegexCache(cacheSize);
        }
        return RegexCache.instance;
    }

    /**
     * 生成缓存键
     * @param searchText 搜索文本
     * @param caseSensitive 是否大小写敏感
     * @returns 唯一的缓存键字符串
     */
    private createKey(searchText: string, caseSensitive: boolean): string {
        return `${caseSensitive ? 's' : 'i'}:${searchText}`;
    }

    /**
     * 获取或创建正则表达式
     * @param searchText 要搜索的文本
     * @param caseSensitive 是否大小写敏感
     * @returns 正则表达式对象,会重置 lastIndex 以便重复使用
     */
    public getRegex(searchText: string, caseSensitive: boolean): RegExp {
        const key = this.createKey(searchText, caseSensitive);

        let regex = this.cache.get(key);
        if (regex) {
            // 重置 lastIndex 以便重复使用
            regex.lastIndex = 0;
            return regex;
        }

        // 创建新的正则表达式
        regex = createHighlightRegex(searchText, caseSensitive);

        // 缓存管理：如果超出限制，清除最旧的条目
        if (this.cache.size >= this.maxCacheSize) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey !== undefined) {
                this.cache.delete(firstKey);
            }
        }

        this.cache.set(key, regex);
        return regex;
    }

    /**
     * 清除缓存
     */
    public clear(): void {
        this.cache.clear();
    }

    /**
     * 获取当前缓存大小
     */
    public get size(): number {
        return this.cache.size;
    }
}

/**
 * 创建支持中英文的正则表达式
 * @throws {Error} 当 searchText 为空时抛出
 */
export function createHighlightRegex(searchText: string, caseSensitive: boolean = false): RegExp {
    // 验证输入不为空
    if (!searchText || searchText.length === 0) {
        throw new Error('Search text cannot be empty');
    }

    const escapedText = escapeRegex(searchText);
    const flags = caseSensitive ? 'g' : 'gi';

    // 检查是否只包含英文单词字符（字母、数字、下划线）
    const isPureWord = /^[a-zA-Z0-9_]+$/.test(searchText);

    if (isPureWord) {
        // 对于纯英文单词，使用标准的 \b 边界（严格全字匹配）
        return new RegExp(String.raw`\b${escapedText}\b`, flags);
    } else {
        // 对于包含特殊字符或非英文字符的文本，直接匹配不使用边界
        // 因为中文等语言没有空格分隔单词的概念
        return new RegExp(escapedText, flags);
    }
}

/**
 * 转义正则表达式特殊字符
 */
function escapeRegex(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 全字匹配搜索函数 - 支持英文和非英文文本
 * @returns 匹配位置的索引，未找到返回 -1
 */
export function findWholeWord(text: string, searchText: string, caseSensitive: boolean = false): number {
    if (!searchText || !text) {
        return -1;
    }

    try {
        const regex = RegexCache.getInstance().getRegex(searchText, caseSensitive);
        const match = regex.exec(text);
        return match ? match.index : -1;
    } catch (error) {
        console.warn(`Error finding whole word: ${error}`);
        return -1;
    }
}
