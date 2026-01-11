import React, { useState, useMemo, useEffect } from 'react';
import { format, parseISO, isValid } from 'date-fns';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { fetchNotionData, type NotionItem } from '../lib/notion';
import { useAuth } from '../context/AuthContext';

export const DiaryPage: React.FC = () => {
    // Filter logic removed from UI but keeping 'all' logic internally
    const { userData } = useAuth();
    const [items, setItems] = useState<NotionItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let unsubscribe: (() => void) | undefined;

        const loadData = async () => {
            try {
                const data = await fetchNotionData('Diary');
                setItems(data);
            } catch (err) {
                console.error("Failed to load diary:", err);
                setError("일기를 불러오는데 실패했습니다.");
            } finally {
                setLoading(false);
            }
        };

        loadData();

        if (userData?.coupleId) {
            const coupleRef = doc(db, 'couples', userData.coupleId);
            unsubscribe = onSnapshot(coupleRef, async (docSnap) => {
                if (docSnap.exists()) {
                    console.log("[Diary] Sync signal received, refetching...");
                    try {
                        const newData = await fetchNotionData('Diary');
                        setItems(newData);
                    } catch (e) {
                        console.error("Refetch failed", e);
                    }
                }
            });
        }

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [userData?.coupleId]);

    // Flattened sorted list
    const sortedItems = useMemo(() => {
        return [...items].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [items]);

    return (
        <div className="bg-background-light dark:bg-background-dark text-text-main dark:text-white font-sans antialiased min-h-screen flex flex-col">
            {/* Header Area */}
            <header className="bg-background-light dark:bg-background-dark pt-12 pb-2 px-6 sticky top-0 z-10 transition-colors duration-300">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-bold tracking-tight uppercase">Archive / Diary</h1>
                    {/* Menu Icon */}
                    <button className="text-text-main dark:text-white p-2 -mr-2 rounded-full hover:bg-surface-light dark:hover:bg-zinc-800 transition-colors">
                        <span className="material-icons-outlined text-3xl">drag_handle</span>
                    </button>
                </div>
                {/* Minimalist Filters (Visual only, always 'all') */}
                <div className="flex gap-8 border-b border-gray-100 dark:border-gray-800 pb-4">
                    <button className="relative group">
                        <span className="text-sm font-bold text-text-main dark:text-white">전체</span>
                        <span className="absolute -bottom-4 left-0 w-full h-0.5 bg-text-main dark:bg-white"></span>
                    </button>
                </div>
            </header>

            {/* Main Scrollable Content */}
            <main className="flex-1 overflow-y-auto no-scrollbar pb-24 px-6 md:max-w-xl md:mx-auto w-full">
                {/* Spacer */}
                <div className="h-6"></div>

                {loading && (
                    <div className="py-10 text-center text-gray-400">
                        Loading...
                    </div>
                )}

                {error && (
                    <div className="py-10 text-center text-red-500">
                        {error}
                    </div>
                )}

                {!loading && sortedItems.map((item) => {
                    const date = parseISO(item.date);
                    let dateStr = '';
                    if (isValid(date)) {
                        dateStr = format(date, 'MM.dd');
                    } else {
                        console.error('Invalid date:', item.date);
                        dateStr = '--.--';
                    } // e.g., 10.24

                    // Visual Entry (Full Width Card)
                    if (item.coverImage) {
                        return (
                            <div key={item.id} className="py-8">
                                <div className="relative w-full aspect-[4/5] rounded-2xl overflow-hidden shadow-sm group">
                                    <div
                                        className="absolute inset-0 bg-cover bg-center transition-all duration-500 hover:grayscale-0 grayscale"
                                        style={{ backgroundImage: `url('${item.coverImage}')` }}
                                    ></div>
                                    {/* Overlay Gradient */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                                    {/* Content Overlay */}
                                    <div className="absolute bottom-0 left-0 w-full p-6 text-white flex flex-col items-start">
                                        <div className="text-xs font-bold tracking-widest mb-2 opacity-80">{dateStr}</div>
                                        <h2 className="font-serif text-3xl font-normal leading-snug mb-4">{item.title}</h2>

                                        {/* Mock Stats (Since current notion data might not have stats yet) */}
                                        <div className="flex items-center gap-4 text-white/80">
                                            <div className="flex items-center gap-1">
                                                <span className="material-icons-outlined text-[18px]">favorite_border</span>
                                                {/* <span className="text-xs font-medium">124</span> */}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    }

                    // Text Entry Item
                    return (
                        <div key={item.id} className="group flex items-baseline justify-between py-5 border-b border-dashed border-gray-200 dark:border-gray-800">
                            <div className="text-sm font-bold text-text-main dark:text-white w-16 shrink-0">{dateStr}</div>
                            <div className="flex flex-col items-end flex-1 gap-1">
                                <h3 className="font-serif text-xl text-text-main dark:text-white leading-tight text-right">
                                    {item.title}
                                </h3>
                                <div className="flex items-center gap-3 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="flex items-center gap-1 text-xs text-text-muted">
                                        <span className="material-icons-outlined text-[14px]">favorite_border</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}

                <div className="h-10"></div>
            </main>

            {/* Floating Action Button */}
            <div className="fixed bottom-24 right-6 z-20 md:right-[calc(50%-20rem)] pointer-events-none">
                <div className="max-w-xl mx-auto w-full relative h-0 pointer-events-auto">
                    <button className="absolute bottom-0 right-0 flex items-center justify-center size-14 rounded-full bg-text-main dark:bg-primary shadow-xl hover:scale-105 active:scale-95 transition-transform group text-white">
                        <span className="material-icons-outlined text-3xl font-light">add</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
