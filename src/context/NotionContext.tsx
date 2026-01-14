import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { fetchNotionData, clearNotionCache } from '../lib/notion';
import type { NotionItem } from '../types';

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

    authorId?: string; // Added for UID based filtering

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
    // Common State
    // isLoading starts true, but if cache exists, we flip it to false immediately in fetchInitialData
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastFetched, setLastFetched] = useState<number | null>(null);

    // Cache Keys
    const CACHE_KEY_DIARY = 'dear23_cache_diary';
    const CACHE_KEY_MEMORY = 'dear23_cache_memory';
    const CACHE_KEY_EVENT = 'dear23_cache_event';
    const CACHE_KEY_LETTER = 'dear23_cache_letter';

    // Helper: Load from LocalStorage
    const loadFromStorage = <T,>(key: string): T | null => {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch (e) {
            console.error('Failed to load from storage', e);
            return null;
        }
    };

    // Helper: Save to LocalStorage
    const saveToStorage = (key: string, data: any) => {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            console.error('Failed to save to storage', e);
        }
    };

    const hasInitializedRef = useRef(false);
    const isLoadingRef = useRef(false);

    // Priority: coupleData.notionConfig > userData.notionConfig (legacy fallback)
    const notionConfig = coupleData?.notionConfig || userData?.notionConfig;
    const isNotionConfigured = Boolean(
        notionConfig?.apiKey &&
        notionConfig?.databaseId
    );

    const fetchInitialData = useCallback(async () => {
        if (isLoadingRef.current) return;
        isLoadingRef.current = true;

        // 1. Load from Cache immediately (Instant Load)
        const cachedDiary = loadFromStorage<NotionItem[]>(CACHE_KEY_DIARY);
        const cachedMemory = loadFromStorage<NotionItem[]>(CACHE_KEY_MEMORY);
        const cachedEvent = loadFromStorage<NotionItem[]>(CACHE_KEY_EVENT);
        const cachedLetter = loadFromStorage<NotionItem[]>(CACHE_KEY_LETTER);

        if (cachedDiary) setDiaryData(cachedDiary);
        if (cachedMemory) setMemoryData(cachedMemory);
        if (cachedEvent) setEventData(cachedEvent);
        if (cachedLetter) setLetterData(cachedLetter);

        // If we have cached data, we can stop the overall "loading" spinner 
        // effectively immediately, allowing the UI to render.
        // We still fetch in background.
        if (cachedDiary || cachedMemory || cachedEvent) {
            console.log('[NotionContext] Loaded from cache. Fetching fresh data in background...');
            setIsLoading(false);
        } else {
            setIsLoading(true);
        }

        setError(null);
        console.log('[NotionContext] Fetching fresh data from API...');

        try {
            const [diaryResult, memoryResult, eventResult, letterResult] = await Promise.all([
                fetchNotionData('Diary', undefined, 20),
                fetchNotionData('Memory', undefined, 20),
                fetchNotionData('Event', undefined, 50),
                fetchNotionData('Letter', undefined, 20)
            ]);

            // 2. Update State & Cache
            setDiaryData(diaryResult.data);
            saveToStorage(CACHE_KEY_DIARY, diaryResult.data);
            setHasMoreDiary(diaryResult.hasMore);
            setNextCursorDiary(diaryResult.nextCursor);

            setMemoryData(memoryResult.data);
            saveToStorage(CACHE_KEY_MEMORY, memoryResult.data);
            setHasMoreMemory(memoryResult.hasMore);
            setNextCursorMemory(memoryResult.nextCursor);

            setEventData(eventResult.data);
            saveToStorage(CACHE_KEY_EVENT, eventResult.data);
            setHasMoreEvent(eventResult.hasMore);
            setNextCursorEvent(eventResult.nextCursor);

            setLetterData(letterResult.data);
            saveToStorage(CACHE_KEY_LETTER, letterResult.data);
            setHasMoreLetter(letterResult.hasMore);
            setNextCursorLetter(letterResult.nextCursor);

            setLastFetched(Date.now());
        } catch (err: any) {
            console.error('[NotionContext] Failed to load data:', err);
            // Only set error if we have NO data to show
            if (!cachedDiary && !cachedMemory) {
                setError(err.message || 'Failed to load Notion data');
            }
        } finally {
            setIsLoading(false);
            isLoadingRef.current = false;
        }
    }, []);

    useEffect(() => {
        if (hasInitializedRef.current) return;
        if (!isNotionConfigured) return;

        hasInitializedRef.current = true;
        fetchInitialData();
    }, [isNotionConfigured, fetchInitialData]);

    // Auto-refresh logic on App Foreground
    useEffect(() => {
        const TOKEN_EXPIRY_TIME = 50 * 60 * 1000; // 50 minutes

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && lastFetched) {
                const now = Date.now();
                const timeSinceLastFetch = now - lastFetched;

                if (timeSinceLastFetch > TOKEN_EXPIRY_TIME) {
                    console.log(`[NotionContext] Data is stale (${Math.floor(timeSinceLastFetch / 60000)}m ago). Refreshing...`);
                    // Force refresh background style (or just call fetchInitialData)
                    fetchInitialData();
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [lastFetched, fetchInitialData]);

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
    }, [fetchInitialData]);

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

export const useDiaryData = () => {
    const { diaryData, isLoading, error, hasMoreDiary, loadMoreDiary } = useNotion();
    return { diaryData, isLoading, error, hasMore: hasMoreDiary, loadMore: loadMoreDiary };
};

export const useMemoryData = () => {
    const { memoryData, isLoading, error, hasMoreMemory, loadMoreMemory } = useNotion();
    return { memoryData, isLoading, error, hasMore: hasMoreMemory, loadMore: loadMoreMemory };
};

export const useEventData = () => {
    const { eventData, isLoading, error, hasMoreEvent, loadMoreEvent, refreshData } = useNotion();
    return { eventData, isLoading, error, hasMore: hasMoreEvent, loadMore: loadMoreEvent, refreshData };
};

export const useLetterData = () => {
    const { letterData, isLoading, error, hasMoreLetter, loadMoreLetter } = useNotion();
    return { letterData, isLoading, error, hasMore: hasMoreLetter, loadMore: loadMoreLetter };
};
