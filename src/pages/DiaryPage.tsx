import React, { useState, useEffect, useMemo } from 'react';
import { format, parseISO, isValid, getWeek, getYear } from 'date-fns';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { fetchNotionData, deleteDiaryEntry, type NotionItem } from '../lib/notion';
import { useAuth } from '../context/AuthContext';
import FeedWriteModal from '../components/home/FeedWriteModal';

export const DiaryPage: React.FC = () => {
    const { user, userData } = useAuth();
    const [filter, setFilter] = useState<'all' | 'me' | 'partner'>('all');
    const [items, setItems] = useState<NotionItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);
    // Pagination state
    const [hasMore, setHasMore] = useState(false);
    const [nextCursor, setNextCursor] = useState<string | null>(null);

    // Initial Load - Depend on primitives to avoid object reference loops
    useEffect(() => {
        if (userData?.notionConfig?.apiKey && userData?.notionConfig?.databaseId) {
            loadDiary();
        } else {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userData?.notionConfig?.apiKey, userData?.notionConfig?.databaseId]);

    // Real-time Sync Trigger & Last Checked Update
    useEffect(() => {
        if (user && userData?.coupleId) {
            const userRef = doc(db, 'users', user.uid);
            // Only update timestamp once on mount/coupleId change
            updateDoc(userRef, { lastCheckedDiary: serverTimestamp() }).catch(console.error);
            // Removed: onSnapshot auto-reload to prevent feedback loop
        }
    }, [userData?.coupleId, user?.uid]);

    const loadDiary = async (isLoadMore = false) => {
        try {
            setLoading(true);
            const cursor = isLoadMore ? (nextCursor || undefined) : undefined;
            const result = await fetchNotionData('Diary', cursor);

            if (isLoadMore) {
                setItems(prev => [...prev, ...result.data]);
            } else {
                setItems(result.data);
            }
            setHasMore(result.hasMore);
            setNextCursor(result.nextCursor);
        } catch (error) {
            console.error("Failed to load diary:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!window.confirm("정말 이 추억을 삭제하시겠습니까? (Notion에서 아카이브됩니다)")) return;

        const oldItems = [...items];
        setItems(prev => prev.filter(i => i.id !== id));

        try {
            await deleteDiaryEntry(id);
        } catch (error) {
            console.error("Delete failed:", error);
            alert("삭제에 실패했습니다.");
            setItems(oldItems);
        }
    };

    const handleCreateSuccess = () => {
        loadDiary();
        setIsWriteModalOpen(false);
    };

    // Group items by week
    const groupedItems = useMemo(() => {
        const sorted = [...items].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const groups: { [key: string]: NotionItem[] } = {};

        sorted.forEach(item => {
            if (!item.date) return;
            const date = parseISO(item.date);
            if (!isValid(date)) return;

            const year = getYear(date);
            const week = getWeek(date);
            const key = `${year} Week ${week}`;

            if (!groups[key]) groups[key] = [];

            // Filter Logic (Client-side for now)
            // Assuming we determine 'me' vs 'partner' via author field
            const isMe = item.author === '나' || item.author === userData?.name; // Improve check

            if (filter === 'all') groups[key].push(item);
            else if (filter === 'me' && isMe) groups[key].push(item);
            else if (filter === 'partner' && !isMe) groups[key].push(item);
        });

        // Remove empty groups
        Object.keys(groups).forEach(key => {
            if (groups[key].length === 0) delete groups[key];
        });

        return groups;
    }, [filter, items, userData]);

    if (loading && items.length === 0) {
        return <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark text-text-muted">Loading...</div>;
    }

    return (
        <div className="bg-background-light dark:bg-background-dark text-text-main dark:text-white font-sans antialiased pb-28 min-h-screen">
            <header className="sticky top-0 z-50 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 transition-colors duration-300">
                <div className="max-w-md mx-auto px-5 h-14 flex items-center justify-between">
                    <h1 className="text-xl font-bold tracking-tight text-black dark:text-white">일기장</h1>
                    <div className="flex items-center space-x-3">
                        <button
                            className="p-2 -mr-2 text-gray-400 hover:text-black dark:hover:text-white transition-colors"
                            onClick={() => setIsWriteModalOpen(true)}
                        >
                            <span className="material-symbols-outlined text-2xl">add</span>
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

            <main className="max-w-md mx-auto px-5 pt-6 space-y-10">
                {Object.entries(groupedItems).map(([weekKey, weekItems]) => (
                    <section key={weekKey}>
                        <div className="flex items-center space-x-2 mb-4 group cursor-pointer select-none">
                            <div className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                <span className="material-symbols-outlined text-gray-400 dark:text-gray-500 text-sm transform transition-transform group-hover:text-gray-600 dark:group-hover:text-gray-300 rotate-90">play_arrow</span>
                            </div>
                            <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">{weekKey}</h2>
                            <div className="h-px bg-gray-100 dark:bg-zinc-800 flex-grow ml-2"></div>
                        </div>

                        <div className="grid grid-cols-2 gap-x-4 gap-y-8">
                            {weekItems.map((item) => {
                                const date = parseISO(item.date);
                                const hasImage = item.images && item.images.length > 0;
                                const coverImage = hasImage ? item.images![0] : null;

                                return (
                                    <article key={item.id} className="flex flex-col group cursor-pointer relative" onClick={() => {/* Open Detail? */ }}>
                                        <div className="relative w-full aspect-square mb-3 overflow-hidden rounded-lg bg-gray-50 dark:bg-zinc-800 border border-transparent dark:border-zinc-700">
                                            {coverImage ? (
                                                <div
                                                    className="w-full h-full bg-cover bg-center transition-all duration-500 grayscale group-hover:grayscale-0 group-active:grayscale-0"
                                                    style={{ backgroundImage: `url('${coverImage}')` }}
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-zinc-800 text-gray-300">
                                                    <span className="material-symbols-outlined text-4xl">image</span>
                                                </div>
                                            )}

                                            {/* Trash Icon for Deletion (Hover only) */}
                                            <button
                                                onClick={(e) => handleDelete(item.id, e)}
                                                className="absolute top-2 right-2 bg-black/50 p-1.5 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80"
                                            >
                                                <span className="material-symbols-outlined text-[14px]">delete</span>
                                            </button>
                                        </div>

                                        <div className="space-y-1.5 px-0.5">
                                            <div className="flex items-center justify-between">
                                                <time className="text-[11px] font-bold text-black dark:text-white uppercase tracking-wide">
                                                    {isValid(date) ? format(date, 'yyyy년 M월 d일') : item.date}
                                                </time>
                                                {/* Dot indicator, maybe for author? */}
                                                <span className={`w-1.5 h-1.5 rounded-full opacity-50 ${item.author === 'Me' ? 'bg-blue-500' : 'bg-red-500'}`}></span>
                                            </div>
                                            <p className="text-[13px] text-gray-600 dark:text-gray-400 font-serif leading-snug line-clamp-2">
                                                {item.title || item.previewText}
                                            </p>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    </section>
                ))}

                {hasMore && (
                    <div className="flex justify-center py-6">
                        <button
                            onClick={() => loadDiary(true)}
                            disabled={loading}
                            className="text-xs font-medium text-gray-400 hover:text-black dark:hover:text-white transition-colors"
                        >
                            {loading ? '불러오는 중...' : '더 보기'}
                        </button>
                    </div>
                )}
            </main>

            {isWriteModalOpen && (
                <FeedWriteModal
                    isOpen={isWriteModalOpen}
                    onClose={() => setIsWriteModalOpen(false)}
                    onSuccess={handleCreateSuccess}
                />
            )}
        </div>
    );
};
