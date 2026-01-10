import React, { useEffect, useState, useMemo } from 'react';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/home/Header';
import { RecentMessage } from '../components/home/RecentMessage';
import { MemoryFeed } from '../components/home/MemoryFeed';
import { useAuth } from '../context/AuthContext';
import { fetchNotionData } from '../lib/notion';

export const HomePage: React.FC = () => {
    const { user, userData, partnerData, coupleData, loading } = useAuth();
    const navigate = useNavigate();

    // Memory Feed State
    const [memories, setMemories] = useState<any[]>([]);
    const [hasMore, setHasMore] = useState(false);
    const [nextCursor, setNextCursor] = useState<string | null>(null);

    // Initial Load & D-Day Calculation
    const daysTogether = useMemo(() => {
        if (!coupleData?.startDate) return 0;
        const start = parseISO(coupleData.startDate);
        const now = new Date();
        return differenceInCalendarDays(now, start) + 1;
    }, [coupleData?.startDate]);

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

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-white">Loading...</div>;
    if (!user) return null;

    // Placeholder data fallback
    const partnerImage = partnerData?.photoURL || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=3087&auto=format&fit=crop";
    const myImage = userData?.photoURL || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=3087&auto=format&fit=crop";
    const partnerName = partnerData?.name || "Partner";

    // If not connected, show the splash screen
    if (!userData?.coupleId) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-white p-8 space-y-4">
                <h1 className="text-2xl font-bold font-display">DEAR23</h1>
                <p className="text-gray-500 font-sans">파트너와 연결이 필요합니다.</p>
                <button
                    className="bg-primary text-white px-6 py-3 rounded-xl font-sans text-sm font-bold shadow-lg shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all"
                    onClick={() => navigate('/connect')}
                >
                    연결하러 가기
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background-light pb-24">
            <Header
                partnerName={partnerName}
                partnerImage={partnerImage}
                myImage={myImage}
                isOnline={true}
                daysTogether={daysTogether}
            />

            <main className="space-y-2">
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
