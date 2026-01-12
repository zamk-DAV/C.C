import React, { useMemo } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import { useNotion } from '../../context/NotionContext';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

export const MainLayout = () => {
    const location = useLocation();
    const isActive = (path: string) => location.pathname === path;

    const [unreadMailCount, setUnreadMailCount] = React.useState(0);
    const { user, userData, coupleData } = useAuth();
    const { diaryData } = useNotion();

    // Check for New Diary - using Context data instead of API call
    const hasNewDiary = useMemo(() => {
        if (!diaryData.length) return false;
        if (!userData?.lastCheckedDiary) return false;

        const lastChecked = userData.lastCheckedDiary.toDate
            ? userData.lastCheckedDiary.toDate()
            : new Date(userData.lastCheckedDiary);

        const latestDate = new Date(diaryData[0].date);
        return latestDate > lastChecked;
    }, [diaryData, userData?.lastCheckedDiary]);

    // Check for Unread Mail
    React.useEffect(() => {
        if (!coupleData?.id || !user?.uid) return;

        const q = query(
            collection(db, 'couples', coupleData.id, 'postcards'),
            where('isRead', '==', false)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const myUnreadCount = snapshot.docs.filter(doc => {
                const data = doc.data();
                return data.senderId !== user.uid;
            }).length;
            setUnreadMailCount(myUnreadCount);
        });

        return () => unsubscribe();
    }, [coupleData?.id, user?.uid]);

    return (
        <div className="min-h-[100dvh] bg-background text-primary flex justify-center w-full">
            <div className="w-full max-w-md relative flex flex-col min-h-[100dvh] shadow-xl bg-background transition-colors duration-300">
                {/* Content Area */}
                <main className="flex-1 pb-24">
                    <Outlet />
                </main>

                {/* Bottom Navigation - Only show if user has a partner connected */}
                {userData?.coupleId && (
                    <nav className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-5 pt-3 bg-background/95 backdrop-blur-xl border-t border-border transition-colors duration-300">
                        <div className="max-w-md mx-auto flex justify-between items-center px-6">
                            <Link to="/diary" className="flex flex-col items-center space-y-1.5 w-14 group relative">
                                <div className="relative">
                                    <span className={cn("material-icons-round text-[22px] transition-colors", isActive('/diary') ? "text-primary" : "text-text-secondary group-hover:text-primary")}>edit_note</span>
                                    {hasNewDiary && (
                                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full border-2 border-background animate-pulse"></span>
                                    )}
                                </div>
                                <span className={cn("text-[10px] font-semibold transition-colors", isActive('/diary') ? "text-primary" : "text-text-secondary group-hover:text-primary")}>일기</span>
                            </Link>

                            <Link to="/calendar" className="flex flex-col items-center space-y-1.5 w-14 group">
                                <span className={cn("material-icons-outlined text-[22px] transition-colors", isActive('/calendar') ? "text-primary" : "text-text-secondary group-hover:text-primary")}>calendar_month</span>
                                <span className={cn("text-[10px] font-medium transition-colors", isActive('/calendar') ? "text-primary" : "text-text-secondary group-hover:text-primary")}>캘린더</span>
                            </Link>

                            {/* Raised Home Button */}
                            <Link to="/" className="flex flex-col items-center justify-center w-14 group -mt-6">
                                <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-xl shadow-gray-200/50 dark:shadow-none transform group-hover:scale-105 transition-all">
                                    <span className="material-icons-round text-2xl text-background">home</span>
                                </div>
                                <span className="text-[10px] font-medium text-primary mt-1.5">홈</span>
                            </Link>

                            <Link to="/mailbox" className="flex flex-col items-center space-y-1.5 w-14 group">
                                <div className="relative">
                                    <span className={cn("material-icons-outlined text-[22px] transition-colors", isActive('/mailbox') ? "text-primary" : "text-text-secondary group-hover:text-primary")}>mail_outline</span>
                                    {unreadMailCount > 0 && (
                                        <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border-2 border-background animate-pulse"></span>
                                    )}
                                </div>
                                <span className={cn("text-[10px] font-medium transition-colors", isActive('/mailbox') ? "text-primary" : "text-text-secondary group-hover:text-primary")}>우편함</span>
                            </Link>

                            <Link to="/settings" className="flex flex-col items-center space-y-1.5 w-14 group">
                                <span className={cn("material-icons-outlined text-[22px] transition-colors", isActive('/settings') ? "text-primary" : "text-text-secondary group-hover:text-primary")}>settings</span>
                                <span className={cn("text-[10px] font-medium transition-colors", isActive('/settings') ? "text-primary" : "text-text-secondary group-hover:text-primary")}>설정</span>
                            </Link>
                        </div>
                    </nav>
                )}
            </div>
        </div >
    );
};
