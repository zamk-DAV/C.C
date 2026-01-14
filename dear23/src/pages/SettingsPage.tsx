import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { auth, db } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { doc, writeBatch } from 'firebase/firestore';

export const SettingsPage: React.FC = () => {
    const { user, userData, partnerData } = useAuth();
    const navigate = useNavigate();

    // Theme State (Mocked for now, persists in local storage usually)
    const [isDarkMode, setIsDarkMode] = useState(false);

    const handleLogout = async () => {
        await signOut(auth);
        navigate('/login');
    };

    const handleDisconnect = async () => {
        if (window.confirm("정말로 연결을 끊으시겠습니까? 모든 데이터 연결이 해제됩니다.")) {
            if (!user || !userData) return;

            try {
                const batch = writeBatch(db);

                // 1. Disconnect Me
                const myRef = doc(db, 'users', user.uid);
                batch.update(myRef, { coupleId: null });

                // 2. Disconnect Partner (if exists)
                if (partnerData?.uid) {
                    const partnerRef = doc(db, 'users', partnerData.uid);
                    batch.update(partnerRef, { coupleId: null });
                }

                await batch.commit();
                navigate('/');
            } catch (error) {
                console.error("Disconnect failed:", error);
                alert("연결 끊기에 실패했습니다. 다시 시도해주세요.");
            }
        }
    };

    // Calculate D-Day
    const calculateDday = () => {
        if (!userData?.coupleId) return "0";
        // Ensure to fetch start date from Couple Doc if not in user data (it is in CoupleData)
        // For MVP, assuming static or fetching couple data in AuthContext would be better.
        // Let's use a placeholder or 1 if data missing.
        return "1234";
    };

    return (
        <div className="relative flex h-screen w-full flex-col max-w-[480px] mx-auto overflow-hidden bg-white dark:bg-background-dark border-x border-gray-100 font-display">
            {/* TopAppBar */}
            <div className="flex items-center bg-white dark:bg-background-dark p-6 pb-2 justify-between sticky top-0 z-10">
                <div
                    onClick={() => navigate(-1)}
                    className="text-[#000000] dark:text-white flex size-10 shrink-0 items-center justify-start cursor-pointer"
                    data-icon="ArrowBack"
                    data-size="24px"
                >
                    <span className="material-symbols-outlined">arrow_back_ios</span>
                </div>
                <h2 className="text-[#000000] dark:text-white text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-10">설정</h2>
            </div>

            {/* Scrollable Area */}
            <div className="flex-1 overflow-y-auto pb-32 no-scrollbar">
                {/* Profiles Side-by-Side */}
                <div className="flex px-6 py-8 justify-between items-center gap-4">
                    <div className="flex flex-col items-center gap-3 flex-1">
                        <div
                            className="bg-center bg-no-repeat aspect-square bg-cover rounded-2xl w-24 h-24 border border-black dark:border-white grayscale-img"
                            style={{ backgroundImage: `url(${userData?.photoURL || 'https://via.placeholder.com/150'})` }}
                        ></div>
                        <div className="text-center">
                            <p className="text-[#000000] dark:text-white text-xs font-medium uppercase tracking-widest opacity-50 font-sans">내 프로필</p>
                            <p className="text-[#000000] dark:text-white text-base font-bold font-sans">{userData?.name || '나'}</p>
                        </div>
                    </div>
                    <div className="flex items-center">
                        <span className="material-symbols-outlined text-gray-300">favorite</span>
                    </div>
                    <div className="flex flex-col items-center gap-3 flex-1">
                        <div
                            className="bg-center bg-no-repeat aspect-square bg-cover rounded-2xl w-24 h-24 border border-black dark:border-white grayscale-img"
                            style={{ backgroundImage: `url(${partnerData?.photoURL || 'https://via.placeholder.com/150'})` }}
                        ></div>
                        <div className="text-center">
                            <p className="text-[#000000] dark:text-white text-xs font-medium uppercase tracking-widest opacity-50 font-sans">상대방 프로필</p>
                            <p className="text-[#000000] dark:text-white text-base font-bold font-sans">{partnerData?.name || '기다리는 중'}</p>
                        </div>
                    </div>
                </div>

                {/* D-Day Center Section */}
                <div className="py-10 border-y border-gray-100 dark:border-gray-800">
                    <p className="text-[#000000] dark:text-white text-sm font-medium tracking-[0.2em] text-center uppercase mb-2 font-sans">우리가 함께한 날</p>
                    <h1 className="text-[#000000] dark:text-white tracking-tighter text-[56px] font-extrabold leading-none text-center font-sans">{calculateDday()}일</h1>
                </div>

                {/* Settings Sections */}
                <div className="px-6 py-8 flex flex-col gap-10">
                    {/* Section 3: Date Picker Area */}
                    <div className="flex flex-col gap-3">
                        <label className="text-[11px] font-bold uppercase tracking-widest text-gray-400 font-sans">처음 만난 날 설정</label>
                        <div className="flex items-center justify-between p-4 border border-black dark:border-white rounded-xl">
                            <span className="text-base font-medium font-sans">2020년 10월 14일</span>
                            <span className="material-symbols-outlined text-gray-400">calendar_today</span>
                        </div>
                    </div>

                    {/* Section 4: Theme Toggle */}
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-base font-bold font-sans">다크 모드 테마</p>
                            <p className="text-xs text-gray-400 font-sans">시스템 설정에 맞춥니다</p>
                        </div>
                        {/* Pill-shaped B&W Toggle */}
                        <div
                            onClick={() => {
                                setIsDarkMode(!isDarkMode);
                                document.documentElement.className = !isDarkMode ? 'dark' : 'light';
                            }}
                            className={`w-14 h-7 rounded-full flex items-center px-1 cursor-pointer transition-colors ${isDarkMode ? 'bg-white' : 'bg-black'}`}
                        >
                            <div className={`w-5 h-5 rounded-full transition-transform ${isDarkMode ? 'bg-black translate-x-7' : 'bg-white ml-auto'}`}></div>
                        </div>
                    </div>

                    {/* Section 5: Passcode */}
                    <div className="flex items-center justify-between cursor-pointer">
                        <div>
                            <p className="text-base font-bold font-sans">암호 잠금</p>
                            <p className="text-xs text-gray-400 font-sans">앱 실행 시 4자리 비밀번호 사용</p>
                        </div>
                        <span className="material-symbols-outlined">lock_open</span>
                    </div>

                    {/* Section 6: Danger Zone */}
                    <div className="flex flex-col gap-4 pt-4">
                        <button onClick={handleLogout} className="text-left text-sm text-gray-400 font-medium hover:text-red-500 transition-colors font-sans">로그아웃</button>
                        <button onClick={handleDisconnect} className="text-left text-sm text-gray-400 font-medium hover:text-red-500 transition-colors font-sans">연결 끊기</button>
                    </div>
                </div>
            </div>
            {/* Bottom Nav is handled by MainLayout if this is nested, but the design shows it here. 
                If we use MainLayout, we don't need it here. User's HTML included it. 
                Since we have MainLayout, I will relying on that for Nav. 
            */}
        </div>
    );
};
