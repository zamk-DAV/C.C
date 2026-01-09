import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { CoupleData } from '../types';

export const ConnectPage: React.FC = () => {
    const { userData, user } = useAuth();
    const navigate = useNavigate();
    const [partnerCode, setPartnerCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [copySuccess, setCopySuccess] = useState(false);

    const handleCopyCode = async () => {
        if (userData?.inviteCode) {
            try {
                await navigator.clipboard.writeText(userData.inviteCode);
                setCopySuccess(true);
                setTimeout(() => setCopySuccess(false), 2000);
            } catch (err) {
                console.error('Failed to copy', err);
            }
        }
    };

    const handleConnect = async () => {
        if (!partnerCode || !user || !userData) return;

        setError('');
        setIsLoading(true);

        try {
            // 1. Find partner by invite code
            const q = query(collection(db, 'users'), where('inviteCode', '==', partnerCode));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                setError('유효하지 않은 코드입니다. 다시 확인해주세요.');
                setIsLoading(false);
                return;
            }

            const partnerDoc = querySnapshot.docs[0];
            const partnerData = partnerDoc.data();

            if (partnerData.uid === user.uid) {
                setError('자신의 코드는 입력할 수 없습니다.');
                setIsLoading(false);
                return;
            }

            if (partnerData.coupleId) {
                setError('상대방이 이미 다른 사람과 연결되어 있습니다.');
                setIsLoading(false);
                return;
            }

            // 2. Create Couple Document
            const coupleData: Omit<CoupleData, 'id'> = {
                members: [user.uid, partnerData.uid],
                startDate: new Date().toISOString(),
                chatId: 'initial_chat_id' // Placeholder, will create chat room usually
            };

            const coupleRef = await addDoc(collection(db, 'couples'), coupleData);
            const newCoupleId = coupleRef.id;

            // 3. Update both users with coupleId (Batch write for atomicity)
            const batch = writeBatch(db);

            const myUserRef = doc(db, 'users', user.uid);
            batch.update(myUserRef, { coupleId: newCoupleId });

            const partnerUserRef = doc(db, 'users', partnerData.uid);
            batch.update(partnerUserRef, { coupleId: newCoupleId });

            await batch.commit();

            // 4. Navigate Home
            navigate('/');

        } catch (err) {
            console.error(err);
            setError('연결 중 오류가 발생했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-[100dvh] bg-background-light dark:bg-background-dark text-primary dark:text-white transition-colors duration-300 font-display flex flex-col items-center w-full">
            <div className="relative flex min-h-screen w-full flex-col max-w-[430px] mx-auto overflow-x-hidden border-x border-neutral-100 dark:border-neutral-900 shadow-sm bg-white dark:bg-black">
                {/* TopAppBar */}
                <header className="flex items-center justify-between p-6 pt-8">
                    <div
                        onClick={() => navigate(-1)}
                        className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                    >
                        <span className="material-symbols-outlined text-2xl">arrow_back_ios_new</span>
                    </div>
                    <h2 className="text-xl font-extrabold tracking-tight flex-1 text-center pr-10">우리 연결하기</h2>
                </header>

                <main className="flex-1 flex flex-col px-6">
                    {/* My Code Section */}
                    <section className="mt-12 mb-16 text-center">
                        <h4 className="text-neutral-400 dark:text-neutral-500 text-xs font-bold uppercase tracking-widest mb-6 font-sans">나의 연결 코드</h4>
                        <div className="relative inline-block">
                            <h1 className="text-primary dark:text-white text-[48px] font-extrabold tracking-[0.25em] leading-tight py-4 font-sans">
                                {userData?.inviteCode || 'LOADING'}
                            </h1>
                            <div className="flex justify-center mt-2">
                                <button
                                    onClick={handleCopyCode}
                                    className="flex items-center gap-2 px-4 py-2 rounded-full border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-all"
                                >
                                    <span className="material-symbols-outlined text-sm">content_copy</span>
                                    <span className="text-xs font-medium font-sans">
                                        {copySuccess ? '복사되었습니다!' : '코드 복사하기'}
                                    </span>
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* Divider */}
                    <div className="flex items-center gap-4 mb-12">
                        <div className="h-[1px] flex-1 bg-neutral-200 dark:bg-neutral-800"></div>
                        <span className="text-[10px] font-bold text-neutral-300 dark:text-neutral-700 uppercase tracking-[0.2em] font-sans">또는</span>
                        <div className="h-[1px] flex-1 bg-neutral-200 dark:bg-neutral-800"></div>
                    </div>

                    {/* Input Section */}
                    <section className="flex flex-col gap-6">
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-bold tracking-tight ml-1 font-sans">상대방의 코드 입력</label>
                            <div className="relative">
                                <input
                                    value={partnerCode}
                                    onChange={(e) => setPartnerCode(e.target.value.toUpperCase())}
                                    className="w-full h-16 bg-neutral-50 dark:bg-neutral-900 border-2 border-neutral-100 dark:border-neutral-800 rounded-xl px-5 text-lg font-bold tracking-widest focus:border-primary dark:focus:border-white focus:ring-0 transition-all placeholder:text-neutral-300 dark:placeholder:text-neutral-700 uppercase font-sans text-center"
                                    maxLength={6}
                                    placeholder="6자리 코드 입력"
                                    type="text"
                                />
                            </div>
                        </div>

                        {error && <p className="text-red-500 text-xs font-bold font-sans text-center">{error}</p>}

                        <button
                            onClick={handleConnect}
                            disabled={isLoading || partnerCode.length !== 6}
                            className="w-full h-16 bg-primary dark:bg-white text-white dark:text-primary rounded-xl font-bold text-lg hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-black/5 font-sans disabled:opacity-50"
                        >
                            {isLoading ? '연결 중...' : '연결하기'}
                        </button>
                    </section>

                    {/* Meta Description */}
                    <section className="mt-8">
                        <p className="text-neutral-400 dark:text-neutral-500 text-sm font-normal leading-relaxed text-center px-8 font-sans">
                            코드를 공유하여 서로를 연결해보세요.<br />
                            연결이 완료되면 단 두 사람만의 공간이 생성됩니다.
                        </p>
                    </section>
                </main>

                <footer className="p-8 flex justify-center opacity-20">
                    <div className="w-12 h-[2px] bg-primary dark:bg-white"></div>
                </footer>
            </div>
        </div>
    );
};
