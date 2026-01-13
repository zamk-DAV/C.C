import React, { useState, useEffect, useMemo } from 'react';
import { format, parseISO, isValid, getWeek, getYear, getMonth } from 'date-fns';
import { ko } from 'date-fns/locale';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { deleteDiaryEntry, type NotionItem } from '../lib/notion';
import { useAuth } from '../context/AuthContext';
import { useNotion } from '../context/NotionContext';
import FeedWriteModal from '../components/home/FeedWriteModal';

export const DiaryPage: React.FC = () => {
    const { user, userData } = useAuth();
    const { diaryData, hasMoreDiary, loadMoreDiary, refreshData, isLoading } = useNotion();

    const [filter, setFilter] = useState<'all' | 'me' | 'partner'>('all');
    const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);

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

        try {
            await deleteDiaryEntry(id);
            refreshData();
        } catch (error) {
            console.error("Delete failed:", error);
            alert("삭제에 실패했습니다.");
        }
    };

    const handleCreateSuccess = () => {
        refreshData();
        setIsWriteModalOpen(false);
    };

    // Group items by week with month info
    const groupedItems = useMemo(() => {
        const sorted = [...diaryData].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const groups: { [key: string]: { items: NotionItem[], displayKey: string } } = {};

        sorted.forEach(item => {
            if (!item.date) return;
            const date = parseISO(item.date);
            if (!isValid(date)) return;

            const year = getYear(date);
            const month = getMonth(date) + 1; // 0-indexed
            const week = getWeek(date, { weekStartsOn: 0 });

            // Calculate week of month (1-4)
            const firstDayOfMonth = new Date(year, month - 1, 1);
            const weekOfMonth = Math.ceil((date.getDate() + firstDayOfMonth.getDay()) / 7);

            const sortKey = `${year}-${String(month).padStart(2, '0')}-W${week}`;
            const displayKey = `${year}.${String(month).padStart(2, '0')} Week ${weekOfMonth}`;

            if (!groups[sortKey]) groups[sortKey] = { items: [], displayKey };

            const isMe = item.author === '나' || item.author === userData?.name;

            if (filter === 'all') groups[sortKey].items.push(item);
            else if (filter === 'me' && isMe) groups[sortKey].items.push(item);
            else if (filter === 'partner' && !isMe) groups[sortKey].items.push(item);
        });

        // Remove empty groups
        Object.keys(groups).forEach(key => {
            if (groups[key].items.length === 0) delete groups[key];
        });

        return groups;
    }, [filter, diaryData, userData]);

    // Format date with day of week
    const formatDateWithDay = (dateStr: string) => {
        try {
            const date = parseISO(dateStr);
            if (!isValid(date)) return dateStr;
            return format(date, 'yyyy년 M월 d일 (EEEE)', { locale: ko });
        } catch {
            return dateStr;
        }
    };

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

                {/* Filter Tabs */}
                <div className="max-w-md mx-auto px-5 pb-4">
                    <div className="flex space-x-1 p-1 bg-secondary rounded-lg">
                        <button
                            onClick={() => setFilter('all')}
                            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${filter === 'all'
                                    ? 'bg-background text-primary shadow-sm'
                                    : 'text-text-secondary hover:text-primary'
                                }`}
                        >
                            전체
                        </button>
                        <button
                            onClick={() => setFilter('me')}
                            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${filter === 'me'
                                    ? 'bg-background text-primary shadow-sm'
                                    : 'text-text-secondary hover:text-primary'
                                }`}
                        >
                            나
                        </button>
                        <button
                            onClick={() => setFilter('partner')}
                            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${filter === 'partner'
                                    ? 'bg-background text-primary shadow-sm'
                                    : 'text-text-secondary hover:text-primary'
                                }`}
                        >
                            상대방
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-md mx-auto px-5 pt-6 space-y-10">
                {Object.entries(groupedItems).map(([sortKey, { items: weekItems, displayKey }]) => (
                    <section key={sortKey}>
                        {/* Week Header */}
                        <div className="flex items-center space-x-2 mb-4 group cursor-pointer select-none">
                            <div className="w-5 h-5 flex items-center justify-center rounded hover:bg-secondary transition-colors">
                                <span className="material-symbols-outlined text-text-secondary text-sm transform transition-transform group-hover:text-primary rotate-90">
                                    play_arrow
                                </span>
                            </div>
                            <h2 className="text-xs font-semibold text-text-secondary uppercase tracking-widest">
                                {displayKey}
                            </h2>
                            <div className="h-px bg-border flex-grow ml-2"></div>
                        </div>

                        {/* Diary Grid */}
                        <div className="grid grid-cols-2 gap-x-4 gap-y-8">
                            {weekItems.map((item) => {
                                const hasImage = item.images && item.images.length > 0;
                                const coverImage = hasImage ? item.images![0] : null;

                                return (
                                    <article key={item.id} className="flex flex-col group cursor-pointer relative">
                                        {/* Image */}
                                        <div className="relative w-full aspect-square mb-3 overflow-hidden rounded-lg bg-secondary border border-border">
                                            {coverImage ? (
                                                <div
                                                    className="w-full h-full bg-cover bg-center transition-all duration-500 grayscale group-hover:grayscale-0 group-active:grayscale-0"
                                                    style={{ backgroundImage: `url('${coverImage}')` }}
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-text-secondary">
                                                    <span className="material-symbols-outlined text-4xl">image</span>
                                                </div>
                                            )}

                                            {/* Delete Button */}
                                            <button
                                                onClick={(e) => handleDelete(item.id, e)}
                                                className="absolute top-2 right-2 bg-black/50 p-1.5 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80"
                                            >
                                                <span className="material-symbols-outlined text-[14px]">delete</span>
                                            </button>
                                        </div>

                                        {/* Info */}
                                        <div className="space-y-1.5 px-0.5">
                                            <div className="flex items-center justify-between">
                                                <time className="text-[10px] font-bold text-primary uppercase tracking-wide">
                                                    {formatDateWithDay(item.date)}
                                                </time>
                                                <span className={`w-1.5 h-1.5 rounded-full opacity-50 ${item.author === '나' || item.author === userData?.name
                                                        ? 'bg-blue-500'
                                                        : 'bg-red-500'
                                                    }`}></span>
                                            </div>
                                            <p className="text-[13px] text-text-secondary font-serif leading-snug line-clamp-2">
                                                {item.title || item.previewText}
                                            </p>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    </section>
                ))}

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
                onClick={() => setIsWriteModalOpen(true)}
                className="fixed bottom-24 right-6 size-14 bg-primary text-background rounded-full shadow-xl flex items-center justify-center transition-transform hover:scale-110 active:scale-95 z-10"
            >
                <span className="material-symbols-outlined text-2xl">add</span>
            </button>

            {/* Write Modal */}
            <FeedWriteModal
                isOpen={isWriteModalOpen}
                onClose={() => setIsWriteModalOpen(false)}
                type="Diary"
                onSuccess={handleCreateSuccess}
            />
        </div>
    );
};
