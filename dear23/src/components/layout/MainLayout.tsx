

import { Outlet, Link, useLocation } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';

export const MainLayout = () => {
    const location = useLocation();
    const { userData } = useAuth();

    const isActive = (path: string) => location.pathname === path;

    return (
        <div className="min-h-[100dvh] bg-background-light text-primary flex justify-center w-full">
            <div className="w-full max-w-md relative flex flex-col min-h-[100dvh] shadow-xl bg-white dark:bg-black">
                {/* Content Area */}
                <main className="flex-1 pb-24">
                    <Outlet />
                </main>

                {/* Bottom Navigation - Only show if user has a partner connected */}
                {userData?.coupleId && (
                    <nav className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-5 pt-3 bg-white/95 dark:bg-background-dark/95 backdrop-blur-xl border-t border-gray-100 dark:border-zinc-800 transition-colors duration-300">
                        <div className="max-w-md mx-auto flex justify-between items-center px-6">
                            <Link to="/diary" className="flex flex-col items-center space-y-1.5 w-14 group">
                                <span className={cn("material-icons-round text-[22px] transition-colors", isActive('/diary') ? "text-black dark:text-white" : "text-gray-400 dark:text-gray-500 group-hover:text-black dark:group-hover:text-white")}>edit_note</span>
                                <span className={cn("text-[10px] font-semibold transition-colors", isActive('/diary') ? "text-black dark:text-white" : "text-gray-400 dark:text-gray-500 group-hover:text-black dark:group-hover:text-white")}>일기</span>
                            </Link>

                            <Link to="/calendar" className="flex flex-col items-center space-y-1.5 w-14 group">
                                <span className={cn("material-icons-outlined text-[22px] transition-colors", isActive('/calendar') ? "text-black dark:text-white" : "text-gray-400 dark:text-gray-500 group-hover:text-black dark:group-hover:text-white")}>calendar_month</span>
                                <span className={cn("text-[10px] font-medium transition-colors", isActive('/calendar') ? "text-black dark:text-white" : "text-gray-400 dark:text-gray-500 group-hover:text-black dark:group-hover:text-white")}>캘린더</span>
                            </Link>

                            {/* Raised Home Button */}
                            <Link to="/" className="flex flex-col items-center justify-center w-14 group -mt-6">
                                <div className="w-12 h-12 bg-black dark:bg-white rounded-2xl flex items-center justify-center shadow-xl shadow-gray-200 dark:shadow-none transform group-hover:scale-105 transition-all">
                                    <span className="material-icons-round text-2xl text-white dark:text-black">home</span>
                                </div>
                                <span className="text-[10px] font-medium text-black dark:text-white mt-1.5">홈</span>
                            </Link>

                            <Link to="/mailbox" className="flex flex-col items-center space-y-1.5 w-14 group">
                                <div className="relative">
                                    <span className={cn("material-icons-outlined text-[22px] transition-colors", isActive('/mailbox') ? "text-black dark:text-white" : "text-gray-400 dark:text-gray-500 group-hover:text-black dark:group-hover:text-white")}>mail_outline</span>
                                    {/* Badge */}
                                    <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-background-dark"></span>
                                </div>
                                <span className={cn("text-[10px] font-medium transition-colors", isActive('/mailbox') ? "text-black dark:text-white" : "text-gray-400 dark:text-gray-500 group-hover:text-black dark:group-hover:text-white")}>우편함</span>
                            </Link>

                            <Link to="/settings" className="flex flex-col items-center space-y-1.5 w-14 group">
                                <span className={cn("material-icons-outlined text-[22px] transition-colors", isActive('/settings') ? "text-black dark:text-white" : "text-gray-400 dark:text-gray-500 group-hover:text-black dark:group-hover:text-white")}>settings</span>
                                <span className={cn("text-[10px] font-medium transition-colors", isActive('/settings') ? "text-black dark:text-white" : "text-gray-400 dark:text-gray-500 group-hover:text-black dark:group-hover:text-white")}>설정</span>
                            </Link>
                        </div>
                    </nav>
                )}
            </div>
        </div >
    );
};
