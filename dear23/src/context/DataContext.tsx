import React, { createContext, useContext, useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';
import type { DiaryEntry, LetterEntry, MemoryEntry } from '../lib/firebase/services';
import type { CalendarEvent } from '../types';

interface DataContextType {
    diaries: (DiaryEntry & { id: string })[];
    letters: (LetterEntry & { id: string })[];
    memories: (MemoryEntry & { id: string })[];
    events: CalendarEvent[];
    loading: boolean;
    refreshData: () => Promise<void>; // Kept for compatibility, though realtime doesn't need it
}

const DataContext = createContext<DataContextType>({
    diaries: [],
    letters: [],
    memories: [],
    events: [],
    loading: true,
    refreshData: async () => { },
});

export const useData = () => useContext(DataContext);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { userData } = useAuth();
    const [diaries, setDiaries] = useState<(DiaryEntry & { id: string })[]>([]);
    const [letters, setLetters] = useState<(LetterEntry & { id: string })[]>([]);
    const [memories, setMemories] = useState<(MemoryEntry & { id: string })[]>([]);
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userData?.coupleId) {
            setLoading(false);
            return;
        }

        const coupleId = userData.coupleId;

        // 1. Subscribe to Diaries
        const qDiaries = query(
            collection(db, 'couples', coupleId, 'diaries'),
            orderBy('date', 'desc'),
            orderBy('createdAt', 'desc'),
            limit(50) // Initial limit, could implement infinite scroll later
        );

        const unsubDiaries = onSnapshot(qDiaries, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as (DiaryEntry & { id: string })[];
            setDiaries(data);
        });

        // 2. Subscribe to Letters
        const qLetters = query(
            collection(db, 'couples', coupleId, 'letters'),
            orderBy('createdAt', 'desc'),
            limit(50)
        );

        const unsubLetters = onSnapshot(qLetters, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as (LetterEntry & { id: string })[];
            setLetters(data);
        });

        // 3. Subscribe to Memories
        const qMemories = query(
            collection(db, 'couples', coupleId, 'memories'),
            orderBy('date', 'desc'),
            orderBy('createdAt', 'desc'),
            limit(50)
        );

        const unsubMemories = onSnapshot(qMemories, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as (MemoryEntry & { id: string })[];
            setMemories(data);
        });

        // 4. Subscribe to Events (Calendar)
        const qEvents = query(
            collection(db, 'couples', coupleId, 'events')
        );

        const unsubEvents = onSnapshot(qEvents, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as CalendarEvent[];
            setEvents(data);
            setLoading(false); // Assume initial load complete when events load (simplification)
        });

        // Cleanup
        return () => {
            unsubDiaries();
            unsubLetters();
            unsubMemories();
            unsubEvents();
        };

    }, [userData?.coupleId]);

    const value = {
        diaries,
        letters,
        memories,
        events,
        loading,
        refreshData: async () => { }, // No-op for realtime
    };

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
};
