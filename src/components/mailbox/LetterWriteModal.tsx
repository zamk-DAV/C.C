import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface LetterWriteModalProps {
    isOpen: boolean;
    onClose: () => void;
    coupleId: string;
    senderId: string;
    senderName: string;
    recipientName: string;
}

export const LetterWriteModal: React.FC<LetterWriteModalProps> = ({
    isOpen,
    onClose,
    coupleId,
    senderId,
    senderName,
    recipientName
}) => {
    const [content, setContent] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [scheduledDate, setScheduledDate] = useState('');

    const handleSend = async () => {
        if (!content.trim() || !coupleId) return;

        setIsLoading(true);
        try {
            await addDoc(collection(db, 'couples', coupleId, 'postcards'), {
                senderId,
                senderName,
                content: content.trim(),
                createdAt: serverTimestamp(),
                isRead: false,
                openDate: scheduledDate || null // If scheduled, letter is locked until this date
            });

            setContent('');
            setScheduledDate('');
            onClose();
        } catch (error) {
            console.error("Failed to send letter:", error);
            alert('편지 발송에 실패했습니다. 다시 시도해주세요.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        if (content.trim() && !isLoading) {
            if (window.confirm('작성 중인 편지가 있습니다. 정말 닫으시겠습니까?')) {
                setContent('');
                setScheduledDate('');
                onClose();
            }
        } else {
            onClose();
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, y: 100 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 100 }}
                        className="fixed inset-x-4 bottom-24 top-20 z-50 bg-background rounded-xl shadow-2xl overflow-hidden max-w-lg mx-auto flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold tracking-[0.2em] text-text-secondary">
                                    NEW LETTER
                                </span>
                                <h3 className="text-lg font-bold text-primary italic">
                                    To. {recipientName}
                                </h3>
                            </div>
                            <button
                                onClick={handleClose}
                                className="p-2 hover:bg-secondary rounded-full transition-colors"
                            >
                                <span className="material-symbols-outlined text-primary">close</span>
                            </button>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 p-6 overflow-y-auto">
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="마음을 담아 편지를 써보세요..."
                                className="w-full h-full min-h-[200px] bg-transparent text-primary placeholder-text-secondary/50 resize-none outline-none font-serif text-lg leading-relaxed"
                                autoFocus
                            />
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-border space-y-4">
                            {/* Scheduled Date (Optional) */}
                            <div className="flex items-center gap-4">
                                <span className="material-symbols-outlined text-text-secondary">schedule</span>
                                <div className="flex-1">
                                    <label className="text-[10px] text-text-secondary uppercase tracking-widest">
                                        예약 발송 (선택)
                                    </label>
                                    <input
                                        type="date"
                                        value={scheduledDate}
                                        onChange={(e) => setScheduledDate(e.target.value)}
                                        min={new Date().toISOString().split('T')[0]}
                                        className="w-full bg-transparent text-primary text-sm outline-none border-b border-border py-1 focus:border-primary transition-colors"
                                    />
                                </div>
                            </div>

                            {/* Send Button */}
                            <button
                                onClick={handleSend}
                                disabled={isLoading || !content.trim()}
                                className="w-full py-4 bg-primary text-background font-bold text-sm uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:opacity-90 active:scale-[0.98]"
                            >
                                {isLoading ? '발송 중...' : (scheduledDate ? '예약 발송' : '지금 보내기')}
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
