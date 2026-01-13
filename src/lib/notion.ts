import { auth } from './firebase';

// Local Emulator URL
// const CLOUD_FUNCTION_URL = "http://127.0.0.1:5001/dear23-app/us-central1/getNotionDatabase";
// Production URL
const CLOUD_FUNCTION_URL = "https://us-central1-ccdear23.cloudfunctions.net/getNotionDatabase";
const SEARCH_FUNCTION_URL = "https://us-central1-ccdear23.cloudfunctions.net/searchNotionDatabases";

// ============================================
// Caching & Throttle Configuration
// ============================================
const CACHE_TTL_MS = 60 * 1000; // 1분 캐시 유효
const THROTTLE_MS = 3000; // 3초 간격 유지

interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

// In-memory cache storage
const notionCache: Map<string, CacheEntry<PaginatedNotionResponse>> = new Map();
let lastApiCallTime = 0;

// Generate cache key from request parameters
const getCacheKey = (filterType?: string, cursor?: string, pageSize?: number): string => {
    return `${filterType || 'all'}-${cursor || 'initial'}-${pageSize || 20}`;
};

// Check if cache is still valid
const isCacheValid = (entry: CacheEntry<any>): boolean => {
    return Date.now() - entry.timestamp < CACHE_TTL_MS;
};

// Throttle: wait until minimum interval has passed
const waitForThrottle = async (): Promise<void> => {
    const now = Date.now();
    const timeSinceLastCall = now - lastApiCallTime;
    if (timeSinceLastCall < THROTTLE_MS) {
        const waitTime = THROTTLE_MS - timeSinceLastCall;
        console.log(`[Notion] Throttle: waiting ${waitTime}ms before API call`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
    }
};

// Clear cache (call after creating/deleting entries)
export const clearNotionCache = () => {
    notionCache.clear();
    console.log('[Notion] Cache cleared');
};

// ============================================
// Interfaces
// ============================================
export interface NotionDatabase {
    id: string;
    title: string;
    url: string;
    icon?: any;
}

export interface NotionItem {
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
    mood?: string;
    weather?: string;
    endDate?: string | null;
    color?: string;
    isImportant?: boolean;
    isShared?: boolean;
    url?: string;
}

export interface PaginatedNotionResponse {
    data: NotionItem[];
    hasMore: boolean;
    nextCursor: string | null;
}

// ============================================
// API Functions
// ============================================
const CREATE_DIARY_URL = "https://us-central1-ccdear23.cloudfunctions.net/createDiaryEntry";
// Trigger Vercel Redeploy: 2026-01-13

export const createDiaryEntry = async (
    content: string,
    images: { base64: string, type: string, size: number, name: string }[],
    type: 'Diary' | 'Memory' | 'Event' | 'Letter' = 'Diary',
    options: {
        mood?: string,
        sender?: string,
        date?: string,
        weather?: string,
        endDate?: string,
        color?: string,
        isImportant?: boolean,
        isShared?: boolean,
        url?: string,
        title?: string
    } = {}
) => {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");
    const token = await user.getIdToken();

    const response = await fetch(CREATE_DIARY_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            content,
            images,
            type, // Send type to backend
            mood: options.mood,
            sender: options.sender,
            date: options.date || new Date().toISOString().split('T')[0],
            weather: options.weather,
            endDate: options.endDate,
            color: options.color,
            isImportant: options.isImportant,
            isShared: options.isShared,
            url: options.url,
            title: options.title
        })
    });

    if (!response.ok) {
        let errorMessage = `Failed to create diary: ${response.statusText}`;
        try {
            const errorData = await response.json();
            if (errorData.error) {
                errorMessage += ` - ${errorData.error}`;
            }
            if (errorData.details) {
                console.error("Notion Error Details:", errorData.details);
                errorMessage += `\nDetails: ${JSON.stringify(errorData.details, null, 2)}`;
            }
        } catch (e) {
            // Ignore JSON parse error
        }
        throw new Error(errorMessage);
    }

    // Clear cache after creating entry
    clearNotionCache();
    return await response.json();
};

const DELETE_DIARY_URL = "https://us-central1-ccdear23.cloudfunctions.net/deleteDiaryEntry";

export const deleteDiaryEntry = async (pageId: string) => {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");
    const token = await user.getIdToken();

    const response = await fetch(DELETE_DIARY_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ pageId })
    });

    if (!response.ok) {
        throw new Error(`Failed to delete entry: ${response.statusText}`);
    }

    // Clear cache after deleting entry
    clearNotionCache();
    return await response.json();
};

const UPDATE_DIARY_URL = "https://us-central1-ccdear23.cloudfunctions.net/updateDiaryEntry";

export const updateDiaryEntry = async (
    pageId: string,
    content: string,
    images: { base64: string, type: string, size: number, name: string }[],
    options: {
        mood?: string,
        weather?: string,
        date?: string,
        title?: string,
        endDate?: string,
        color?: string,
        isImportant?: boolean,
        isShared?: boolean,
        url?: string
    }
) => {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");
    const token = await user.getIdToken();

    const response = await fetch(UPDATE_DIARY_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            pageId,
            content,
            images,
            mood: options.mood,
            weather: options.weather,
            date: options.date,
            title: options.title,
            endDate: options.endDate,
            color: options.color,
            isImportant: options.isImportant,
            isShared: options.isShared,
            url: options.url
        })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to update entry: ${response.statusText}`);
    }

    // Clear cache after updating entry
    clearNotionCache();
    return await response.json();
};

// Main fetch function with caching and throttle
export const fetchNotionData = async (
    filterType?: 'Diary' | 'Event' | 'Letter' | 'Memory',
    cursor?: string,
    pageSize: number = 20
): Promise<PaginatedNotionResponse> => {
    const cacheKey = getCacheKey(filterType, cursor, pageSize);

    // 1. Check cache first
    const cached = notionCache.get(cacheKey);
    if (cached && isCacheValid(cached)) {
        console.log(`[Notion] Cache HIT for ${cacheKey}`);
        return cached.data;
    }
    console.log(`[Notion] Cache MISS for ${cacheKey}, fetching from API...`);

    // 2. Apply throttle
    await waitForThrottle();

    // 3. Make API call
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    const token = await user.getIdToken();
    lastApiCallTime = Date.now();

    const response = await fetch(CLOUD_FUNCTION_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            filterType: filterType,
            startCursor: cursor,
            pageSize: pageSize
        })
    });

    if (!response.ok) {
        let errorMessage = `Failed to fetch Notion data: ${response.statusText}`;
        try {
            const errorData = await response.json();
            if (errorData.error) {
                errorMessage += ` - ${errorData.error}`;
            }
            if (errorData.details) {
                errorMessage += `\nDetails: ${JSON.stringify(errorData.details, null, 2)}`;
            }
        } catch (e) {
            // Ignore JSON parse error if response is not JSON
        }
        throw new Error(errorMessage);
    }

    const json = await response.json();

    // 4. Store in cache
    notionCache.set(cacheKey, {
        data: json,
        timestamp: Date.now()
    });
    console.log(`[Notion] Cached response for ${cacheKey}`);

    return json;
};

export const searchNotionDatabases = async (apiKey: string): Promise<NotionDatabase[]> => {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    // Apply throttle for search as well
    await waitForThrottle();
    lastApiCallTime = Date.now();

    const token = await user.getIdToken();

    const response = await fetch(SEARCH_FUNCTION_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            apiKey: apiKey
        })
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to search Notion databases`);
    }

    const json = await response.json();
    return json.data;
};

const VALIDATE_SCHEMA_URL = "https://us-central1-ccdear23.cloudfunctions.net/validateNotionSchema";

export const validateNotionSchema = async (apiKey: string, databaseId: string): Promise<{ status: string; created?: string[] }> => {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    // Apply throttle
    await waitForThrottle();
    lastApiCallTime = Date.now();

    const token = await user.getIdToken();

    const response = await fetch(VALIDATE_SCHEMA_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            apiKey,
            databaseId
        })
    });

    if (!response.ok) {
        let errorMessage = `Failed to validate Notion schema: ${response.statusText}`;
        try {
            const errorData = await response.json();
            if (errorData.error) {
                errorMessage += ` - ${errorData.error}`;
            }
            if (errorData.details) {
                errorMessage += `\nDetails: ${JSON.stringify(errorData.details, null, 2)}`;
            }
        } catch (e) {
            // Ignore JSON parse error
        }
        throw new Error(errorMessage);
    }

    return await response.json();
};

const PAGE_CONTENT_URL = "https://us-central1-ccdear23.cloudfunctions.net/getNotionPageContent";

export const fetchNotionPageContent = async (pageId: string): Promise<any> => {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    await waitForThrottle();
    lastApiCallTime = Date.now();

    const token = await user.getIdToken();

    const response = await fetch(PAGE_CONTENT_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ pageId })
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch page content: ${response.statusText}`);
    }

    return await response.json();
};
