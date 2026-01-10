import React, { useState, useMemo, useEffect } from 'react';
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

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-background text-primary">Loading...</div>;

    return (
        <div className="bg-background text-primary font-sans antialiased min-h-screen transition-colors duration-300">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border transition-colors duration-300">
                <div className="max-w-md mx-auto px-5 h-14 flex items-center justify-between">
                    <h1 className="text-xl font-bold tracking-tight text-primary">일기장</h1>
                    <div className="flex items-center space-x-3">
                        <button className="p-2 -mr-2 text-text-secondary hover:text-primary transition-colors">
                            <span className="material-icons-outlined text-2xl">search</span>
                        </button>
                    </div>
                </div>
                <div className="max-w-md mx-auto px-5 pb-4">
                    <div className="flex space-x-1 p-1 bg-secondary rounded-lg">
                        <button
                            onClick={() => setFilter('all')}
                            className={`flex-1 py-1.5 text-xs font-semibold rounded-[4px] shadow-sm transition-all ${filter === 'all' ? 'bg-background text-primary border border-border' : 'text-text-secondary hover:text-primary'}`}
                        >
                            전체
                        </button>
                        <button
                            onClick={() => setFilter('me')}
                            className={`flex-1 py-1.5 text-xs font-medium rounded-[4px] transition-all ${filter === 'me' ? 'bg-background text-primary border border-border' : 'text-text-secondary hover:text-primary'}`}
                        >
                            나
                        </button>
                        <button
                            onClick={() => setFilter('partner')}
                            className={`flex-1 py-1.5 text-xs font-medium rounded-[4px] transition-all ${filter === 'partner' ? 'bg-background text-primary border border-border' : 'text-text-secondary hover:text-primary'}`}
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
                            <div className="w-5 h-5 flex items-center justify-center rounded hover:bg-secondary transition-colors">
                                <span className="material-icons-round text-text-secondary text-sm transform transition-transform group-hover:text-primary rotate-90">play_arrow</span>
                            </div>
                            <h2 className="text-xs font-semibold text-text-secondary uppercase tracking-widest">{week}</h2>
                            <div className="h-px bg-border flex-grow ml-2"></div>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-8">
                            {items.map(item => (
                                <article key={item.id} className="flex flex-col group cursor-pointer relative">
                                    <div className="relative w-full aspect-square mb-3 overflow-hidden rounded-lg bg-secondary border border-transparent">
                                        {item.images?.[0] ? (
                                            <img alt={item.title} className="w-full h-full object-cover bw-filter" src={item.images[0]} />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-secondary text-text-secondary/50">
                                                <span className="material-icons-outlined text-4xl">image</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-1.5 px-0.5">
                                        <div className="flex items-center justify-between">
                                            <time className="text-[11px] font-bold text-primary uppercase tracking-wide">
                                                {format(parseISO(item.date), 'yyyy년 M월 d일')}
                                            </time>
                                            <span className="w-1.5 h-1.5 rounded-full bg-primary opacity-20"></span>
                                        </div>
                                        <p className="text-[13px] text-text-secondary font-serif leading-snug line-clamp-2">
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
