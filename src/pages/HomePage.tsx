import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/home/Header';
import { RecentMessage } from '../components/home/RecentMessage';
import { MemoryFeed } from '../components/home/MemoryFeed';
import { useAuth } from '../context/AuthContext';
import { fetchNotionData } from '../lib/notion';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export const HomePage: React.FC = () => {
    const { user, userData, partnerData, loading } = useAuth();
    const navigate = useNavigate();

    // Memory Feed State
    const [memories, setMemories] = useState<any[]>([]);
    const [hasMore, setHasMore] = useState(false);
    const [nextCursor, setNextCursor] = useState<string | null>(null);

    useEffect(() => {
        if (!loading) {
            if (!user) {
                navigate('/login');
            }
        }
    }, [user, loading, navigate]);

    // Fetch Memories (Initial)
    useEffect(() => {
        if (userData?.notionConfig?.apiKey && userData?.notionConfig?.databaseId) {
            loadMemories();
        }
    }, [userData?.notionConfig]);

    const loadMemories = async (cursor?: string) => {
        try {
            const result = await fetchNotionData('Memory', cursor); // Assuming we fetch all or specific filter
            // Transform NotionItems to MemoryItems
            const newItems = result.data.map(item => ({
                id: item.id,
                type: item.coverImage ? 'image' : 'quote',
                imageUrl: item.coverImage || undefined,
                quote: item.previewText || 'No content',
                title: item.title,
                subtitle: item.date
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
        const currentSetting = userData.isPushEnabled ?? true; // Default to true
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

    return (
        <div className="min-h-screen bg-background pb-24 transition-colors duration-300">
            <Header
                partnerName={partnerName}
                isOnline={true}
            />

            <main className="space-y-2">
                {/* Notification Toggle (Temporary UI placement, can be moved to Header if Header supports it) */}
                <div className="flex justify-end px-6 pt-2">
                    <button
                        onClick={togglePush}
                        className="flex items-center gap-2 text-[12px] text-text-secondary bg-secondary/30 px-3 py-1.5 rounded-full hover:bg-secondary/50 transition-colors"
                    >
                        <span className="material-symbols-outlined text-[16px]">
                            {(userData.isPushEnabled ?? true) ? 'notifications_active' : 'notifications_off'}
                        </span>
                        {(userData.isPushEnabled ?? true) ? '알림 ON' : '알림 OFF'}
                    </button>
                </div>

                <RecentMessage
                    senderName={partnerName}
                    message="오늘 저녁 같이 먹는 거 기대된다. 나 이제 퇴근해!"
                    timestamp="방금 전"
                    isNew={true}
                />

                <MemoryFeed
                    items={memories}
                    hasMore={hasMore}
                    onLoadMore={handleLoadMore}
                />
            </main>
        </div>
    );
};
