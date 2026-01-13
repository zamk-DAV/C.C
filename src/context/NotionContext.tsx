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

    // Event Data (Calendar)
    eventData: NotionItem[];
    hasMoreEvent: boolean;
    loadMoreEvent: () => Promise<void>;

    // Letter Data (Mailbox)
    letterData: NotionItem[];
    hasMoreLetter: boolean;
    loadMoreLetter: () => Promise<void>;

    // Common
    isLoading: boolean;
    error: string | null;
    refreshData: () => Promise<void>;
    lastFetched: number | null;
}

const NotionContext = createContext<NotionContextType | undefined>(undefined);

export const NotionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { userData, coupleData } = useAuth();

    // Diary State
    const [diaryData, setDiaryData] = useState<NotionItem[]>([]);
    const [hasMoreDiary, setHasMoreDiary] = useState(false);
    const [nextCursorDiary, setNextCursorDiary] = useState<string | null>(null);

    // Memory State
    const [memoryData, setMemoryData] = useState<NotionItem[]>([]);
    const [hasMoreMemory, setHasMoreMemory] = useState(false);
    const [nextCursorMemory, setNextCursorMemory] = useState<string | null>(null);

    // Event State
    const [eventData, setEventData] = useState<NotionItem[]>([]);
    const [hasMoreEvent, setHasMoreEvent] = useState(false);
    const [nextCursorEvent, setNextCursorEvent] = useState<string | null>(null);

    // Letter State
    const [letterData, setLetterData] = useState<NotionItem[]>([]);
    const [hasMoreLetter, setHasMoreLetter] = useState(false);
    const [nextCursorLetter, setNextCursorLetter] = useState<string | null>(null);

    // Common State
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastFetched, setLastFetched] = useState<number | null>(null);

    const hasInitializedRef = useRef(false);
    const isLoadingRef = useRef(false);

    // Priority: coupleData.notionConfig > userData.notionConfig (legacy fallback)
    const notionConfig = coupleData?.notionConfig || userData?.notionConfig;
    const isNotionConfigured = Boolean(
        notionConfig?.apiKey &&
        notionConfig?.databaseId
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
            const [diaryResult, memoryResult, eventResult, letterResult] = await Promise.all([
                fetchNotionData('Diary', undefined, 20),
                fetchNotionData('Memory', undefined, 20),
                fetchNotionData('Event', undefined, 50), // Fetch more events for calendar
                fetchNotionData('Letter', undefined, 20)
            ]);

            console.log('[DEBUG] Notion Results Loaded');

            // Set Diary
            setDiaryData(diaryResult.data);
            setHasMoreDiary(diaryResult.hasMore);
            setNextCursorDiary(diaryResult.nextCursor);

            // Set Memory
            setMemoryData(memoryResult.data);
            setHasMoreMemory(memoryResult.hasMore);
            setNextCursorMemory(memoryResult.nextCursor);

            // Set Event
            setEventData(eventResult.data);
            setHasMoreEvent(eventResult.hasMore);
            setNextCursorEvent(eventResult.nextCursor);

            // Set Letter
            setLetterData(letterResult.data);
            setHasMoreLetter(letterResult.hasMore);
            setNextCursorLetter(letterResult.nextCursor);

            setLastFetched(Date.now());
            console.log(`[NotionContext] Data loaded: D:${diaryResult.data.length}, M:${memoryResult.data.length}, E:${eventResult.data.length}, L:${letterResult.data.length}`);
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

    const loadMoreEvent = useCallback(async () => {
        if (!hasMoreEvent || !nextCursorEvent || isLoadingRef.current) return;
        isLoadingRef.current = true;

        try {
            const result = await fetchNotionData('Event', nextCursorEvent, 50);
            setEventData(prev => [...prev, ...result.data]);
            setHasMoreEvent(result.hasMore);
            setNextCursorEvent(result.nextCursor);
        } catch (err: any) {
            console.error('[NotionContext] Failed to load more event:', err);
        } finally {
            isLoadingRef.current = false;
        }
    }, [hasMoreEvent, nextCursorEvent]);

    const loadMoreLetter = useCallback(async () => {
        if (!hasMoreLetter || !nextCursorLetter || isLoadingRef.current) return;
        isLoadingRef.current = true;

        try {
            const result = await fetchNotionData('Letter', nextCursorLetter, 20);
            setLetterData(prev => [...prev, ...result.data]);
            setHasMoreLetter(result.hasMore);
            setNextCursorLetter(result.nextCursor);
        } catch (err: any) {
            console.error('[NotionContext] Failed to load more letter:', err);
        } finally {
            isLoadingRef.current = false;
        }
    }, [hasMoreLetter, nextCursorLetter]);

    const refreshData = useCallback(async () => {
        console.log('[NotionContext] Refreshing data...');
        clearNotionCache();

        setDiaryData([]);
        setMemoryData([]);
        setEventData([]);
        setLetterData([]);
        setNextCursorDiary(null);
        setNextCursorMemory(null);
        setNextCursorEvent(null);
        setNextCursorLetter(null);
        setHasMoreDiary(false);
        setHasMoreMemory(false);
        setHasMoreEvent(false);
        setHasMoreLetter(false);

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
        eventData,
        hasMoreEvent,
        loadMoreEvent,
        letterData,
        hasMoreLetter,
        loadMoreLetter,
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

export const useEventData = () => {
    const { eventData, isLoading, error, hasMoreEvent, loadMoreEvent } = useNotion();
    return { eventData, isLoading, error, hasMore: hasMoreEvent, loadMore: loadMoreEvent };
};

export const useLetterData = () => {
    const { letterData, isLoading, error, hasMoreLetter, loadMoreLetter } = useNotion();
    return { letterData, isLoading, error, hasMore: hasMoreLetter, loadMore: loadMoreLetter };
};
