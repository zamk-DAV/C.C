import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/home/Header';
import { RecentMessage } from '../components/home/RecentMessage';
import { MemoryFeed } from '../components/home/MemoryFeed';
import { useAuth } from '../context/AuthContext';

export const HomePage: React.FC = () => {
    const { user, userData, loading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!loading) {
            if (!user) {
                navigate('/login');
            } else if (userData && !userData.coupleId) {
                // If user is logged in but no coupleId, redirect to connection page
                // navigate('/connect'); (ToDo: Implement ConnectPage)
                // For now, let's just log it or maybe show a "Not Connected" state
                // console.log("User needs to connect with partner");
                navigate('/connect');
            }
        }
    }, [user, userData, loading, navigate]);

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-white">Loading...</div>;
    if (!user) return null; // Will redirect

    // Placeholder data until real data is linked
    const partnerImage = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=3087&auto=format&fit=crop";
    const myImage = userData?.photoURL || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=3087&auto=format&fit=crop";
    const partnerName = "Partner";

    // If not connected, we redirect (handled in useEffect), so we don't need to render anything special here
    // But to prevent flash, we can return null if no coupleId
    if (!userData?.coupleId) return null;

    return (
        <div className="min-h-screen bg-background-light pb-24">
            <Header
                partnerName={partnerName}
                partnerImage={partnerImage}
                myImage={myImage}
                isOnline={true}
                daysTogether={1600}
            />

            <main className="space-y-2">
                <RecentMessage
                    senderName="MINSU"
                    message="오늘 저녁 같이 먹는 거 기대된다. 나 이제 퇴근해!"
                    timestamp="방금 전"
                    isNew={true}
                />

                <MemoryFeed items={[
                    {
                        id: '1',
                        type: 'image',
                        imageUrl: 'https://images.unsplash.com/photo-1516962080544-eac695c93791?q=80&w=3087&auto=format&fit=crop',
                        title: '첫 번째 데이트',
                        subtitle: '2023. 12. 24'
                    },
                    {
                        id: '2',
                        type: 'quote',
                        quote: '함께라서 더 행복한 시간들',
                        title: '소중한 기억',
                        subtitle: '2024. 01. 01'
                    },
                    {
                        id: '3',
                        type: 'image',
                        imageUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=3087&auto=format&fit=crop',
                        title: '우리 여행',
                        subtitle: '2024. 03. 15'
                    }
                ]} />
            </main>
        </div>
    );
};
