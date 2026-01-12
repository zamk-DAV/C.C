import React, { useState, useEffect } from 'react';
import { format, parseISO, isValid } from 'date-fns';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { fetchNotionData, deleteDiaryEntry, type NotionItem } from '../lib/notion';
import { useAuth } from '../context/AuthContext';
import FeedWriteModal from '../components/home/FeedWriteModal'; // Assuming we can reuse this or import it

export const DiaryPage: React.FC = () => {
    const { userData } = useAuth();
    const [items, setItems] = useState<NotionItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [hasMore, setHasMore] = useState(false);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);

    // Initial Load
    useEffect(() => {
        if (userData?.notionConfig?.apiKey && userData?.notionConfig?.databaseId) {
            loadDiary();
        } else {
            setLoading(false);
        }
    }, [userData?.notionConfig]);

    // Real-time Sync Trigger
    useEffect(() => {
        if (userData?.coupleId) {
            const coupleRef = doc(db, 'couples', userData.coupleId);
            const unsubscribe = onSnapshot(coupleRef, (docSnap) => {
                // If timestamp changes, reload
                // For now, just reload on any change or specifically if 'lastUpdate' field exists
                // We'll simplisticly reload if we already have data to avoid double fetch on mount
                if (docSnap.exists() && !loading && items.length > 0) {
                    loadDiary();
                }
            });
            return () => unsubscribe();
        }
    }, [userData?.coupleId, loading]);

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
        e.stopPropagation(); // Prevent card click
        if (!window.confirm("정말 이 추억을 삭제하시겠습니까? (Notion에서 아카이브됩니다)")) return;

        // Optimistic update
        const oldItems = [...items];
        setItems(prev => prev.filter(i => i.id !== id));

        try {
            await deleteDiaryEntry(id);
        } catch (error) {
            console.error("Delete failed:", error);
            alert("삭제에 실패했습니다.");
            setItems(oldItems); // Revert
        }
    };

    const handleEdit = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        console.log("Edit requested for:", id);
        alert("수정 기능은 준비 중입니다!");
    };

    const handleCreateSuccess = () => {
        loadDiary();
        setIsWriteModalOpen(false);
    };

    // Sort by Date Descending
    const sortedItems = [...items].sort((a, b) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    if (loading && items.length === 0) {
        return <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark text-text-muted">Loading...</div>;
    }

    return (
        <div className="bg-background-light dark:bg-background-dark font-display text-text-main dark:text-white antialiased min-h-screen flex flex-col pb-24">
            {/* Header Area */}
            <header className="bg-background-light dark:bg-background-dark pt-12 pb-2 px-6 sticky top-0 z-10">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-bold tracking-tight uppercase font-display">Archive / Diary</h1>
                    {/* Menu Icon */}
                    <button className="text-text-main dark:text-white p-2 -mr-2 rounded-full hover:bg-surface-light dark:hover:bg-surface-dark transition-colors">
                        <span className="material-symbols-outlined text-3xl">drag_handle</span>
                    </button>
                </div>
                {/* Minimalist Filters */}
                <div className="flex gap-8 border-b border-gray-100 dark:border-gray-800 pb-4">
                    <button className="relative group">
                        <span className="text-sm font-bold text-text-main dark:text-white">전체</span>
                        <span className="absolute -bottom-4 left-0 w-full h-0.5 bg-text-main dark:bg-white"></span>
                    </button>
                    {/* Placeholder Filters */}
                    <button className="relative group opacity-50 cursor-not-allowed">
                        <span className="text-sm font-medium text-text-muted">나</span>
                    </button>
                    <button className="relative group opacity-50 cursor-not-allowed">
                        <span className="text-sm font-medium text-text-muted">상대방</span>
                    </button>
                </div>
            </header>

            {/* Main Scrollable Content */}
            <main className="flex-1 overflow-y-auto no-scrollbar px-6">
                <div className="h-6"></div>

                {sortedItems.map((item) => {
                    const date = parseISO(item.date);
                    const dateStr = isValid(date) ? format(date, 'MM.dd') : '--.--';
                    const hasImage = item.images && item.images.length > 0;
                    const coverImage = hasImage ? item.images![0] : null;

                    // Mixed Layout: Visual Card if image exists, Text Row otherwise
                    if (hasImage && coverImage) {
                        return (
                            <div key={item.id} className="py-8">
                                <div className="relative w-full aspect-[4/5] rounded-2xl overflow-hidden shadow-sm group">
                                    {/* Image with B&W Filter */}
                                    <div
                                        className="absolute inset-0 bg-cover bg-center transition-all duration-500 hover:grayscale-0 active:grayscale-0 grayscale"
                                        style={{ backgroundImage: `url('${coverImage}')` }}
                                    ></div>

                                    {/* Overlay Gradient */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none"></div>

                                    {/* Action Buttons (Edit/Delete) - Absolute Top Right */}
                                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                        <button
                                            onClick={(e) => handleEdit(item.id, e)}
                                            className="p-2 bg-black/40 backdrop-blur-md rounded-full text-white hover:bg-black/60 transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">edit</span>
                                        </button>
                                        <button
                                            onClick={(e) => handleDelete(item.id, e)}
                                            className="p-2 bg-black/40 backdrop-blur-md rounded-full text-red-300 hover:bg-black/60 transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">delete</span>
                                        </button>
                                    </div>

                                    {/* Content Overlay */}
                                    <div className="absolute bottom-0 left-0 w-full p-6 text-white flex flex-col items-start pointer-events-none">
                                        <div className="text-xs font-bold tracking-widest mb-2 opacity-80 font-display">{dateStr}</div>
                                        <h2 className="font-serif text-3xl font-normal leading-snug mb-4">{item.title}</h2>

                                        <div className="flex items-center gap-4 text-white/80">
                                            {/* Mock Stats */}
                                            <div className="flex items-center gap-1">
                                                <span className="material-symbols-outlined text-[18px]">favorite</span>
                                                <span className="text-xs font-medium">0</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    } else {
                        // Text Entry
                        return (
                            <div key={item.id} className="group flex items-baseline justify-between py-5 border-b border-dashed border-gray-200 dark:border-gray-800 relative hover:bg-surface-light dark:hover:bg-surface-dark/10 transition-colors -mx-2 px-2 rounded-lg">
                                <div className="text-sm font-bold text-text-main dark:text-white w-16 shrink-0 font-display">{dateStr}</div>
                                <div className="flex flex-col items-end flex-1 gap-1 min-w-0">
                                    <h3 className="font-serif text-xl text-text-main dark:text-white leading-tight text-right truncate w-full">
                                        {item.title}
                                    </h3>

                                    {/* Action Buttons (Edit/Delete) - Reveal on Hover */}
                                    <div className="flex items-center gap-3 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => handleEdit(item.id, e)}
                                            className="text-text-muted hover:text-text-main transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-[16px]">edit</span>
                                        </button>
                                        <button
                                            onClick={(e) => handleDelete(item.id, e)}
                                            className="text-text-muted hover:text-red-500 transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-[16px]">delete</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    }
                })}

                {hasMore && (
                    <div className="flex justify-center py-6">
                        <button
                            onClick={() => loadDiary(true)}
                            disabled={loading}
                            className="bg-white dark:bg-gray-800 text-text-main dark:text-white px-6 py-2 rounded-full shadow-sm hover:shadow-md transition-shadow font-display text-sm font-medium disabled:opacity-50"
                        >
                            {loading ? 'Loading...' : 'Load More'}
                        </button>
                    </div>
                )}

                <div className="h-10"></div>
            </main>

            {/* Floating Action Button */}
            <div className="fixed bottom-24 right-6 z-20">
                <button
                    onClick={() => setIsWriteModalOpen(true)}
                    className="flex items-center justify-center size-14 rounded-full bg-text-main dark:bg-primary shadow-xl hover:scale-105 active:scale-95 transition-transform group text-white"
                >
                    <span className="material-symbols-outlined text-3xl font-light">add</span>
                </button>
            </div>

            {/* Write Modal - Using existing component if possible */}
            <FeedWriteModal
                isOpen={isWriteModalOpen}
                onClose={() => setIsWriteModalOpen(false)}
                onSuccess={handleCreateSuccess}
            />
        </div>
    );
};
