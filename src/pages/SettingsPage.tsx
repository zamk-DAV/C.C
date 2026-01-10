import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { auth, db } from '../lib/firebase';
import { searchNotionDatabases } from '../lib/notion';
import { signOut } from 'firebase/auth';
import { doc, updateDoc, writeBatch } from 'firebase/firestore';

export const SettingsPage: React.FC = () => {
    const { user, userData, partnerData } = useAuth();
    const navigate = useNavigate();

    const [notionKey, setNotionKey] = useState('');
    const [notionDbId, setNotionDbId] = useState(''); // Added DB ID input as it's required for the proxy
    const [isSaving, setIsSaving] = useState(false);
    const [showKey, setShowKey] = useState(false);

    // Theme State (Mocked for now, persists in local storage usually)
    const [isDarkMode, setIsDarkMode] = useState(false);

    const [databases, setDatabases] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        if (userData?.notionConfig) {
            setNotionKey(userData.notionConfig.apiKey || '');
            setNotionDbId(userData.notionConfig.databaseId || '');
        }
    }, [userData]);

    const handleSearchDatabases = async () => {
        if (!notionKey) return;
        setIsSearching(true);
        try {
            const dbs = await searchNotionDatabases(notionKey);
            setDatabases(dbs);
            if (dbs.length > 0 && !notionDbId) {
                setNotionDbId(dbs[0].id);
            } else if (dbs.length === 0) {
                alert("No databases found. Please check your API Key and ensure the integration is connected to your pages.");
            }
        } catch (error) {
            console.error("Failed to search databases", error);
            alert("Failed to search databases. Check your API Key.");
        } finally {
            setIsSearching(false);
        }
    };

    const handleSaveNotion = async () => {
        if (!user) return;
        setIsSaving(true);
        try {
            await updateDoc(doc(db, 'users', user.uid), {
                notionConfig: {
                    apiKey: notionKey,
                    databaseId: notionDbId
                }
            });
            alert("Notion configuration saved!");
        } catch (error) {
            console.error("Failed to save Notion config", error);
        } finally {
            setIsSaving(false);
        }
    };

    // ... inside render ...



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

                    {/* Section 6: Notion API Key & DB ID */}
                    <div className="flex flex-col gap-3">
                        <div className="flex justify-between items-center">
                            <label className="text-[11px] font-bold uppercase tracking-widest text-gray-400 font-sans">노션 연동 설정</label>
                            {userData?.notionConfig?.apiKey && <span className="text-[10px] text-primary font-bold font-sans">연동됨</span>}
                        </div>

                        <div className="relative">
                            <input
                                className="w-full p-4 border border-black dark:border-white rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-transparent mb-2 font-sans"
                                placeholder="노션 API 키 (secret_...)"
                                type={showKey ? "text" : "password"}
                                value={notionKey}
                                onChange={(e) => setNotionKey(e.target.value)}
                                onBlur={() => { if (notionKey.length > 10) handleSearchDatabases(); }}
                            />
                            <div className="absolute right-4 top-4 flex gap-2 cursor-pointer" onClick={() => setShowKey(!showKey)}>
                                <span className="material-symbols-outlined text-gray-400 text-lg">
                                    {showKey ? 'visibility' : 'visibility_off'}
                                </span>
                            </div>
                        </div>

                        {/* Database Selection */}
                        {isSearching ? (
                            <div className="text-center py-2 text-xs text-gray-400">데이터베이스 검색 중...</div>
                        ) : databases.length > 0 ? (
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] text-gray-400 font-sans ml-1">데이터베이스 선택</label>
                                <select
                                    className="w-full p-4 border border-black dark:border-white rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-transparent font-sans appearance-none"
                                    value={notionDbId}
                                    onChange={(e) => setNotionDbId(e.target.value)}
                                >
                                    {databases.map(db => (
                                        <option key={db.id} value={db.id} className="text-black">
                                            {db.icon?.emoji} {db.title}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        ) : notionDbId ? (
                            <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-gray-900">
                                <p className="text-xs text-gray-500 text-center">현재 데이터베이스 ID: {notionDbId.slice(0, 8)}...</p>
                                <button onClick={handleSearchDatabases} className="w-full mt-2 text-xs text-primary font-bold underline">데이터베이스 다시 검색</button>
                            </div>
                        ) : null}

                        <button
                            onClick={handleSaveNotion}
                            disabled={isSaving || !notionDbId}
                            className="bg-black dark:bg-white text-white dark:text-black py-3 rounded-xl font-bold text-sm mt-1 disabled:opacity-50"
                        >
                            {isSaving ? '저장 중...' : '설정 저장'}
                        </button>
                    </div>

                    {/* Section 7: Danger Zone */}
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
