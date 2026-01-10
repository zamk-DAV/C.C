import { auth } from './firebase';

// Local Emulator URL
// const CLOUD_FUNCTION_URL = "http://127.0.0.1:5001/dear23-app/us-central1/getNotionDatabase";
// Production URL
const CLOUD_FUNCTION_URL = "https://us-central1-ccdear23.cloudfunctions.net/getNotionDatabase";

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

export const fetchNotionData = async (filterType?: 'Diary' | 'Event' | 'Letter'): Promise<NotionItem[]> => {
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
            filterType: filterType
        })
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch Notion data: ${response.statusText}`);
    }

    const json = await response.json();
    return json.data;
};
