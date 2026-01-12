import { auth } from './firebase';

// Local Emulator URL
// const CLOUD_FUNCTION_URL = "http://127.0.0.1:5001/dear23-app/us-central1/getNotionDatabase";
// Production URL
const CLOUD_FUNCTION_URL = "https://us-central1-ccdear23.cloudfunctions.net/getNotionDatabase";
const SEARCH_FUNCTION_URL = "https://us-central1-ccdear23.cloudfunctions.net/searchNotionDatabases";

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
}

export interface PaginatedNotionResponse {
    data: NotionItem[];
    hasMore: boolean;
    nextCursor: string | null;
}

export const fetchNotionData = async (filterType?: 'Diary' | 'Event' | 'Letter' | 'Memory', cursor?: string, pageSize: number = 20): Promise<PaginatedNotionResponse> => {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    const token = await user.getIdToken();

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
    return json; // Returns { data, hasMore, nextCursor }
};

export const searchNotionDatabases = async (apiKey: string): Promise<NotionDatabase[]> => {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

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
