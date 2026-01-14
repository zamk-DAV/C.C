import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { format, parseISO, isValid, getWeek, getYear, getMonth } from 'date-fns';

import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { deleteAppItem } from '../services/firestore';
import type { AppItem } from '../types';
import { useAuth } from '../context/AuthContext';
import { useDiaryData } from '../context/DataContext';
import FeedWriteModal from '../components/home/FeedWriteModal';
import { DiaryDetailModal } from '../components/diary/DiaryDetailModal';

export const DiaryPage: React.FC = () => {
    const { user, userData, partnerData, coupleData } = useAuth();
    const { diaryData, hasMore: hasMoreDiary, loadMore: loadMoreDiary, refreshData, isLoading } = useDiaryData();

    const [filter, setFilter] = useState<'all' | 'me' | 'partner'>('all');
    const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);

    // Edit & UX States
    const [editingItem, setEditingItem] = useState<AppItem | null>(null);
    const [selectedItem, setSelectedItem] = useState<AppItem | null>(null);
    const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

    // Display author name with priority: partnerNickname > partnerData.name > "상대방"
    const displayAuthorName = useCallback((item: AppItem): string => {
        // Check filtering prioritization: UID > Name
        const isMe = (item.authorId && item.authorId === user?.uid) ||
            (!item.authorId && (item.author === '나' || item.author === userData?.name));

        if (isMe) {
            return userData?.name || '나';
        } else {
            // Partner's entry
            return userData?.partnerNickname || partnerData?.name || '상대방';
        }
    }, [userData, partnerData, user?.uid]);

    // Real-time Sync Trigger & Last Checked Update
    useEffect(() => {
        if (user && userData?.coupleId) {
            const userRef = doc(db, 'users', user.uid);
            updateDoc(userRef, { lastCheckedDiary: serverTimestamp() }).catch(console.error);
        }
    }, [userData?.coupleId, user]);

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!window.confirm("정말 이 추억을 삭제하시겠습니까? (Notion에서 아카이브됩니다)")) return;

        if (!coupleData) return;

        try {
            await deleteAppItem(coupleData.id, 'diaries', id);
        } catch (error) {
            console.error("Delete failed:", error);
            alert("삭제에 실패했습니다.");
            refreshData(); // Restore state/clear flags on failure
        }
    };

    const handleEdit = (item: AppItem, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingItem(item);
        setIsWriteModalOpen(true);
    };

    const handleCreateSuccess = () => {
        refreshData();
        setIsWriteModalOpen(false);
        setEditingItem(null);
    };

    const toggleSection = (key: string) => {
        setCollapsedSections(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    // Group items by week with month info
    const groupedItems = useMemo(() => {
        const sorted = [...diaryData].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const groups: { [key: string]: { items: AppItem[], displayKey: string } } = {};

        sorted.forEach(item => {
            if (!item.date) {
                console.warn("[DiaryGroup] Missing date for item:", item.id);
                return;
            }
            const date = parseISO(item.date);
            if (!isValid(date)) {
                console.warn("[DiaryGroup] Invalid date for item:", item.id, item.date);
                return;
            }

            const year = getYear(date);
            const month = getMonth(date) + 1;
            const week = getWeek(date, { weekStartsOn: 0 });

            const firstDayOfMonth = new Date(year, month - 1, 1);
            const weekOfMonth = Math.ceil((date.getDate() + firstDayOfMonth.getDay()) / 7);

            const sortKey = `${year}-${String(month).padStart(2, '0')}-W${week}`;
            const displayKey = `${year}. ${String(month).padStart(2, '0')} Week ${weekOfMonth}`;

            if (!groups[sortKey]) groups[sortKey] = { items: [], displayKey };

            // Improved Filtering Logic: UID > Name
            const isMe = (item.authorId && item.authorId === user?.uid) ||
                (!item.authorId && (item.author === '나' || item.author === userData?.name));

            if (filter === 'all') groups[sortKey].items.push(item);
            else if (filter === 'me' && isMe) groups[sortKey].items.push(item);
            else if (filter === 'partner' && !isMe) groups[sortKey].items.push(item);
        });

        // Filtering out items marked for optimistic deletion
        Object.keys(groups).forEach(key => {
            groups[key].items = groups[key].items.filter(item => !item.isOptimisticDelete);
            if (groups[key].items.length === 0) delete groups[key];
        });

        return groups;
    }, [filter, diaryData, userData, user?.uid]);



    if (isLoading && diaryData.length === 0) {
        return <div className="min-h-screen flex items-center justify-center bg-background text-text-secondary">Loading...</div>;
    }

    return (
        <div className="bg-background text-primary font-display antialiased pb-28 min-h-screen">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border transition-colors duration-300">
                <div className="max-w-md mx-auto px-5 h-14 flex items-center justify-center">
                    <h1 className="text-xl font-bold tracking-tight">일기장</h1>
                </div>

                {/* Filter Tabs - Improved Contrast */}
                <div className="max-w-md mx-auto px-5 pb-4">
                    <div className="flex space-x-1 p-1 bg-secondary rounded-lg">
                        {['all', 'me', 'partner'].map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f as any)}
                                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all duration-200 ${filter === f
                                    ? 'bg-primary text-background shadow-md transform scale-[1.02]'
                                    : 'text-text-secondary hover:text-primary hover:bg-background/50'
                                    }`}
                            >
                                {f === 'all' ? '전체' : f === 'me' ? '나' : '상대방'}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-md mx-auto px-5 pt-6 space-y-10">
                {Object.entries(groupedItems).map(([sortKey, { items: weekItems, displayKey }]) => {
                    const isCollapsed = collapsedSections[sortKey];

                    return (
                        <section key={sortKey} className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                            {/* Week Header - Elegant Serif Style */}
                            <div
                                onClick={() => toggleSection(sortKey)}
                                className="flex items-center gap-3 mb-6 group cursor-pointer select-none pl-1"
                            >
                                <h2 className="text-lg font-serif italic text-primary/80 group-hover:text-primary transition-colors">
                                    {displayKey}
                                </h2>
                                <div className="h-[1px] bg-border flex-grow opacity-60 group-hover:opacity-100 transition-opacity"></div>
                                <span className={`material-symbols-outlined text-text-secondary text-lg transition-transform duration-300 ${isCollapsed ? 'rotate-180' : 'rotate-0'}`}>
                                    expand_more
                                </span>
                            </div>

                            {/* Diary Grid - Polaroid Style */}
                            <div className={`grid grid-cols-2 gap-x-5 gap-y-10 transition-all duration-500 ease-in-out ${isCollapsed ? 'hidden' : 'grid'}`}>
                                {weekItems.map((item, index) => {
                                    const coverImage = item.coverImage || (item.images && item.images.length > 0 ? item.images[0] : null);

                                    return (
                                        <article
                                            key={item.id}
                                            className="group cursor-pointer relative flex flex-col items-center"
                                            onClick={() => setSelectedItem(item)}
                                            style={{ animationDelay: `${index * 50}ms` }}
                                        >
                                            {/* Photo Frame */}
                                            <div className="relative w-full aspect-[4/5] bg-background p-3 pb-8 shadow-[0_2px_8px_rgba(0,0,0,0.08)] group-hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] group-hover:-translate-y-1 transition-all duration-300 border border-border/40 rotate-[0.5deg] group-hover:rotate-0">

                                                {/* Image Area */}
                                                <div className="w-full h-full relative overflow-hidden bg-secondary/30">
                                                    {coverImage ? (
                                                        <div
                                                            className="w-full h-full bg-cover bg-center transition-transform duration-700 group-hover:scale-105 filter grayscale-[20%] group-hover:grayscale-0"
                                                            style={{ backgroundImage: `url('${coverImage}')` }}
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex flex-col items-center justify-center text-text-secondary/40 gap-2">
                                                            <span className="material-symbols-outlined text-3xl font-light">edit_note</span>
                                                            <span className="text-[10px] font-serif tracking-widest uppercase">No Photo</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Date on Polaroid Bottom */}
                                                <div className="absolute bottom-2 right-3 left-3 flex justify-end">
                                                    <time className="text-[10px] font-serif text-text-secondary/80 italic tracking-wide">
                                                        {format(parseISO(item.date), 'MM.dd.yyyy')}
                                                    </time>
                                                </div>

                                                {/* Actions Overlay */}
                                                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                                                    <button
                                                        onClick={(e) => handleEdit(item, e)}
                                                        className="bg-white/90 p-1.5 rounded-full text-primary hover:text-accent-color shadow-sm transition-colors"
                                                    >
                                                        <span className="material-symbols-outlined text-[14px]">edit</span>
                                                    </button>
                                                    <button
                                                        onClick={(e) => handleDelete(item.id, e)}
                                                        className="bg-white/90 p-1.5 rounded-full text-danger hover:bg-danger hover:text-white shadow-sm transition-colors"
                                                    >
                                                        <span className="material-symbols-outlined text-[14px]">delete</span>
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Title Below Polaroid */}
                                            <div className="mt-3 text-center px-1">
                                                <h3 className="text-sm font-medium text-primary/90 line-clamp-1 font-serif">
                                                    {item.title || '기록'}
                                                </h3>
                                                <div className="flex items-center justify-center gap-1 mt-1">
                                                    {item.weather && (
                                                        <span className="text-[10px] text-text-secondary">{item.weather}</span>
                                                    )}
                                                    {item.mood && (
                                                        <span className="text-[10px] text-text-secondary">• {item.mood}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        </section>
                    );
                })}

                {/* Load More */}
                {hasMoreDiary && (
                    <div className="flex justify-center py-6">
                        <button
                            onClick={() => loadMoreDiary()}
                            disabled={isLoading}
                            className="text-xs font-medium text-text-secondary hover:text-primary transition-colors"
                        >
                            {isLoading ? '불러오는 중...' : '더 보기'}
                        </button>
                    </div>
                )}
            </main>

            {/* Floating Action Button */}
            <button
                onClick={() => {
                    setEditingItem(null); // Clear editing state for new entry
                    setIsWriteModalOpen(true);
                }}
                className="fixed bottom-24 right-6 size-14 bg-primary text-background rounded-full shadow-xl flex items-center justify-center transition-transform hover:scale-110 active:scale-95 z-10"
            >
                <span className="material-symbols-outlined text-2xl">add</span>
            </button>

            {/* Write Modal */}
            <FeedWriteModal
                isOpen={isWriteModalOpen}
                onClose={() => {
                    setIsWriteModalOpen(false);
                    setEditingItem(null);
                }}
                type="Diary"
                onSuccess={handleCreateSuccess}
                initialData={editingItem ? {
                    id: editingItem.id,
                    title: editingItem.title,
                    content: editingItem.previewText, // Use previewText as content
                    images: editingItem.images || (editingItem.coverImage ? [editingItem.coverImage] : []),
                    date: editingItem.date,
                    mood: editingItem.mood,
                    weather: editingItem.weather
                } : null}
            />

            {/* Diary Detail Modal */}
            <DiaryDetailModal
                isOpen={!!selectedItem}
                onClose={() => setSelectedItem(null)}
                item={selectedItem}
                authorName={selectedItem ? displayAuthorName(selectedItem) : ''}
            />
        </div>
    );
};
