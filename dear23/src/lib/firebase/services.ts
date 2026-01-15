import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    getDocs,
    query,
    orderBy,
    limit,
    startAfter,
    serverTimestamp
} from 'firebase/firestore';
import { db, storage } from '../firebase';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import type { CalendarEvent } from '../../types';

// ============================================
// Types
// ============================================

export interface DiaryEntry {
    title?: string;
    content: string;
    images: string[]; // Storage URLs
    mood?: string;
    weather?: string;
    date: string; // YYYY-MM-DD
    authorId: string;
    createdAt: any;
    updatedAt: any;
}

export interface LetterEntry {
    content: string;
    senderId: string;
    senderName: string;
    recipientName: string;
    type: 'sent' | 'received'; // Denormalized for easier query
    date: string; // Scheduled or Send date
    isRead: boolean;
    createdAt: any;
}

export interface MemoryEntry {
    content: string;
    images: string[];
    date: string;
    authorId: string;
    createdAt: any;
}

// Re-using CalendarEvent from types, but ensuring proper storage fields

// ============================================
// Helpers
// ============================================

const getCollectionValues = (coupleId: string, collectionName: string) => {
    return collection(db, 'couples', coupleId, collectionName);
};

export const uploadImage = async (coupleId: string, base64: string): Promise<string> => {
    const fileName = `${uuidv4()}.jpg`;
    const storageRef = ref(storage, `couples/${coupleId}/images/${fileName}`);

    await uploadString(storageRef, base64, 'data_url');
    const url = await getDownloadURL(storageRef);
    console.log("Uploaded Image URL:", url);
    return url;
};

export const uploadImages = async (coupleId: string, images: { base64: string }[]): Promise<string[]> => {
    // Filter only new base64 images
    const uploadPromises = images
        .filter(img => img.base64.startsWith('data:'))
        .map(img => uploadImage(coupleId, img.base64));

    const newUrls = await Promise.all(uploadPromises);

    // Combine with existing URLs (if we had a mix, logic would be needed here, 
    // but for now we assume input is mostly new or mixed. 
    // The calling function should handle existing URLs preservation)
    return newUrls;
};

// ============================================
// Diary Services
// ============================================

export const DiaryService = {
    addDiary: async (coupleId: string, authorId: string, data: {
        title?: string;
        content: string;
        images: { base64: string }[];
        mood?: string;
        weather?: string;
        date: string;
    }) => {
        const imageUrls = await uploadImages(coupleId, data.images);

        await addDoc(getCollectionValues(coupleId, 'diaries'), {
            title: data.title || '',
            content: data.content,
            images: imageUrls,
            mood: data.mood,
            weather: data.weather,
            date: data.date,
            authorId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
    },

    getDiaries: async (coupleId: string, lastDoc?: any, pageSize = 20) => {
        let q = query(
            getCollectionValues(coupleId, 'diaries'),
            orderBy('date', 'desc'),
            orderBy('createdAt', 'desc'),
            limit(pageSize)
        );

        if (lastDoc) {
            q = query(q, startAfter(lastDoc));
        }

        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as (DiaryEntry & { id: string })[];

        return {
            data,
            lastDoc: snapshot.docs[snapshot.docs.length - 1],
            hasMore: snapshot.docs.length === pageSize
        };
    },

    deleteDiary: async (coupleId: string, diaryId: string) => {
        await deleteDoc(doc(db, 'couples', coupleId, 'diaries', diaryId));
    },

    updateDiary: async (coupleId: string, diaryId: string, data: Partial<DiaryEntry>) => {
        await updateDoc(doc(db, 'couples', coupleId, 'diaries', diaryId), {
            ...data,
            updatedAt: serverTimestamp()
        });
    }
};

// ============================================
// Letter Services
// ============================================

export const LetterService = {
    addLetter: async (coupleId: string, senderId: string, data: {
        content: string;
        senderName: string;
        recipientName: string;
        date: string; // Scheduled date
    }) => {
        await addDoc(getCollectionValues(coupleId, 'letters'), {
            content: data.content,
            senderId,
            senderName: data.senderName,
            recipientName: data.recipientName,
            date: data.date,
            isRead: false,
            createdAt: serverTimestamp()
        });
    },

    getLetters: async (coupleId: string, lastDoc?: any, pageSize = 20) => {
        let q = query(
            getCollectionValues(coupleId, 'letters'),
            orderBy('createdAt', 'desc'),
            limit(pageSize)
        );

        if (lastDoc) {
            q = query(q, startAfter(lastDoc));
        }

        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as (LetterEntry & { id: string })[];

        return {
            data,
            lastDoc: snapshot.docs[snapshot.docs.length - 1],
            hasMore: snapshot.docs.length === pageSize
        };
    },

    markAsRead: async (coupleId: string, letterId: string) => {
        await updateDoc(doc(db, 'couples', coupleId, 'letters', letterId), {
            isRead: true
        });
    }
};

// ============================================
// Memory Services
// ============================================

export const MemoryService = {
    addMemory: async (coupleId: string, authorId: string, data: {
        content: string;
        images: { base64: string }[];
        date: string;
    }) => {
        const imageUrls = await uploadImages(coupleId, data.images);

        await addDoc(getCollectionValues(coupleId, 'memories'), {
            content: data.content,
            images: imageUrls,
            date: data.date,
            authorId,
            createdAt: serverTimestamp()
        });
    },

    getMemories: async (coupleId: string, lastDoc?: any, pageSize = 20) => {
        let q = query(
            getCollectionValues(coupleId, 'memories'),
            orderBy('createdAt', 'desc'),
            limit(pageSize)
        );

        if (lastDoc) {
            q = query(q, startAfter(lastDoc));
        }

        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as (MemoryEntry & { id: string })[];

        return {
            data,
            lastDoc: snapshot.docs[snapshot.docs.length - 1],
            hasMore: snapshot.docs.length === pageSize
        };
    }
};

// ============================================
// Event Services (Calendar)
// ============================================

export const EventService = {
    addEvent: async (coupleId: string, authorId: string, data: Omit<CalendarEvent, 'id' | 'images'> & { images?: any[] }) => {
        let imageUrls: string[] = [];

        // Handle images: split into already URLs and new base64
        // Assuming data.images contains { base64: string } objects for new images
        // or just strings for existing URLs (though addEvent usually implies new)

        if (data.images && data.images.length > 0) {
            const newImagesToUpload = data.images.filter((img: any) => img.base64 && img.base64.startsWith('data:'));
            const uploadedUrls = await uploadImages(coupleId, newImagesToUpload);

            // If there were any plain strings (e.g. copied from elsewhere), keep them? 
            // Usually addEvent is new.
            imageUrls = [...uploadedUrls];
        }

        await addDoc(getCollectionValues(coupleId, 'events'), {
            ...data,
            images: imageUrls,
            authorId,
            createdAt: serverTimestamp()
        });
    },

    updateEvent: async (coupleId: string, eventId: string, data: Partial<CalendarEvent> & { newImages?: { base64: string }[] }) => {
        const updates: any = { ...data, updatedAt: serverTimestamp() };

        // If newImages provided, upload and append/replace?
        // Usually we expect 'images' in data to be the Final List of URLs.
        // But if we want to Upload New ones, we need to handle that.

        if (data.newImages && data.newImages.length > 0) {
            const uploadedUrls = await uploadImages(coupleId, data.newImages);
            // Append to existing images if data.images is provided, or fetch?
            // Better strategy: The caller should pass 'images' as the Current Known URLs.
            // We just upload newImages and ADD them to 'images'.

            const currentImages = data.images || [];
            updates.images = [...currentImages, ...uploadedUrls];
            delete updates.newImages; // Don't save this field
        }

        await updateDoc(doc(db, 'couples', coupleId, 'events', eventId), updates);
    },

    deleteEvent: async (coupleId: string, eventId: string) => {
        await deleteDoc(doc(db, 'couples', coupleId, 'events', eventId));
    }
};
