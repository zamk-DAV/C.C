export interface UserData {
    uid: string;
    email: string | null;
    name: string | null;
    inviteCode: string;
    coupleId: string | null;
    photoURL: string | null;
    statusMessage?: string;
    emailProp?: string;
    hobbies?: string;
    partnerNickname?: string; // My nickname for the partner
    mbti?: string;
    birthDate?: string;
    notionConfig?: { apiKey: string | null; databaseId: string | null };
    bgImage?: string | null;
    passcode?: string | null;
    theme?: string;
    isPushEnabled?: boolean; // Notification Setting
    fcmTokens?: string[];
    unreadCount?: number;
    isChatActive?: boolean; // Whether user is currently in ChatPage
    lastActive?: any; // Last timestamp user was seen
    lastCheckedDiary?: any; // Timestamp
    lastCheckedFeed?: any;  // Timestamp
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
    coverImage: string | null;
    previewText: string;
    type?: 'Diary' | 'Event' | 'Memory' | 'Letter';
    sender?: string;
    isRead?: boolean;
    author?: 'Me' | 'Partner';
    images?: string[];
    tags?: string[];
    content?: string;
    mood?: string;
    weather?: string;
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

export interface Postcard {
    id: string;
    senderId: string; // 'sender' in mock was name, but better to use ID
    senderName: string; // denormalized for ease
    date: string; // or Timestamp, but mock used string '2023. 10. 24'
    content: string;
    isRead: boolean;
    type: 'received' | 'sent';
    createdAt?: any; // Timestamp
    openDate?: string | null; // For scheduled letters (locked until this date)
}

export interface CalendarEvent {
    id: string;
    title: string;
    date: Date; // Keep as Date object for internal use (or Timestamp for DB)
    time?: string; // '19:00'
    type: 'Event' | 'Diary';
    note?: string;
    author?: string; // 'Me' | 'Partner' for filtering
    // New fields for Premium UI
    endDate?: Date;
    color?: string;
    isImportant?: boolean;
    isShared?: boolean;
    url?: string;
    images?: string[];
}

export interface MemoryItem {
    id: string;
    type: 'image' | 'quote';
    imageUrl?: string;
    quote?: string;
    title: string;
    subtitle: string;
    date?: string;
    images?: string[];
}
