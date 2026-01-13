import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/home/Header';
import { RecentMessage } from '../components/home/RecentMessage';
import { MemoryFeed } from '../components/home/MemoryFeed';
import { useAuth } from '../context/AuthContext';
import { useMemoryData } from '../context/NotionContext';

export const HomePage: React.FC = () => {
    const { user, userData, loading, coupleData } = useAuth();
    const { memoryData, isLoading: isMemoryLoading } = useMemoryData();
    const navigate = useNavigate();

    useEffect(() => {
        if (!loading) {
            if (!user) {
                navigate('/login');
            } else if (userData && !userData.coupleId) {
                console.log("User needs to connect with partner");
            }
        }
    }, [user, userData, loading, navigate]);

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-background text-primary">Loading...</div>;
    if (!user) return null;

    // Use partner data if available
    const partnerName = userData?.partnerNickname || "나의 파트너";
    const partnerImage = userData?.partnerPhotoURL || "/default-avatar.png";
    const myImage = user.photoURL || "/default-avatar.png";

    // Calculate days together
    const startDate = coupleData?.startDate?.toDate?.() || new Date();
    const daysTogether = Math.floor((new Date().getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    if (!userData?.coupleId) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-background p-8 space-y-6 text-primary">
                <motion.h1
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-3xl font-bold font-display tracking-tighter"
                >
                    DEAR23
                </motion.h1>
                <div className="text-center space-y-2">
                    <p className="text-text-secondary font-medium italic">우리의 첫 번째 페이지를 준비해주세요.</p>
                    <p className="text-[11px] text-text-secondary opacity-50 uppercase tracking-widest">Connect with your partner to start sharing memories.</p>
                </div>
                <button
                    className="w-full max-w-[200px] bg-primary text-background px-6 py-4 rounded-full font-bold text-sm tracking-widest shadow-xl shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all"
                    onClick={() => navigate('/connect')}
                >
                    연결하러 가기
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pb-24 font-display">
            <Header
                partnerName={partnerName}
                partnerImage={partnerImage}
                myImage={myImage}
                isOnline={true}
                daysTogether={daysTogether}
            />

            <main className="space-y-2">
                <RecentMessage
                    senderName={partnerName.toUpperCase()}
                    message="우리의 특별한 하루를 기록해보세요."
                    timestamp="TODAY"
                    isNew={true}
                />

                {isMemoryLoading ? (
                    <div className="py-20 flex justify-center items-center">
                        <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                    </div>
                ) : memoryData.length > 0 ? (
                    <MemoryFeed items={memoryData} />
                ) : (
                    <div className="py-20 px-6 text-center text-text-secondary italic font-light opacity-50">
                        <p className="text-lg">첫 번째 추억을 남겨보세요.</p>
                        <p className="text-xs uppercase tracking-widest mt-2">No memories shared yet</p>
                    </div>
                )}
            </main>
        </div>
    );
};
