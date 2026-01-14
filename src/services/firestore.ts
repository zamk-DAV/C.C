import { db, storage } from '../lib/firebase';
import {
    collection,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    orderBy,
    limit,
    startAfter,
    getDocs,
    onSnapshot,
    serverTimestamp,
    QueryConstraint
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { AppItem } from '../types';

// Collection References Helper
const getCoupleCollection = (coupleId: string, subCollection: string) => {
    return collection(db, 'couples', coupleId, subCollection);
};

// Image Upload Service
export const uploadImage = async (file: File, path: string): Promise<string> => {
    try {
        const storageRef = ref(storage, path);
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        return downloadURL;
    } catch (error) {
        console.error("Error uploading image: ", error);
        throw error;
    }
};

// Generic Add Item
export const addAppItem = async (
    coupleId: string,
    category: 'diaries' | 'memories' | 'events' | 'letters',
    data: Partial<AppItem>,
    customId?: string // Optional custom ID for optimistic UI consistency
): Promise<string> => {
    try {
        const colRef = getCoupleCollection(coupleId, category);

        if (customId) {
            const docRef = doc(colRef, customId);
            await import('firebase/firestore').then(({ setDoc }) => setDoc(docRef, {
                ...data,
                coupleId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            }));
            return customId;
        } else {
            const docRef = await addDoc(colRef, {
                ...data,
                coupleId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            return docRef.id;
        }
    } catch (error) {
        console.error(`Error adding item to ${category}:`, error);
        throw error;
    }
};

// Generic Update Item
export const updateAppItem = async (
    coupleId: string,
    category: 'diaries' | 'memories' | 'events' | 'letters',
    id: string,
    data: Partial<AppItem>
): Promise<void> => {
    try {
        const docRef = doc(db, 'couples', coupleId, category, id);
        await updateDoc(docRef, {
            ...data,
            updatedAt: serverTimestamp()
        });
    } catch (error) {
        console.error(`Error updating item in ${category}:`, error);
        throw error;
    }
};

// Generic Delete Item
export const deleteAppItem = async (
    coupleId: string,
    category: 'diaries' | 'memories' | 'events' | 'letters',
    id: string
): Promise<void> => {
    try {
        const docRef = doc(db, 'couples', coupleId, category, id);
        await deleteDoc(docRef);
    } catch (error) {
        console.error(`Error deleting item from ${category}:`, error);
        throw error;
    }
};

// Create a subscription for real-time updates
export const subscribeToCollection = (
    coupleId: string,
    category: 'diaries' | 'memories' | 'events' | 'letters',
    onDataChange: (data: AppItem[]) => void,
    constraints: QueryConstraint[] = []
) => {
    const colRef = getCoupleCollection(coupleId, category);
    // Default sort by date desc
    const q = query(colRef, orderBy('date', 'desc'), ...constraints);

    const unsubscribe = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
        const items: AppItem[] = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            isOptimisticUpdate: doc.metadata.hasPendingWrites
        } as AppItem));
        onDataChange(items);
    }, (error) => {
        console.error(`Error subscribing to ${category}:`, error);
    });

    return unsubscribe;
};

// Legacy-like Fetch (One-time fetch)
export const fetchAppItems = async (
    coupleId: string,
    category: 'diaries' | 'memories' | 'events' | 'letters',
    pageSize: number = 20,
    lastDoc: any = null
) => {
    try {
        const colRef = getCoupleCollection(coupleId, category);
        let q = query(colRef, orderBy('date', 'desc'), limit(pageSize));

        if (lastDoc) {
            q = query(colRef, orderBy('date', 'desc'), startAfter(lastDoc), limit(pageSize));
        }

        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppItem));
        const lastVisible = snapshot.docs[snapshot.docs.length - 1];

        return { data, lastVisible, hasMore: data.length === pageSize };
    } catch (error) {
        console.error(`Error fetching ${category}:`, error);
        throw error;
    }
};
