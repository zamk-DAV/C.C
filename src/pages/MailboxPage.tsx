import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { format } from 'date-fns';
import type { Postcard } from '../types';

export const MailboxPage: React.FC = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');

    // Firestore Integration
    const { user, coupleData } = useAuth();
    const [postcards, setPostcards] = useState<Postcard[]>([]);

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
                    // Ensure date is formatted if it's a Timestamp, fallback to string if legacy
                    date: data.createdAt?.toDate ? format(data.createdAt.toDate(), 'yyyy. MM. dd') : data.date
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

    return (
        <div className="relative flex min-h-[100dvh] w-full max-w-md mx-auto flex-col bg-background font-display text-primary transition-colors duration-300">
            {/* Header */}
            <header className="sticky top-0 z-10 flex flex-col bg-background/95 backdrop-blur-md transition-colors duration-300">
                <div className="flex items-center px-6 pt-6 pb-2 justify-between">
                    <div
                        onClick={() => navigate(-1)}
                        className="flex size-10 shrink-0 items-center justify-start text-primary cursor-pointer"
                    >
                        <span className="material-symbols-outlined">arrow_back_ios</span>
                    </div>
                    <h2 className="text-primary text-xl font-bold leading-tight tracking-tight flex-1 text-center pr-10">우편함</h2>
                </div>

                {/* Tabs */}
                <div className="flex w-full px-6 mt-4 border-b border-border">
                    <button
                        onClick={() => setActiveTab('received')}
                        className={`flex-1 py-3 text-sm font-bold transition-colors ${activeTab === 'received' ? 'border-b-2 border-primary text-primary' : 'border-b-2 border-transparent text-text-secondary'}`}
                    >
                        받은 우편
                    </button>
                    <button
                        onClick={() => setActiveTab('sent')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'sent' ? 'border-b-2 border-primary text-primary' : 'border-b-2 border-transparent text-text-secondary'}`}
                    >
                        보낸 우편
                    </button>
                </div>

                {/* Filter / Count */}
                <div className="px-6 py-4 flex justify-between items-center">
                    <p className="text-[10px] text-text-secondary font-medium uppercase tracking-[0.2em]">
                        총 {filteredPostcards.length}개의 {activeTab === 'received' ? '받은' : '보낸'} 우편
                    </p>
                    <span className="material-symbols-outlined text-text-secondary text-sm cursor-pointer hover:text-primary transition-colors">filter_list</span>
                </div>
            </header>

            {/* Content Body */}
            <main className="flex-1 px-6 space-y-10 pb-32 pt-2">
                {filteredPostcards.map((card) => (
                    <div key={card.id} className={`border border-border bg-background overflow-hidden ${card.isRead ? 'opacity-60' : ''}`}>
                        <div className="p-8 pb-6">
                            <div className="mb-10">
                                <p className="font-serif-kr text-lg leading-relaxed text-primary line-clamp-2">
                                    {card.content}
                                </p>
                            </div>
                            <div className="flex items-end justify-between border-t border-border pt-6">
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                        {!card.isRead && <span className="w-1 h-1 rounded-full bg-primary"></span>}
                                        <p className={`${card.isRead ? 'text-text-secondary' : 'text-primary'} text-xs font-bold tracking-tight`}>
                                            {card.senderName}으로부터
                                        </p>
                                    </div>
                                    <p className="text-text-secondary text-[10px] font-medium tracking-widest uppercase">{card.date}</p>
                                </div>
                                <a
                                    href="#"
                                    className={`${card.isRead ? 'text-text-secondary no-underline' : 'text-primary underline underline-offset-8'} text-xs font-bold tracking-tight`}
                                >
                                    열기
                                </a>
                            </div>
                        </div>
                    </div>
                ))}

                <div className="py-12 text-center">
                    <span className="material-symbols-outlined text-border">fiber_manual_record</span>
                </div>
            </main>
        </div>
    );
};
