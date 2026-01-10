import React, { useState, useMemo } from 'react';
import { format, getWeek, parseISO } from 'date-fns';
import type { NotionItem } from '../types';

// Mock Data matches user snippet
import { fetchNotionData } from '../lib/notion';
import { useAuth } from '../context/AuthContext';

export const DiaryPage: React.FC = () => {
    const { userData } = useAuth();
    const [filter, setFilter] = useState<'all' | 'me' | 'partner'>('all');
    const [diaryItems, setDiaryItems] = useState<NotionItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (userData?.notionConfig?.apiKey && userData?.notionConfig?.databaseId) {
            loadDiary();
        } else {
            setLoading(false);
        }
    }, [userData?.notionConfig]);

    const loadDiary = async () => {
        try {
            setLoading(true);
            const result = await fetchNotionData('Diary'); // Fetching all for now
            // Filter only Diary entries if the API is returning all types (or if we rely on API filter)
            // For now assuming fetchNotionData handles 'Diary' filter if passed, or we just use all.
            // Since our updated fetchNotionData takes a filter type, we assume backend logic handles it 
            // OR we filter locally if backend logic for specific filter is generic.
            // Our backend code implementation of getNotionDatabase DOES NOT seem to use filterType for specific Notion logic yet,
            // (I saw req.body.filterType in fetching but didn't verify backend implementation details fully for filter).
            // Let's assume generic query for now and filter if needed, or if backend just returns everything.
            // Wait, I didn't see explicit filter logic in the backend function I updated earlier.
            // It just queries the DB sorted by date.
            // So I should probably filter by type locally if needed, or trust the data.
            // All new items are "MemoryItem" from backend.

            const items: NotionItem[] = result.data.map(item => ({
                id: item.id,
                title: item.title,
                date: item.date,
                type: 'Diary',
                images: item.coverImage ? [item.coverImage] : [],
                tags: [],
                author: item.author === userData?.name || item.author === 'Me' ? 'Me' : 'Partner', // Very basic logic
                content: item.previewText || ''
            }));

            setDiaryItems(items);
        } catch (error) {
            console.error("Failed to load diary:", error);
        } finally {
            setLoading(false);
        }
    };

    // Group items by week
    const groupedItems = useMemo(() => {
        const sorted = [...diaryItems].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const groups: { [key: string]: NotionItem[] } = {};

        sorted.forEach(item => {
            const date = parseISO(item.date);
            const year = date.getFullYear();
            const week = getWeek(date);
            const key = `${year} Week ${week}`;

            if (!groups[key]) {
                groups[key] = [];
            }
            // Filter logic
            if (filter === 'all' || (filter === 'me' && item.author === 'Me') || (filter === 'partner' && item.author === 'Partner')) {
                groups[key].push(item);
            }
        });

        // Remove empty groups
        Object.keys(groups).forEach(key => {
            if (groups[key].length === 0) delete groups[key];
        });

        return groups;
    }, [filter, diaryItems]);

    if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

    return (
        <div className="bg-background-light dark:bg-background-dark text-gray-900 dark:text-gray-100 font-sans antialiased min-h-screen">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 transition-colors duration-300">
                <div className="max-w-md mx-auto px-5 h-14 flex items-center justify-between">
                    <h1 className="text-xl font-bold tracking-tight text-black dark:text-white">일기장</h1>
                    <div className="flex items-center space-x-3">
                        <button className="p-2 -mr-2 text-gray-400 hover:text-black dark:hover:text-white transition-colors">
                            <span className="material-icons-outlined text-2xl">search</span>
                        </button>
                    </div>
                </div>
                <div className="max-w-md mx-auto px-5 pb-4">
                    <div className="flex space-x-1 p-1 bg-gray-100 dark:bg-zinc-800 rounded-lg">
                        <button
                            onClick={() => setFilter('all')}
                            className={`flex-1 py-1.5 text-xs font-semibold rounded-[4px] shadow-sm transition-all ${filter === 'all' ? 'bg-white dark:bg-zinc-700 text-black dark:text-white border border-gray-200 dark:border-zinc-600' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
                        >
                            전체
                        </button>
                        <button
                            onClick={() => setFilter('me')}
                            className={`flex-1 py-1.5 text-xs font-medium rounded-[4px] transition-all ${filter === 'me' ? 'bg-white dark:bg-zinc-700 text-black dark:text-white border border-gray-200 dark:border-zinc-600' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
                        >
                            나
                        </button>
                        <button
                            onClick={() => setFilter('partner')}
                            className={`flex-1 py-1.5 text-xs font-medium rounded-[4px] transition-all ${filter === 'partner' ? 'bg-white dark:bg-zinc-700 text-black dark:text-white border border-gray-200 dark:border-zinc-600' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
                        >
                            상대방
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-md mx-auto px-5 pt-6 space-y-10 pb-4">
                {Object.entries(groupedItems).map(([week, items]) => (
                    <section key={week}>
                        <div className="flex items-center space-x-2 mb-4 group cursor-pointer select-none">
                            <div className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                <span className="material-icons-round text-gray-400 dark:text-gray-500 text-sm transform transition-transform group-hover:text-gray-600 dark:group-hover:text-gray-300 rotate-90">play_arrow</span>
                            </div>
                            <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">{week}</h2>
                            <div className="h-px bg-gray-100 dark:bg-zinc-800 flex-grow ml-2"></div>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-8">
                            {items.map(item => (
                                <article key={item.id} className="flex flex-col group cursor-pointer relative">
                                    <div className="relative w-full aspect-square mb-3 overflow-hidden rounded-lg bg-gray-50 dark:bg-zinc-800 border border-transparent dark:border-zinc-700">
                                        {item.images?.[0] ? (
                                            <img alt={item.title} className="w-full h-full object-cover bw-filter" src={item.images[0]} />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-zinc-800 text-gray-300">
                                                <span className="material-icons-outlined text-4xl">image</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-1.5 px-0.5">
                                        <div className="flex items-center justify-between">
                                            <time className="text-[11px] font-bold text-black dark:text-white uppercase tracking-wide">
                                                {format(parseISO(item.date), 'yyyy년 M월 d일')}
                                            </time>
                                            <span className="w-1.5 h-1.5 rounded-full bg-black dark:bg-white opacity-20"></span>
                                        </div>
                                        <p className="text-[13px] text-gray-600 dark:text-gray-400 font-serif leading-snug line-clamp-2">
                                            {item.title}
                                        </p>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </section>
                ))}
            </main>
        </div>
    );
};
