export interface UserData {
    uid: string;
    email: string | null;
    name: string | null;
    inviteCode: string;
    coupleId: string | null;
    photoURL: string | null;
    notionConfig?: { apiKey: string | null; databaseId: string | null };
    bgImage?: string | null;
}

export interface CoupleData {
    id: string;
    members: string[]; // [uid1, uid2]
    startDate: string; // ISO string
    chatId: string;
}
// Force Refresh
