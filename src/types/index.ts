export interface UserData {
    uid: string;
    email: string | null;
    name: string | null;
    inviteCode: string;
    coupleId: string | null;
    photoURL: string | null;
    notionConfig?: { apiKey: string | null; databaseId: string | null };
    bgImage?: string | null;
    passcode?: string | null;
    theme?: string;
    isPushEnabled?: boolean; // Notification Setting
}

export interface CoupleData {
    id: string;
    members: string[]; // [uid1, uid2]
    startDate: string; // ISO string
    chatId: string;
    notionConfig?: { apiKey: string | null; databaseId: string | null };
    notice?: { text: string; id: string; createdAt: any };
    typing?: Record<string, boolean>; // { [userId]: isTyping }
}
// Force Refresh

export interface NotionItem {
    id: string;
    title: string;
    date: string;
    type: 'Diary' | 'Event' | 'Memory';
    images: string[];
    tags: string[];
    author: 'Me' | 'Partner';
    content: string;
}

export interface ChatMessage {
    id: string;
    text: string;
    senderId: string;
    createdAt: any; // Firestore Timestamp
    type: 'text' | 'image';
    imageUrl?: string;
    isRead: boolean;
    isDeleted?: boolean;
    replyTo?: { id: string; text: string; senderName: string };
    reactions?: Record<string, string[]>; // { 'heart': ['uid1', 'uid2'] }
}
