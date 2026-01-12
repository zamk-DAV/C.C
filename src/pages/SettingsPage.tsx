import React, { useState, useEffect } from 'react';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { auth, db } from '../lib/firebase';
import { searchNotionDatabases, validateNotionSchema } from '../lib/notion';
import { signOut } from 'firebase/auth';
import { doc, updateDoc, writeBatch } from 'firebase/firestore';
import { PinInput } from '../components/common/PinInput';
import { useTheme } from '../context/ThemeContext';

export const SettingsPage: React.FC = () => {
    const { user, userData, partnerData, coupleData } = useAuth();
    const navigate = useNavigate();

    const [notionKey, setNotionKey] = useState('');
    const [notionDbId, setNotionDbId] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [showKey, setShowKey] = useState(false);
    const [startDate, setStartDate] = useState('');

    // Passcode State
    const [isPasscodeModalOpen, setIsPasscodeModalOpen] = useState(false);
    const [passcodeMode, setPasscodeMode] = useState<'SET' | 'CONFIRM' | 'DISABLE' | 'VERIFY_TO_SET'>('SET');
    const [tempPasscode, setTempPasscode] = useState('');
    const [passcodeInput, setPasscodeInput] = useState('');
    const [passcodeError, setPasscodeError] = useState(false);

    useEffect(() => {
        if (coupleData?.startDate) {
            setStartDate(coupleData.startDate);
        }
    }, [coupleData]);

    // Theme State handled by Context
    const { theme, setTheme } = useTheme();

    const themes: { id: string; name: string; color: string }[] = [
        { id: 'default', name: '기본', color: '#000000' },
        { id: 'apple', name: '애플', color: '#8B3A4A' },
        { id: 'forest-friends', name: '숲속', color: '#5A6B51' },
        { id: 'clay', name: '지점토', color: '#6E6062' },
        { id: 'calico-cat', name: '삼색냥', color: '#8B7875' },
        { id: 'morning-glow', name: '노을', color: '#AA7B65' },
        { id: 'pastel', name: '파스텔', color: '#8A92A0' },
        { id: 'purple-milktea', name: '퍼플티', color: '#3C4362' },
        { id: 'modern-house', name: '모던', color: '#B3B9C1' },
        { id: 'grayscale', name: '무채색', color: '#dfdfdf' },
        { id: 'everest-night', name: '밤하늘', color: '#a1a2ab' },
        { id: 'dark-mode', name: '다크', color: '#ffffff' },
    ];

    const [databases, setDatabases] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // Sync Notion config from Firestore - use primitive dependencies to avoid loops
    const coupleApiKey = coupleData?.notionConfig?.apiKey;
    const coupleDbId = coupleData?.notionConfig?.databaseId;
    const userApiKey = userData?.notionConfig?.apiKey;
    const userDbId = userData?.notionConfig?.databaseId;

    useEffect(() => {
        if (coupleApiKey) {
            setNotionKey(coupleApiKey);
            setNotionDbId(coupleDbId || '');
        } else if (userApiKey) {
            // Fallback for legacy data
            setNotionKey(userApiKey);
            setNotionDbId(userDbId || '');
        }
    }, [coupleApiKey, coupleDbId, userApiKey, userDbId]);

    const handleSearchDatabases = async () => {
        if (!notionKey) return;
        setIsSearching(true);
        try {
            const dbs = await searchNotionDatabases(notionKey);
            setDatabases(dbs);
            if (dbs.length > 0) {
                // API Key가 변경되면 해당 Integration이 접근 가능한 첫 번째 데이터베이스로 자동 설정
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
        if (!user || !userData?.coupleId) {
            alert("파트너와 연결된 상태에서만 설정할 수 있습니다.");
            return;
        }
        setIsSaving(true);
        try {
            // 1. Smart Initialization (Schema Validation)
            const validation = await validateNotionSchema(notionKey, notionDbId);

            let message = "노션 연동이 완료되었습니다!";
            if (validation.created && validation.created.length > 0) {
                message += `\n(자동 생성된 속성: ${validation.created.join(', ')})`;
            }

            // 2. Shared Config Save
            await updateDoc(doc(db, 'couples', userData.coupleId), {
                notionConfig: {
                    apiKey: notionKey,
                    databaseId: notionDbId
                }
            });
            alert(message);
        } catch (error: any) {
            console.error("Failed to save Notion config", error);
            alert(`설정 저장 실패: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    };

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
        if (!coupleData?.startDate) return "0";
        const start = parseISO(coupleData.startDate);
        const now = new Date();
        return differenceInCalendarDays(now, start) + 1;
    };

    const handleDateChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const newDate = e.target.value;
        setStartDate(newDate);

        if (userData?.coupleId) {
            try {
                await updateDoc(doc(db, 'couples', userData.coupleId), {
                    startDate: newDate
                });
            } catch (error) {
                console.error("Failed to update start date:", error);
                alert("날짜 변경에 실패했습니다.");
            }
        } else {
            console.error("No coupleId found in userData");
            alert("파트너와 연결되지 않아 날짜를 저장할 수 없습니다.");
        }
    };

    const handlePasscodeClick = () => {
        setPasscodeInput('');
        setPasscodeError(false);
        setTempPasscode('');

        if (userData?.passcode) {
            // Already has passcode -> Try to disable
            setPasscodeMode('DISABLE');
        } else {
            // No passcode -> Set new one
            setPasscodeMode('SET');
        }
        setIsPasscodeModalOpen(true);
    };

    const handlePinComplete = async (pin: string) => {
        if (passcodeMode === 'SET') {
            setTempPasscode(pin);
            setPasscodeInput('');
            setPasscodeMode('CONFIRM');
        } else if (passcodeMode === 'CONFIRM') {
            if (pin === tempPasscode) {
                // Save to Firestore
                try {
                    if (!user) return;
                    await updateDoc(doc(db, 'users', user.uid), {
                        passcode: pin
                    });
                    alert("암호가 설정되었습니다.");
                    setIsPasscodeModalOpen(false);
                } catch (error) {
                    console.error("Failed to set passcode", error);
                    alert("암호 설정 실패");
                }
            } else {
                setPasscodeError(true);
                setTimeout(() => {
                    setPasscodeInput('');
                    setPasscodeError(false);
                    // Stay in CONFIRM mode but clear input
                }, 500);
            }
        } else if (passcodeMode === 'DISABLE') {
            if (pin === userData?.passcode) {
                // Remove from Firestore
                try {
                    if (!user) return;
                    await updateDoc(doc(db, 'users', user.uid), {
                        passcode: null // Remove field
                    });
                    alert("암호 잠금이 해제되었습니다.");
                    setIsPasscodeModalOpen(false);
                } catch (error) {
                    console.error("Failed to remove passcode", error);
                    alert("암호 해제 실패");
                }
            } else {
                setPasscodeError(true);
                setTimeout(() => {
                    setPasscodeInput('');
                    setPasscodeError(false);
                }, 500);
            }
        }
    }

    return (
        <div className="relative flex h-screen w-full flex-col max-w-[480px] mx-auto overflow-hidden bg-background border-x border-border font-display transition-colors duration-300">
            {/* TopAppBar */}
            <div className="flex items-center bg-background p-6 pb-2 justify-between sticky top-0 z-10">
                <div
                    onClick={() => navigate(-1)}
                    className="text-primary flex size-10 shrink-0 items-center justify-start cursor-pointer"
                    data-icon="ArrowBack"
                    data-size="24px"
                >
                    <span className="material-symbols-outlined">arrow_back_ios</span>
                </div>
                <h2 className="text-primary text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-10">설정</h2>
            </div>

            {/* Scrollable Area */}
            <div className="flex-1 overflow-y-auto pb-32 no-scrollbar">
                {/* Profiles Side-by-Side */}
                <div className="flex px-6 py-8 justify-between items-center gap-4">
                    <div className="flex flex-col items-center gap-3 flex-1">
                        <div
                            className="bg-center bg-no-repeat aspect-square bg-cover rounded-2xl w-24 h-24 border border-border grayscale-img bg-secondary"
                            style={userData?.photoURL ? { backgroundImage: `url(${userData.photoURL})` } : {}}
                        ></div>
                        <div className="text-center">
                            <p className="text-text-secondary text-xs font-medium uppercase tracking-widest opacity-50 font-sans">내 프로필</p>
                            <p className="text-primary text-base font-bold font-sans">{userData?.name || '나'}</p>
                        </div>
                    </div>
                    <div className="flex items-center">
                        <span className="material-symbols-outlined text-border">favorite</span>
                    </div>
                    <div className="flex flex-col items-center gap-3 flex-1">
                        <div
                            className="bg-center bg-no-repeat aspect-square bg-cover rounded-2xl w-24 h-24 border border-border grayscale-img bg-secondary"
                            style={partnerData?.photoURL ? { backgroundImage: `url(${partnerData.photoURL})` } : {}}
                        ></div>
                        <div className="text-center">
                            <p className="text-text-secondary text-xs font-medium uppercase tracking-widest opacity-50 font-sans">상대방 프로필</p>
                            <p className="text-primary text-base font-bold font-sans">{partnerData?.name || '기다리는 중'}</p>
                        </div>
                    </div>
                </div>

                {/* D-Day Center Section */}
                <div className="py-10 border-y border-border">
                    <p className="text-primary text-sm font-medium tracking-[0.2em] text-center uppercase mb-2 font-sans">우리가 함께한 날</p>
                    <h1 className="text-primary tracking-tighter text-[56px] font-extrabold leading-none text-center font-sans">{calculateDday()}일</h1>
                </div>

                {/* Settings Sections */}
                <div className="px-6 py-8 flex flex-col gap-10">
                    {/* Section 3: Date Picker Area */}
                    <div className="flex flex-col gap-3">
                        <label className="text-[11px] font-bold uppercase tracking-widest text-text-secondary font-sans">처음 만난 날 설정</label>
                        <div className="flex items-center justify-between p-4 border border-border rounded-xl relative">
                            <span className="text-base font-medium font-sans text-primary">{startDate || '날짜를 선택하세요'}</span>
                            <span className="material-symbols-outlined text-text-secondary">calendar_today</span>
                            <input
                                type="date"
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full full-click-date-picker"
                                value={startDate}
                                onChange={handleDateChange}
                            />
                        </div>
                    </div>

                    {/* Section 4: Theme Selection */}
                    <div className="flex flex-col gap-3">
                        <label className="text-[11px] font-bold uppercase tracking-widest text-text-secondary font-sans">테마 설정</label>
                        <div className="grid grid-cols-4 gap-3">
                            {themes.map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() => setTheme(t.id as any)}
                                    className={`aspect-square rounded-xl flex flex-col items-center justify-center gap-1 border transition-all ${theme === t.id
                                        ? 'border-primary scale-105 shadow-md ring-1 ring-primary'
                                        : 'border-transparent hover:bg-secondary'
                                        }`}
                                >
                                    <div
                                        className="w-8 h-8 rounded-full shadow-sm border border-gray-200"
                                        style={{ backgroundColor: t.color }}
                                    />
                                    <span className="text-[10px] font-medium text-text-secondary font-sans">{t.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Section 5: Passcode */}
                    <div className="flex items-center justify-between cursor-pointer" onClick={handlePasscodeClick}>
                        <div>
                            <p className="text-base font-bold font-sans text-primary">암호 잠금</p>
                            <p className="text-xs text-text-secondary font-sans">
                                {userData?.passcode ? '앱 실행 시 암호 입력 (설정됨)' : '사용하지 않음'}
                            </p>
                        </div>
                        <span className={`material-symbols-outlined ${userData?.passcode ? 'text-primary' : 'text-text-secondary'}`}>
                            {userData?.passcode ? 'lock' : 'lock_open'}
                        </span>
                    </div>

                    {/* Section 6: Notion API Key & DB ID */}
                    <div className="flex flex-col gap-3">
                        <div className="flex justify-between items-center">
                            <label className="text-[11px] font-bold uppercase tracking-widest text-text-secondary font-sans">노션 연동 설정</label>
                            {userData?.notionConfig?.apiKey && <span className="text-[10px] text-primary font-bold font-sans">연동됨</span>}
                        </div>

                        <div className="relative flex gap-2">
                            <input
                                className="flex-1 p-4 border border-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-transparent font-sans text-primary"
                                placeholder="노션 API 키 (secret_...)"
                                type={showKey ? "text" : "password"}
                                value={notionKey}
                                onChange={(e) => setNotionKey(e.target.value)}
                            />
                            <button
                                onClick={() => setShowKey(!showKey)}
                                className="absolute right-20 top-4 text-text-secondary hover:text-primary transition-colors"
                                type="button"
                            >
                                <span className="material-symbols-outlined text-lg">
                                    {showKey ? 'visibility' : 'visibility_off'}
                                </span>
                            </button>
                            <button
                                onClick={handleSearchDatabases}
                                disabled={isSearching || notionKey.length < 10}
                                className="px-4 py-2 border border-primary text-primary rounded-xl text-sm font-bold hover:bg-primary hover:text-background transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                                type="button"
                            >
                                {isSearching ? '검색 중...' : '검색'}
                            </button>
                        </div>

                        {/* Database Selection */}
                        {isSearching ? (
                            <div className="text-center py-2 text-xs text-text-secondary">데이터베이스 검색 중...</div>
                        ) : databases.length > 0 ? (
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] text-text-secondary font-sans ml-1">데이터베이스 선택</label>
                                <select
                                    className="w-full p-4 border border-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-transparent font-sans appearance-none text-primary"
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
                            <div className="p-4 border border-border rounded-xl bg-secondary">
                                <p className="text-xs text-text-secondary text-center">현재 데이터베이스 ID: {notionDbId.slice(0, 8)}...</p>
                                <button onClick={handleSearchDatabases} className="w-full mt-2 text-xs text-primary font-bold underline">데이터베이스 다시 검색</button>
                            </div>
                        ) : null}

                        <button
                            onClick={handleSaveNotion}
                            disabled={isSaving || !notionDbId}
                            className="bg-primary text-background py-3 rounded-xl font-bold text-sm mt-1 disabled:opacity-50"
                        >
                            {isSaving ? '저장 중...' : '설정 저장'}
                        </button>
                    </div>

                    {/* Section 7: Danger Zone */}
                    <div className="flex flex-col gap-4 pt-4">
                        <button onClick={handleLogout} className="text-left text-sm text-text-secondary font-medium hover:text-red-500 transition-colors font-sans">로그아웃</button>
                        <button onClick={handleDisconnect} className="text-left text-sm text-text-secondary font-medium hover:text-red-500 transition-colors font-sans">연결 끊기</button>
                    </div>
                </div>
            </div>

            {/* Passcode Modal Overlay */}
            {isPasscodeModalOpen && (
                <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background text-primary pb-20 animate-in fade-in zoom-in duration-300">
                    <button
                        onClick={() => setIsPasscodeModalOpen(false)}
                        className="absolute top-6 right-6 p-2 text-text-secondary hover:text-primary transition-colors"
                    >
                        <span className="material-symbols-outlined text-3xl">close</span>
                    </button>

                    <div className="mb-12 flex flex-col items-center gap-4">
                        <span className="material-symbols-outlined text-4xl text-text-secondary">lock</span>
                        <p className="text-sm font-medium tracking-widest uppercase text-text-secondary">
                            {passcodeMode === 'SET' && '새로운 암호 설정'}
                            {passcodeMode === 'CONFIRM' && '암호 확인'}
                            {passcodeMode === 'DISABLE' && '암호 해제'}
                        </p>
                        <h1 className="text-2xl font-bold font-display text-primary">
                            {passcodeMode === 'CONFIRM' ? '한 번 더 입력해주세요' : '4자리 암호를 입력해주세요'}
                        </h1>
                    </div>

                    <div className="w-full max-w-[320px]">
                        <PinInput
                            value={passcodeInput}
                            onChange={setPasscodeInput}
                            onComplete={handlePinComplete}
                            error={passcodeError}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};
