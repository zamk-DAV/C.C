import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { fetchNotionData, clearNotionCache } from '../lib/notion';

// Inline interface to avoid import issues
interface NotionItem {
    id: string;
    title: string;
    date: string;
    coverImage: string | null;
    previewText: string;
    type?: string;
    sender?: string;
    isRead?: boolean;
    author?: string;
    images?: string[];
}

// interface PaginatedNotionResponse {
//     data: NotionItem[];
//     hasMore: boolean;
//     nextCursor: string | null;
// }

interface NotionContextType {
    // Diary Data
    diaryData: NotionItem[];
    hasMoreDiary: boolean;
    loadMoreDiary: () => Promise<void>;

    // Memory Data (Feed)
    memoryData: NotionItem[];
    hasMoreMemory: boolean;
    loadMoreMemory: () => Promise<void>;

    // Common
    isLoading: boolean;
    error: string | null;
    refreshData: () => Promise<void>;
    lastFetched: number | null;
}

const NotionContext = createContext<NotionContextType | undefined>(undefined);

export const NotionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { userData } = useAuth();

    // Diary State
    const [diaryData, setDiaryData] = useState<NotionItem[]>([]);
    const [hasMoreDiary, setHasMoreDiary] = useState(false);
    const [nextCursorDiary, setNextCursorDiary] = useState<string | null>(null);

    // Memory State
    const [memoryData, setMemoryData] = useState<NotionItem[]>([]);
    const [hasMoreMemory, setHasMoreMemory] = useState(false);
    const [nextCursorMemory, setNextCursorMemory] = useState<string | null>(null);

    // Common State
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastFetched, setLastFetched] = useState<number | null>(null);

    const hasInitializedRef = useRef(false);
    const isLoadingRef = useRef(false);

    const isNotionConfigured = Boolean(
        userData?.notionConfig?.apiKey &&
        userData?.notionConfig?.databaseId
    );

    useEffect(() => {
        if (hasInitializedRef.current) return;
        if (!isNotionConfigured) return;

        hasInitializedRef.current = true;
        fetchInitialData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isNotionConfigured]);

    const fetchInitialData = async () => {
        if (isLoadingRef.current) return;
        isLoadingRef.current = true;
        setIsLoading(true);
        setError(null);

        console.log('[NotionContext] Fetching initial data (Diary & Memory)...');

        try {
            const [diaryResult, memoryResult] = await Promise.all([
                fetchNotionData('Diary', undefined, 20),
                fetchNotionData('Memory', undefined, 20)
            ]);

            // Set Diary
            setDiaryData(diaryResult.data);
            setHasMoreDiary(diaryResult.hasMore);
            setNextCursorDiary(diaryResult.nextCursor);

            // Set Memory
            setMemoryData(memoryResult.data);
            setHasMoreMemory(memoryResult.hasMore);
            setNextCursorMemory(memoryResult.nextCursor);

            setLastFetched(Date.now());
            console.log(`[NotionContext] Loaded ${diaryResult.data.length} diaries, ${memoryResult.data.length} memories`);
        } catch (err: any) {
            console.error('[NotionContext] Failed to load data:', err);
            setError(err.message || 'Failed to load Notion data');
        } finally {
            setIsLoading(false);
            isLoadingRef.current = false;
        }
    };

    const loadMoreDiary = useCallback(async () => {
        if (!hasMoreDiary || !nextCursorDiary || isLoadingRef.current) return;
        isLoadingRef.current = true;

        try {
            const result = await fetchNotionData('Diary', nextCursorDiary, 20);
            setDiaryData(prev => [...prev, ...result.data]);
            setHasMoreDiary(result.hasMore);
            setNextCursorDiary(result.nextCursor);
        } catch (err: any) {
            console.error('[NotionContext] Failed to load more diary:', err);
        } finally {
            isLoadingRef.current = false;
        }
    }, [hasMoreDiary, nextCursorDiary]);

    const loadMoreMemory = useCallback(async () => {
        if (!hasMoreMemory || !nextCursorMemory || isLoadingRef.current) return;
        isLoadingRef.current = true;

        try {
            const result = await fetchNotionData('Memory', nextCursorMemory, 20);
            setMemoryData(prev => [...prev, ...result.data]);
            setHasMoreMemory(result.hasMore);
            setNextCursorMemory(result.nextCursor);
        } catch (err: any) {
            console.error('[NotionContext] Failed to load more memory:', err);
        } finally {
            isLoadingRef.current = false;
        }
    }, [hasMoreMemory, nextCursorMemory]);

    const refreshData = useCallback(async () => {
        console.log('[NotionContext] Refreshing data...');
        clearNotionCache();

        setDiaryData([]);
        setMemoryData([]);
        setNextCursorDiary(null);
        setNextCursorMemory(null);
        setHasMoreDiary(false);
        setHasMoreMemory(false);

        hasInitializedRef.current = false;
        await fetchInitialData();
    }, []);

    const value: NotionContextType = {
        diaryData,
        hasMoreDiary,
        loadMoreDiary,
        memoryData,
        hasMoreMemory,
        loadMoreMemory,
        isLoading,
        error,
        refreshData,
        lastFetched,
    };

    return (
        <NotionContext.Provider value={value}>
            {children}
        </NotionContext.Provider>
    );
};

export const useNotion = (): NotionContextType => {
    const context = useContext(NotionContext);
    if (!context) {
        throw new Error('useNotion must be used within a NotionProvider');
    }
    return context;
};

// Helper hooks
export const useDiaryData = () => {
    const { diaryData, isLoading, error, hasMoreDiary, loadMoreDiary } = useNotion();
    return { diaryData, isLoading, error, hasMore: hasMoreDiary, loadMore: loadMoreDiary };
};

export const useMemoryData = () => {
    const { memoryData, isLoading, error, hasMoreMemory, loadMoreMemory } = useNotion();
    return { memoryData, isLoading, error, hasMore: hasMoreMemory, loadMore: loadMoreMemory };
};
