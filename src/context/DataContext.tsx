import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { subscribeToCollection } from '../services/firestore';
import type { AppItem } from '../types';

interface DataContextType {
    // Data Arrays (Merged Optimistic + Real)
    diaryData: AppItem[];
    memoryData: AppItem[];
    eventData: AppItem[];
    letterData: AppItem[];

    // Loading & Error
    isLoading: boolean;
    error: string | null;

    refreshData: () => Promise<void>;

    // Legacy support functions
    loadMoreDiary: () => Promise<void>;
    loadMoreMemory: () => Promise<void>;
    loadMoreEvent: () => Promise<void>;
    loadMoreLetter: () => Promise<void>;

    hasMoreDiary: boolean;
    hasMoreMemory: boolean;
    hasMoreEvent: boolean;
    hasMoreLetter: boolean;

    // Optimistic UI Actions
    addOptimisticItem: (category: 'diaries' | 'memories' | 'events' | 'letters', item: AppItem) => void;
    removeOptimisticItem: (category: 'diaries' | 'memories' | 'events' | 'letters', id: string) => void; // Call this after success
    deleteOptimisticItem: (category: 'diaries' | 'memories' | 'events' | 'letters', id: string) => void; // Helper to hide item immediately
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { coupleData } = useAuth();
    const coupleId = coupleData?.id;

    // Real Firestore Data
    const [fsDiary, setFsDiary] = useState<AppItem[]>([]);
    const [fsMemory, setFsMemory] = useState<AppItem[]>([]);
    const [fsEvent, setFsEvent] = useState<AppItem[]>([]);
    const [fsLetter, setFsLetter] = useState<AppItem[]>([]);

    // Optimistic State
    const [optAdds, setOptAdds] = useState<{ [key: string]: AppItem[] }>({
        diaries: [], memories: [], events: [], letters: []
    });
    const [optDeletes, setOptDeletes] = useState<{ [key: string]: Set<string> }>({
        diaries: new Set(), memories: new Set(), events: new Set(), letters: new Set()
    });

    const [isLoading, setIsLoading] = useState(true);
    const [error, _] = useState<string | null>(null);

    const [loadedCategories, setLoadedCategories] = useState({
        diaries: false, memories: false, events: false, letters: false
    });

    useEffect(() => {
        if (!coupleId) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);

        const unsubDiary = subscribeToCollection(coupleId, 'diaries', (data) => {
            setFsDiary(data);
            setLoadedCategories(prev => ({ ...prev, diaries: true }));
        });

        const unsubMemory = subscribeToCollection(coupleId, 'memories', (data) => {
            setFsMemory(data);
            setLoadedCategories(prev => ({ ...prev, memories: true }));
        });

        const unsubEvent = subscribeToCollection(coupleId, 'events', (data) => {
            setFsEvent(data);
            setLoadedCategories(prev => ({ ...prev, events: true }));
        });

        const unsubLetter = subscribeToCollection(coupleId, 'letters', (data) => {
            setFsLetter(data);
            setLoadedCategories(prev => ({ ...prev, letters: true }));
        });

        return () => {
            unsubDiary(); unsubMemory(); unsubEvent(); unsubLetter();
        };
    }, [coupleId]);

    useEffect(() => {
        if (Object.values(loadedCategories).every(v => v)) {
            setIsLoading(false);
        }
    }, [loadedCategories]);

    // Optimistic Actions
    const addOptimisticItem = useCallback((category: string, item: AppItem) => {
        setOptAdds(prev => ({
            ...prev,
            [category]: [item, ...prev[category as keyof typeof prev]]
        }));
    }, []);

    const removeOptimisticItem = useCallback((category: string, id: string) => {
        setOptAdds(prev => ({
            ...prev,
            [category]: prev[category as keyof typeof prev].filter(i => i.id !== id)
        }));
    }, []);

    const deleteOptimisticItem = useCallback((category: string, id: string) => {
        setOptDeletes(prev => {
            const newSet = new Set(prev[category as keyof typeof prev]);
            newSet.add(id);
            return { ...prev, [category]: newSet };
        });
    }, []);

    // Merge Logic (Memoized)
    const mergeData = (firestore: AppItem[], category: string) => {
        const adds = optAdds[category] || [];
        const deletes = optDeletes[category] || new Set();

        // 1. Combine Adds + Firestore
        // Dedupe: if ID exists in Firestore, prefer Firestore (it means upload finished and sync happened)
        // BUT if we explicitly added an optimistic item, we might want to show IT until we remove it manually?
        // Actually, if Firestore has it, we should trust Firestore and clear the optimistic item. 
        // But for now, we'll let removeOptimisticItem handle the cleanup. 
        // We filter out optimistic items that clash with real items to avoid dupes.

        const firestoreIds = new Set(firestore.map(i => i.id));
        const uniqueAdds = adds.filter(i => !firestoreIds.has(i.id));

        const combined = [...uniqueAdds, ...firestore];

        // 2. Filter deletes
        const filtered = combined.filter(i => !deletes.has(i.id));

        // 3. Sort (Date Desc)
        return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    };

    const diaryData = useMemo(() => mergeData(fsDiary, 'diaries'), [fsDiary, optAdds['diaries'], optDeletes['diaries']]);
    const memoryData = useMemo(() => mergeData(fsMemory, 'memories'), [fsMemory, optAdds['memories'], optDeletes['memories']]);
    const eventData = useMemo(() => mergeData(fsEvent, 'events'), [fsEvent, optAdds['events'], optDeletes['events']]);
    const letterData = useMemo(() => mergeData(fsLetter, 'letters'), [fsLetter, optAdds['letters'], optDeletes['letters']]);

    // Backward Compatibility Stubs
    const refreshData = async () => { console.log('Data refresh requested (auto-handled by Firestore)'); };
    const loadMoreDiary = async () => { };
    const loadMoreMemory = async () => { };
    const loadMoreEvent = async () => { };
    const loadMoreLetter = async () => { };

    const value: DataContextType = {
        diaryData,
        memoryData,
        eventData,
        letterData,
        isLoading,
        error,
        refreshData,

        loadMoreDiary, hasMoreDiary: false,
        loadMoreMemory, hasMoreMemory: false,
        loadMoreEvent, hasMoreEvent: false,
        loadMoreLetter, hasMoreLetter: false,

        addOptimisticItem,
        removeOptimisticItem,
        deleteOptimisticItem,
    };

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
};

export const useData = () => {
    const context = useContext(DataContext);
    if (!context) throw new Error('useData must be used within DataProvider');
    return context;
};

// Aliases
export const useDiaryData = () => {
    const { diaryData, isLoading, error, refreshData, addOptimisticItem, removeOptimisticItem, deleteOptimisticItem } = useData();
    return { diaryData, isLoading, error, hasMore: false, loadMore: async () => { }, refreshData, addOptimisticItem, removeOptimisticItem, deleteOptimisticItem };
};

export const useMemoryData = () => {
    const { memoryData, isLoading, error, refreshData, addOptimisticItem, removeOptimisticItem, deleteOptimisticItem } = useData();
    return { memoryData, isLoading, error, hasMore: false, loadMore: async () => { }, refreshData, addOptimisticItem, removeOptimisticItem, deleteOptimisticItem };
};

export const useEventData = () => {
    const { eventData, isLoading, error, refreshData, addOptimisticItem, removeOptimisticItem, deleteOptimisticItem } = useData();
    return { eventData, isLoading, error, hasMore: false, loadMore: async () => { }, refreshData, addOptimisticItem, removeOptimisticItem, deleteOptimisticItem };
};

export const useLetterData = () => {
    const { letterData, isLoading, error, refreshData, addOptimisticItem, removeOptimisticItem, deleteOptimisticItem } = useData();
    return { letterData, isLoading, error, hasMore: false, loadMore: async () => { }, refreshData, addOptimisticItem, removeOptimisticItem, deleteOptimisticItem };
};

// Compatibility hook
export const useNotion = () => {
    return useData();
};
