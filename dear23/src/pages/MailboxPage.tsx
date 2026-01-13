import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { format, parseISO } from 'date-fns';
import { LetterWriteModal } from '../components/mailbox/LetterWriteModal';
import { LetterDetailModal } from '../components/mailbox/LetterDetailModal';
import { useLetterData } from '../context/NotionContext';

export const MailboxPage: React.FC = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');
    const { user, userData, partnerData, coupleData } = useAuth();
    const { letterData, isLoading } = useLetterData();

    // Modal States
    const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);
    const [selectedLetter, setSelectedLetter] = useState<any | null>(null);

    // Filter letters based on active tab and author
    const filteredLetters = letterData.filter(letter => {
        const isFromMe = letter.author === userData?.name || letter.author === '나';
        if (activeTab === 'received') return !isFromMe;
        if (activeTab === 'sent') return isFromMe;
        return true;
    });

    const handleOpenLetter = (letter: any) => {
        // Transform NotionItem to Postcard-like structure for the modal
        setSelectedLetter({
            id: letter.id,
            content: letter.previewText || letter.title, // In Notion, content might be in title or preview
            senderName: letter.author,
            date: letter.date,
            senderId: letter.author === userData?.name ? user?.uid : 'partner' // Mock ID for mapping
        });
    };

    return (
        <div className="relative flex min-h-[100dvh] w-full max-w-md mx-auto flex-col bg-background font-display text-primary transition-colors duration-300 border-x border-border font-display">

            {/* Header */}
            <header className="sticky top-0 z-10 flex flex-col bg-background/95 backdrop-blur-md transition-colors duration-300">
                <div className="flex items-center px-6 pt-6 pb-2 justify-between">
                    <div
                        onClick={() => navigate(-1)}
                        className="flex size-10 shrink-0 items-center justify-start text-primary cursor-pointer"
                    >
                        <span className="material-symbols-outlined">arrow_back_ios</span>
                    </div>
                    <h2 className="text-primary text-xl font-bold leading-tight tracking-tight flex-1 text-center pr-10 italic">우리 우편함</h2>
                </div>
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
                {isLoading ? (
                    <div className="py-20 text-center text-text-secondary font-light italic">
                        불러오는 중...
                    </div>
                ) : filteredLetters.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-text-secondary">
                        <span className="material-symbols-outlined text-4xl mb-4 opacity-50">mail</span>
                        <p className="text-sm font-medium">
                            {activeTab === 'received' ? '받은 우편이 없습니다' : '보낸 우편이 없습니다'}
                        </p>
                        <p className="text-xs mt-1 opacity-70 italic">
                            {activeTab === 'received' ? '파트너의 편지를 기다려보세요' : '파트너에게 편지를 보내보세요'}
                        </p>
                    </div>
                ) : (
                    filteredLetters.map((letter) => {
                        const isFromMe = letter.author === userData?.name || letter.author === '나';
                        // Check if it's a scheduled letter that is not yet openable (simplified for MVP)
                        const isLocked = letter.date && new Date(letter.date) > new Date();

                        return (
                            <div
                                key={letter.id}
                                className={`group relative p-6 border transition-all ${isLocked
                                    ? 'border-border/30 opacity-50'
                                    : 'border-primary hover:bg-secondary/30 cursor-pointer'
                                    }`}
                                onClick={() => !isLocked && handleOpenLetter(letter)}
                            >
                                {/* Content Preview */}
                                <div className="mb-6">
                                    <p className={`font-serif text-lg leading-relaxed line-clamp-3 ${isLocked
                                        ? 'text-text-secondary/50 italic'
                                        : 'text-primary'
                                        }`}>
                                        {isLocked
                                            ? '아직 열 수 없는 편지입니다...'
                                            : letter.previewText || letter.title
                                        }
                                    </p>
                                </div>

                                {/* Footer */}
                                <div className="flex items-end justify-between">
                                    <div className="flex flex-col gap-0.5">
                                        <span className={`text-[11px] font-bold tracking-wider ${isLocked ? 'text-text-secondary' : 'text-primary'
                                            }`}>
                                            {activeTab === 'received' ? 'FROM.' : 'TO.'} {letter.author}
                                        </span>
                                        <span className={`text-[10px] uppercase tracking-widest text-text-secondary/60`}>
                                            {letter.date}
                                        </span>
                                    </div>

                                    <button
                                        className={`flex items-center gap-1 transition-transform ${isLocked
                                            ? 'cursor-not-allowed text-text-secondary/50'
                                            : 'active:scale-95 text-primary'
                                            }`}
                                        disabled={!!isLocked}
                                    >
                                        <span className={`text-xs font-bold border-b pb-0.5 ${isLocked ? 'border-border/50' : 'border-primary'
                                            }`}>
                                            {isLocked ? '잠김' : '열기'}
                                        </span>
                                        <span className="material-symbols-outlined text-[14px]">
                                            {isLocked ? 'lock' : 'arrow_forward'}
                                        </span>
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}

                {/* End Marker */}
                {!isLoading && filteredLetters.length > 0 && (
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
                isFromMe={selectedLetter?.author === userData?.name || selectedLetter?.author === '나'}
            />
        </div>
    );
};
