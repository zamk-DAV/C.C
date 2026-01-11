import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';

export const MainLayout = () => {
    const location = useLocation();
    const { userData } = useAuth();

    const isActive = (path: string) => location.pathname === path;

    const [hasNewDiary, setHasNewDiary] = React.useState(false);

    React.useEffect(() => {
        const checkNewDiary = async () => {
            if (userData?.notionConfig?.apiKey && userData?.notionConfig?.databaseId && userData?.lastCheckedDiary) {
                try {
                    const result = await import('../../lib/notion').then(m => m.fetchNotionData('Diary'));
                    if (result.data.length > 0) {
                        const latestDate = new Date(result.data[0].date);
                        const lastChecked = userData.lastCheckedDiary.toDate ? userData.lastCheckedDiary.toDate() : new Date(userData.lastCheckedDiary);

                        if (latestDate > lastChecked) {
                            setHasNewDiary(true);
                        }
                    }
                } catch (e) {
                    console.error("Check new diary failed", e);
                }
            }
        };

        if (userData) {
            checkNewDiary();
        }
    }, [userData?.notionConfig, userData?.lastCheckedDiary]);

    return (
        <div className="min-h-[100dvh] bg-background-light text-primary flex justify-center w-full transition-colors duration-300">
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
                                    {/* Badge (Fake for now as Mailbox is mock) */}
                                    <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border-2 border-background hidden"></span>
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
