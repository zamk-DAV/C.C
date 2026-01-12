import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { fetchNotionData, clearNotionCache, type NotionItem, type PaginatedNotionResponse } from '../lib/notion';

interface NotionContextType {
    // Data
    diaryData: NotionItem[];
    isLoading: boolean;
    error: string | null;

    // Pagination
    hasMore: boolean;
    nextCursor: string | null;

    // Actions
    loadMore: () => Promise<void>;
    refreshData: () => Promise<void>;

    // Metadata
    lastFetched: number | null;
}

const NotionContext = createContext<NotionContextType | undefined>(undefined);

export const NotionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { userData } = useAuth();

    // State
    const [diaryData, setDiaryData] = useState<NotionItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(false);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [lastFetched, setLastFetched] = useState<number | null>(null);

    // Ref guard to prevent duplicate initial loads
    const hasInitializedRef = useRef(false);
    const isLoadingRef = useRef(false);

    // Check if Notion is configured
    const isNotionConfigured = Boolean(
        userData?.notionConfig?.apiKey &&
        userData?.notionConfig?.databaseId
    );

    // Initial data fetch - ONCE per session
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

        console.log('[NotionContext] Fetching initial data...');

        try {
            // Single API call for all diary data
            const result: PaginatedNotionResponse = await fetchNotionData('Diary', undefined, 20);

            setDiaryData(result.data);
            setHasMore(result.hasMore);
            setNextCursor(result.nextCursor);
            setLastFetched(Date.now());

            console.log(`[NotionContext] Loaded ${result.data.length} diary items`);
        } catch (err: any) {
            console.error('[NotionContext] Failed to load data:', err);
            setError(err.message || 'Failed to load Notion data');
        } finally {
            setIsLoading(false);
            isLoadingRef.current = false;
        }
    };

    // Load more data (pagination)
    const loadMore = useCallback(async () => {
        if (!hasMore || !nextCursor || isLoadingRef.current) return;

        isLoadingRef.current = true;
        setIsLoading(true);

        console.log('[NotionContext] Loading more data...');

        try {
            const result = await fetchNotionData('Diary', nextCursor, 20);

            setDiaryData(prev => [...prev, ...result.data]);
            setHasMore(result.hasMore);
            setNextCursor(result.nextCursor);

            console.log(`[NotionContext] Loaded ${result.data.length} more items`);
        } catch (err: any) {
            console.error('[NotionContext] Failed to load more:', err);
            setError(err.message);
        } finally {
            setIsLoading(false);
            isLoadingRef.current = false;
        }
    }, [hasMore, nextCursor]);

    // Refresh data (after creating/deleting entries)
    const refreshData = useCallback(async () => {
        console.log('[NotionContext] Refreshing data...');

        // Clear cache first
        clearNotionCache();

        // Reset state
        setDiaryData([]);
        setNextCursor(null);
        setHasMore(false);
        hasInitializedRef.current = false;

        // Fetch fresh data
        await fetchInitialData();
    }, []);

    const value: NotionContextType = {
        diaryData,
        isLoading,
        error,
        hasMore,
        nextCursor,
        loadMore,
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

// Optional: hook for components that don't need full context
export const useDiaryData = () => {
    const { diaryData, isLoading, error, hasMore, loadMore } = useNotion();
    return { diaryData, isLoading, error, hasMore, loadMore };
};
