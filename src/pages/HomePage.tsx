import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/home/Header';
import { RecentMessage } from '../components/home/RecentMessage';
import { MemoryFeed } from '../components/home/MemoryFeed';
import FeedWriteModal from '../components/home/FeedWriteModal';
import { useAuth } from '../context/AuthContext';
import { fetchNotionData } from '../lib/notion';
import { doc, updateDoc, collection, query, orderBy, limit, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { ChatMessage } from '../types';
import { format, differenceInMinutes, differenceInHours, differenceInDays } from 'date-fns';

export const HomePage: React.FC = () => {
    const { user, userData, partnerData, loading } = useAuth();
    const navigate = useNavigate();

    // Latest Message State
    const [latestMessage, setLatestMessage] = useState<ChatMessage | null>(null);

    // Memory Feed State
    const [memories, setMemories] = useState<any[]>([]);
    const [hasMore, setHasMore] = useState(false);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);

    // Dynamic Time Formatter
    const formatTime = (dateString?: any) => {
        if (!dateString) return '';
        const date = dateString instanceof Date ? dateString : dateString.toDate ? dateString.toDate() : new Date(dateString);
        const now = new Date();

        const diffMins = differenceInMinutes(now, date);
        if (diffMins < 1) return '방금 전';
        if (diffMins < 60) return `${diffMins}분 전`;

        const diffHours = differenceInHours(now, date);
        if (diffHours < 24) return `${diffHours}시간 전`;

        const diffDays = differenceInDays(now, date);
        if (diffDays < 7) return `${diffDays}일 전`;

        return format(date, 'yyyy.MM.dd');
    };

    useEffect(() => {
        if (!loading) {
            if (!user) {
                navigate('/login');
            }
        }
    }, [user, loading, navigate]);

    // Fetch Latest Message
    useEffect(() => {
        if (userData?.coupleId) {
            const q = query(
                collection(db, 'couples', userData.coupleId, 'messages'),
                orderBy('createdAt', 'desc'),
                limit(1)
            );

            const unsubscribe = onSnapshot(q, (snapshot) => {
                if (!snapshot.empty) {
                    const data = snapshot.docs[0].data();
                    setLatestMessage({ id: snapshot.docs[0].id, ...data } as ChatMessage);
                }
            });

            return () => unsubscribe();
        }
    }, [userData?.coupleId]);

    // Fetch Memories (Initial)
    useEffect(() => {
        if (userData?.notionConfig?.apiKey && userData?.notionConfig?.databaseId) {
            loadMemories();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userData?.notionConfig?.apiKey, userData?.notionConfig?.databaseId]);

    // Update lastCheckedFeed on unmount
    useEffect(() => {
        return () => {
            if (user && userData) {
                const userRef = doc(db, 'users', user.uid);
                updateDoc(userRef, { lastCheckedFeed: serverTimestamp() }).catch(console.error);
            }
        };
    }, [user?.uid]);

    const loadMemories = async (cursor?: string) => {
        try {
            // Changed filter from 'Memory' to 'Diary' to match the "Archive / Diary" title and user's intent
            const result = await fetchNotionData('Diary', cursor, 5);
            const newItems = result.data.map(item => ({
                id: item.id,
                type: (item.images && item.images.length > 0) || item.coverImage ? 'image' : 'quote',
                imageUrl: item.coverImage || undefined,
                quote: item.previewText || 'No content',
                title: item.title,
                subtitle: item.previewText || '',
                date: item.date,
                images: item.images // Pass the images array
            }));

            if (cursor) {
                setMemories(prev => [...prev, ...newItems]);
            } else {
                setMemories(newItems);
            }

            setHasMore(result.hasMore);
            setNextCursor(result.nextCursor);
        } catch (error) {
            console.error("Failed to load memories:", error);
        }
    };

    const handleLoadMore = () => {
        if (hasMore && nextCursor) {
            loadMemories(nextCursor);
        }
    };

    const togglePush = async () => {
        if (!user || !userData) return;
        const currentSetting = userData.isPushEnabled ?? true;
        try {
            await updateDoc(doc(db, 'users', user.uid), {
                isPushEnabled: !currentSetting
            });
        } catch (error) {
            console.error("Failed to toggle push:", error);
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-background text-primary">Loading...</div>;
    if (!user) return null;

    const partnerName = partnerData?.name || "Partner";

    // If not connected, show the splash screen
    if (!userData?.coupleId) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-background p-8 space-y-4">
                <h1 className="text-2xl font-bold font-display text-primary">DEAR23</h1>
                <p className="text-text-secondary font-sans">파트너와 연결이 필요합니다.</p>
                <button
                    className="bg-primary text-background px-6 py-3 rounded-xl font-sans text-sm font-bold shadow-lg shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all"
                    onClick={() => navigate('/connect')}
                >
                    연결하러 가기
                </button>
            </div>
        );
    }

    // Check for NEW Feed items
    const hasNewMemories = useMemo(() => {
        if (!memories.length) return false;
        if (!userData.lastCheckedFeed) return true; // Never checked before

        const lastChecked = userData.lastCheckedFeed.toDate ? userData.lastCheckedFeed.toDate() : new Date(userData.lastCheckedFeed);
        // Assuming memories are sorted by date desc
        // The endpoint fetchNotionData returns sorted items? Usually yes.
        // Let's check the first item's date. The item.date is string "YYYY-MM-DD" usually from Notion.
        // We might need to be careful if it's just date string.
        // But assuming NotionItem.date is the relevant timestamp equivalent.
        // Actually, Notion only gives date string "2023-10-24".
        // Comparing date string "2023-10-24" vs timestamp...
        // If lastChecked is today, and item is today...
        // Let's just compare if item date > usedData.lastCheckedFeed date part.

        const latestItemDate = new Date(memories[0].date); // parseISO logic
        // Reset time to 00:00:00 for item date (since it's YYYY-MM-DD)
        // And lastChecked might include time.
        // If I checked YESTERDAY, lastChecked < TODAY.
        // NEW should show if latestItemDate >= lastChecked status? No, >.
        // Let's rely on serverTimestamp() vs string date.
        // Ideally we need created_time from Notion, but we only have `date` property mapped.
        // Let's use `latestItemDate` at 00:00 vs `lastChecked`. 

        return latestItemDate > lastChecked;
    }, [memories, userData.lastCheckedFeed]);

    // Recent Message Logic
    // If no messages yet, show default? Or hidden?
    // Current UI shows hardcoded. Let's start with a fallback if no message.
    const displayMessage = latestMessage ? latestMessage.text : "아직 대화가 없습니다.";
    const displaySender = latestMessage ? (latestMessage.senderId === user.uid ? '나' : partnerName) : "";
    const displayTime = latestMessage?.createdAt ? formatTime(latestMessage.createdAt) : "";
    const hasUnreadMessages = (userData.unreadCount || 0) > 0;

    return (
        <div className="min-h-screen bg-background pb-24 transition-colors duration-300">
            <Header
                partnerName={partnerName}
                isOnline={true}
                isPushEnabled={userData.isPushEnabled ?? true}
                onTogglePush={togglePush}
            />

            <main className="space-y-2">

                <RecentMessage
                    senderName={displaySender || partnerName}
                    message={latestMessage?.type === 'image' ? '사진을 보냈습니다.' : displayMessage}
                    timestamp={displayTime}
                    isNew={hasUnreadMessages}
                />

                <div className="relative">
                    {hasNewMemories && (
                        <div className="absolute top-4 right-6 z-10 flex items-center gap-1 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                            NEW
                        </div>
                    )}

                    {/* Feed Section Divider & Header */}
                    <div className="px-6 py-6 mt-4">
                        <div className="h-px w-full bg-border/50 mb-8"></div>
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold tracking-tight uppercase font-display text-text-main dark:text-white">Archive / Diary</h2>
                            <button className="text-text-secondary hover:text-primary transition-colors">
                                <span className="material-symbols-outlined">filter_list</span>
                            </button>
                        </div>
                    </div>

                    <MemoryFeed
                        items={memories}
                        hasMore={hasMore}
                        onLoadMore={handleLoadMore}
                    />

                    {/* Floating Action Button for Adding Feed */}
                    <div className="fixed bottom-24 right-6 z-30">
                        <button
                            className="flex items-center justify-center size-14 rounded-full bg-text-main dark:bg-primary shadow-xl hover:scale-105 active:scale-95 transition-transform group"
                            onClick={() => setIsWriteModalOpen(true)}
                        >
                            <span className="material-symbols-outlined text-white text-3xl font-light">add</span>
                        </button>
                    </div>

                    <FeedWriteModal
                        isOpen={isWriteModalOpen}
                        onClose={() => setIsWriteModalOpen(false)}
                        onSuccess={() => {
                            setMemories([]); // Clear and reload
                            loadMemories();
                        }}
                    />
                </div>
            </main>
        </div>
    );
};
