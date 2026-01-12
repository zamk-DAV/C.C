import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/home/Header';
import { RecentMessage } from '../components/home/RecentMessage';
import { MemoryFeed } from '../components/home/MemoryFeed';
import FeedWriteModal from '../components/home/FeedWriteModal';
import { useAuth } from '../context/AuthContext';
import { useNotion } from '../context/NotionContext';
import { doc, updateDoc, collection, query, orderBy, limit, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { ChatMessage, MemoryItem } from '../types';
import { format, differenceInMinutes, differenceInHours, differenceInDays } from 'date-fns';

export const HomePage: React.FC = () => {
    const { user, userData, partnerData, loading } = useAuth();
    const { memoryData, hasMoreMemory, loadMoreMemory, refreshData, isLoading: notionLoading } = useNotion();
    const navigate = useNavigate();

    // Latest Message State
    const [latestMessage, setLatestMessage] = useState<ChatMessage | null>(null);
    const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);

    // Transform memoryData for MemoryFeed
    const memories = useMemo<MemoryItem[]>(() => {
        return memoryData.map(item => ({
            id: item.id,
            type: ((item.images && item.images.length > 0) || item.coverImage ? 'image' : 'quote') as 'image' | 'quote',
            imageUrl: item.coverImage || undefined,
            quote: item.previewText || 'No content',
            title: item.title,
            subtitle: item.previewText || '',
            date: item.date,
            images: item.images
        }));
    }, [memoryData]);

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

    // Fetch Latest Message (Firestore only - no Notion call here)
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

    // Update lastCheckedFeed on mount (once per session)
    useEffect(() => {
        if (user && userData?.coupleId) {
            const userRef = doc(db, 'users', user.uid);
            updateDoc(userRef, { lastCheckedFeed: serverTimestamp() }).catch(console.error);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.uid, userData?.coupleId]);

    const handleLoadMore = () => {
        if (hasMoreMemory && !notionLoading) {
            loadMoreMemory();
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

    const partnerName = partnerData?.name || "Partner";

    // Check for NEW Feed items
    const hasNewMemories = useMemo(() => {
        if (!memories.length || !memories[0].date) return false;
        if (!userData?.lastCheckedFeed) return true;

        const lastChecked = userData.lastCheckedFeed.toDate ? userData.lastCheckedFeed.toDate() : new Date(userData.lastCheckedFeed);
        const latestItemDate = new Date(memories[0].date);

        return latestItemDate > lastChecked;
    }, [memories, userData?.lastCheckedFeed]);

    // Recent Message Logic
    const displayMessage = latestMessage ? latestMessage.text : "아직 대화가 없습니다.";
    const displaySender = latestMessage ? (latestMessage.senderId === user?.uid ? '나' : partnerName) : "";
    const displayTime = latestMessage?.createdAt ? formatTime(latestMessage.createdAt) : "";
    const hasUnreadMessages = (userData?.unreadCount || 0) > 0;

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-background text-primary">Loading...</div>;
    if (!user) return null;

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

                    <MemoryFeed
                        items={memories}
                        hasMore={hasMoreMemory}
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
                            refreshData(); // Use context's refresh instead of local reload
                        }}
                    />
                </div>
            </main>
        </div>
    );
};
