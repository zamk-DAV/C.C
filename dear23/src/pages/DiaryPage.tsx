import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { format, parseISO, isValid, getWeek, getYear, getMonth } from 'date-fns';
import { ko } from 'date-fns/locale';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { DiaryService } from '../lib/firebase/services';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import FeedWriteModal from '../components/home/FeedWriteModal';
import { DiaryDetailModal } from '../components/diary/DiaryDetailModal';

export const DiaryPage: React.FC = () => {
    const { user, userData, partnerData } = useAuth();
    const { diaries, loading: isLoading } = useData();

    const [filter, setFilter] = useState<'all' | 'me' | 'partner'>('all');
    const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);

    // Edit & UX States
    const [editingItem, setEditingItem] = useState<any | null>(null);
    const [selectedItem, setSelectedItem] = useState<any | null>(null);
    const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

    // Display author name using Firestore authorId
    const displayAuthorName = useCallback((item: any): string => {
        const isMe = item.authorId === user?.uid;

        if (isMe) {
            return userData?.name || '나';
        } else {
            return userData?.partnerNickname || partnerData?.name || '상대방';
        }
    }, [userData, partnerData, user?.uid]);

    // Update Last Checked Timestamp
    useEffect(() => {
        if (user && userData?.coupleId) {
            const userRef = doc(db, 'users', user.uid);
            updateDoc(userRef, { lastCheckedDiary: serverTimestamp() }).catch(console.error);
        }
    }, [userData?.coupleId, user]);

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!window.confirm("정말 이 추억을 삭제하시겠습니까? (복구할 수 없습니다)")) return;

        try {
            if (userData?.coupleId) {
                await DiaryService.deleteDiary(userData.coupleId, id);
            }
        } catch (error) {
            console.error("Delete failed:", error);
            alert("삭제에 실패했습니다.");
        }
    };

    const handleEdit = (item: any, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingItem(item);
        setIsWriteModalOpen(true);
    };

    const handleCreateSuccess = () => {
        setIsWriteModalOpen(false);
        setEditingItem(null);
        // Real-time updates handle refresh automatically
    };

    const toggleSection = (key: string) => {
        setCollapsedSections(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    // Group items
    const groupedItems = useMemo(() => {
        const sorted = [...diaries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const groups: { [key: string]: { items: any[], displayKey: string } } = {};

        sorted.forEach(item => {
            if (!item.date) return;
            const date = parseISO(item.date);
            if (!isValid(date)) return;

            const year = getYear(date);
            const month = getMonth(date) + 1;
            const week = getWeek(date, { weekStartsOn: 0 });

            const firstDayOfMonth = new Date(year, month - 1, 1);
            const weekOfMonth = Math.ceil((date.getDate() + firstDayOfMonth.getDay()) / 7);

            const sortKey = `${year}-${String(month).padStart(2, '0')}-W${week}`;
            const displayKey = `${year}. ${String(month).padStart(2, '0')} Week ${weekOfMonth}`;

            if (!groups[sortKey]) groups[sortKey] = { items: [], displayKey };

            const isMe = item.authorId === user?.uid;

            if (filter === 'all') groups[sortKey].items.push(item);
            else if (filter === 'me' && isMe) groups[sortKey].items.push(item);
            else if (filter === 'partner' && !isMe) groups[sortKey].items.push(item);
        });

        Object.keys(groups).forEach(key => {
            if (groups[key].items.length === 0) delete groups[key];
        });

        return groups;
    }, [filter, diaries, user?.uid]);

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

    if (isLoading && diaries.length === 0) {
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
                        <section key={sortKey}>
                            {/* Week Header */}
                            <div
                                onClick={() => toggleSection(sortKey)}
                                className="flex items-center space-x-2 mb-4 group cursor-pointer select-none"
                            >
                                <div className={`w-5 h-5 flex items-center justify-center rounded hover:bg-secondary transition-all duration-300 ${isCollapsed ? 'rotate-0' : 'rotate-90'}`}>
                                    <span className="material-symbols-outlined text-text-secondary text-sm group-hover:text-primary transition-colors">
                                        play_arrow
                                    </span>
                                </div>
                                <h2 className="text-xs font-semibold text-text-secondary uppercase tracking-widest group-hover:text-primary transition-colors">
                                    {displayKey}
                                </h2>
                                <div className="h-px bg-border flex-grow ml-2 opacity-50"></div>
                            </div>

                            {/* Diary Grid */}
                            <div className={`grid grid-cols-2 gap-x-4 gap-y-8 transition-all duration-500 overflow-hidden ${isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[5000px] opacity-100'}`}>
                                {weekItems.map((item) => {
                                    const coverImage = item.images && item.images.length > 0 ? item.images[0] : null;

                                    return (
                                        <article key={item.id} className="flex flex-col group cursor-pointer relative" onClick={() => setSelectedItem(item)}>
                                            {/* Image area */}
                                            <div className="relative w-full aspect-square mb-3 overflow-hidden rounded-lg bg-secondary border border-border">
                                                {coverImage ? (
                                                    <div
                                                        className="w-full h-full bg-cover bg-center transition-all duration-500 grayscale group-hover:grayscale-0 group-active:grayscale-0"
                                                        style={{ backgroundImage: `url('${coverImage}')` }}
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-text-secondary/30">
                                                        <span className="material-symbols-outlined text-4xl">image</span>
                                                    </div>
                                                )}

                                                {/* Actions Overlay */}
                                                <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={(e) => handleEdit(item, e)}
                                                        className="bg-black/50 p-1.5 rounded-full text-white hover:bg-primary transition-colors backdrop-blur-sm"
                                                    >
                                                        <span className="material-symbols-outlined text-[14px]">edit</span>
                                                    </button>
                                                    <button
                                                        onClick={(e) => handleDelete(item.id, e)}
                                                        className="bg-black/50 p-1.5 rounded-full text-white hover:bg-red-500 transition-colors backdrop-blur-sm"
                                                    >
                                                        <span className="material-symbols-outlined text-[14px]">delete</span>
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Info */}
                                            <div className="space-y-2 px-0.5">
                                                <div className="flex items-center justify-between">
                                                    <time className="text-[10px] font-bold text-primary uppercase tracking-wide">
                                                        {formatDateWithDay(item.date)}
                                                    </time>
                                                </div>

                                                {/* Author & Status */}
                                                <div className="flex items-center gap-1.5">
                                                    <span className={`w-1.5 h-1.5 rounded-full ${item.authorId === user?.uid
                                                        ? 'bg-blue-500'
                                                        : 'bg-red-500'
                                                        }`}></span>
                                                    <span className="text-[10px] font-medium text-text-secondary">
                                                        {displayAuthorName(item)}
                                                    </span>
                                                </div>

                                                <p className="text-[13px] text-text-secondary font-serif leading-snug line-clamp-2">
                                                    {item.content || item.title}
                                                </p>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        </section>
                    );
                })}
            </main>

            {/* Floating Action Button */}
            <button
                onClick={() => {
                    setEditingItem(null);
                    setIsWriteModalOpen(true);
                }}
                className="fixed bottom-24 right-6 size-14 bg-primary text-background rounded-full shadow-xl flex items-center justify-center transition-transform hover:scale-110 active:scale-95 z-10"
            >
                <span className="material-symbols-outlined text-2xl">add</span>
            </button>

            {/* Write Modal - Update passed props to match new structure */}
            <FeedWriteModal
                isOpen={isWriteModalOpen}
                onClose={() => {
                    setIsWriteModalOpen(false);
                    setEditingItem(null);
                }}
                type="Diary"
                onSuccess={handleCreateSuccess}
                initialData={editingItem}
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
