import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import type { Postcard } from '../types';
import { LetterWriteModal } from '../components/mailbox/LetterWriteModal';
import { LetterDetailModal } from '../components/mailbox/LetterDetailModal';

export const MailboxPage: React.FC = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');

    // Firestore Integration
    const { user, userData, partnerData, coupleData } = useAuth();
    const [postcards, setPostcards] = useState<Postcard[]>([]);

    // Modal States
    const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);
    const [selectedLetter, setSelectedLetter] = useState<Postcard | null>(null);

    useEffect(() => {
        if (!coupleData?.id) return;

        const q = query(
            collection(db, 'couples', coupleData.id, 'postcards'),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const items = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    date: data.createdAt?.toDate ? format(data.createdAt.toDate(), 'yyyy.MM.dd') : data.date
                } as Postcard;
            });
            setPostcards(items);
        });

        return () => unsubscribe();
    }, [coupleData?.id]);

    // Local filter for tabs
    const filteredPostcards = postcards.filter(card => {
        if (activeTab === 'received') return card.senderId !== user?.uid;
        if (activeTab === 'sent') return card.senderId === user?.uid;
        return true;
    });

    // Calculate edition number based on total postcards
    const editionNumber = String(postcards.length + 1).padStart(2, '0');

    // Handle open letter - mark as read
    const handleOpenLetter = async (letter: Postcard) => {
        setSelectedLetter(letter);

        // Mark as read if not already
        if (!letter.isRead && letter.senderId !== user?.uid && coupleData?.id) {
            try {
                await updateDoc(doc(db, 'couples', coupleData.id, 'postcards', letter.id), {
                    isRead: true
                });
            } catch (error) {
                console.error("Failed to mark as read:", error);
            }
        }
    };

    return (
        <div className="relative flex min-h-[100dvh] w-full max-w-md mx-auto flex-col bg-background font-display text-primary transition-colors duration-300 border-x border-border">

            {/* Editorial Header */}
            <header className="flex items-center px-6 pt-8 pb-4 justify-between sticky top-0 bg-background z-10">
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold tracking-[0.2em] text-text-secondary mb-1">
                        EDITION NO. {editionNumber}
                    </span>
                    <h2 className="text-primary text-2xl font-bold leading-tight tracking-tight uppercase italic">
                        VOL. 01 / INBOX
                    </h2>
                </div>
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 border border-primary rounded-full flex items-center justify-center hover:bg-secondary transition-colors"
                >
                    <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                </button>
            </header>

            {/* Segmented Tab System */}
            <div className="px-6 py-4">
                <div className="flex h-12 w-full border border-primary p-0">
                    <button
                        onClick={() => setActiveTab('received')}
                        className={`flex-1 flex items-center justify-center transition-all ${activeTab === 'received'
                            ? 'bg-primary text-background'
                            : 'bg-background text-primary hover:bg-secondary'
                            }`}
                    >
                        <span className="text-sm font-bold tracking-tight">받은 우편</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('sent')}
                        className={`flex-1 flex items-center justify-center border-l border-primary transition-all ${activeTab === 'sent'
                            ? 'bg-primary text-background'
                            : 'bg-background text-primary hover:bg-secondary'
                            }`}
                    >
                        <span className="text-sm font-bold tracking-tight">보낸 우편</span>
                    </button>
                </div>
            </div>

            {/* Letter List Container */}
            <main className="flex-1 px-6 space-y-6 pb-32">
                {filteredPostcards.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-text-secondary">
                        <span className="material-symbols-outlined text-4xl mb-4 opacity-50">mail</span>
                        <p className="text-sm font-medium">
                            {activeTab === 'received' ? '받은 우편이 없습니다' : '보낸 우편이 없습니다'}
                        </p>
                        <p className="text-xs mt-1 opacity-70">
                            {activeTab === 'received' ? '파트너의 편지를 기다려보세요' : '파트너에게 편지를 보내보세요'}
                        </p>
                    </div>
                ) : (
                    filteredPostcards.map((card) => {
                        const isUnread = !card.isRead && card.senderId !== user?.uid;
                        const isLocked = card.openDate && new Date(card.openDate) > new Date();

                        return (
                            <div
                                key={card.id}
                                className={`group relative p-6 border transition-all ${isLocked
                                    ? 'border-border/30 opacity-60'
                                    : 'border-primary hover:bg-secondary/30 cursor-pointer'
                                    }`}
                                onClick={() => !isLocked && handleOpenLetter(card)}
                            >
                                {/* Content Preview */}
                                <div className="mb-6">
                                    <p className={`font-serif text-lg leading-relaxed line-clamp-3 ${isLocked
                                        ? 'text-text-secondary italic'
                                        : 'text-primary'
                                        }`}>
                                        {isLocked
                                            ? '아직 열 수 없는 편지입니다...'
                                            : card.content
                                        }
                                    </p>
                                </div>

                                {/* Footer */}
                                <div className="flex items-end justify-between">
                                    <div className="flex flex-col gap-0.5">
                                        <span className={`text-[11px] font-bold tracking-wider ${isLocked ? 'text-text-secondary' : 'text-primary'}`}>
                                            {activeTab === 'received' ? 'FROM.' : 'TO.'} {card.senderName}
                                        </span>
                                        <span className="text-[10px] text-text-secondary uppercase tracking-widest">
                                            {card.date}
                                        </span>
                                    </div>

                                    <button
                                        className={`flex items-center gap-1 transition-transform ${isLocked
                                            ? 'cursor-not-allowed text-text-secondary'
                                            : 'active:scale-95 text-primary'
                                            }`}
                                        disabled={!!isLocked}
                                    >
                                        <span className={`text-xs font-bold border-b pb-0.5 ${isLocked ? 'border-border' : 'border-primary'
                                            }`}>
                                            {isLocked ? '잠김' : (isUnread ? '읽기' : '열기')}
                                        </span>
                                        <span className="material-symbols-outlined text-[14px]">
                                            {isLocked ? 'lock' : 'arrow_forward'}
                                        </span>
                                    </button>
                                </div>

                                {/* Unread Indicator */}
                                {isUnread && !isLocked && (
                                    <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-primary animate-pulse" />
                                )}
                            </div>
                        );
                    })
                )}

                {/* End Marker */}
                {filteredPostcards.length > 0 && (
                    <div className="py-8 text-center">
                        <span className="text-[10px] text-text-secondary tracking-widest">END OF EDITION</span>
                    </div>
                )}
            </main>

            {/* Floating Action Button for New Letter */}
            <button
                onClick={() => setIsWriteModalOpen(true)}
                className="fixed bottom-24 right-6 size-14 bg-primary text-background rounded-full shadow-xl flex items-center justify-center transition-transform hover:scale-110 active:scale-95 z-10"
            >
                <span className="material-symbols-outlined text-2xl">add</span>
            </button>

            {/* Modals */}
            <LetterWriteModal
                isOpen={isWriteModalOpen}
                onClose={() => setIsWriteModalOpen(false)}
                coupleId={coupleData?.id || ''}
                senderId={user?.uid || ''}
                senderName={userData?.name || '나'}
                recipientName={userData?.partnerNickname || partnerData?.name || '파트너'}
            />

            <LetterDetailModal
                isOpen={!!selectedLetter}
                onClose={() => setSelectedLetter(null)}
                letter={selectedLetter}
                isFromMe={selectedLetter?.senderId === user?.uid}
            />
        </div>
    );
};
