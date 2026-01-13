import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { DatePickerModal } from '../common/DatePickerModal';

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
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

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
                openDate: scheduledDate || null
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

    const formatDisplayDate = (dateStr: string) => {
        if (!dateStr) return '지금 바로 보내기';
        try {
            return format(new Date(dateStr), 'yyyy년 M월 d일', { locale: ko });
        } catch {
            return dateStr;
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
                        className="fixed inset-x-4 bottom-24 top-40 z-50 bg-background rounded-xl shadow-2xl overflow-hidden max-w-lg mx-auto flex flex-col"
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
                                className="w-full h-full min-h-[120px] bg-transparent text-primary placeholder-text-secondary/50 resize-none outline-none font-serif text-lg leading-relaxed"
                                autoFocus
                            />
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-border space-y-3">
                            {/* Scheduled Date Button */}
                            <button
                                onClick={() => setIsDatePickerOpen(true)}
                                className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-secondary/50 transition-colors"
                            >
                                <span className="material-symbols-outlined text-text-secondary">
                                    {scheduledDate ? 'event' : 'schedule'}
                                </span>
                                <div className="flex-1 text-left">
                                    <p className="text-[10px] text-text-secondary uppercase tracking-widest">
                                        예약 발송
                                    </p>
                                    <p className={`text-sm font-medium ${scheduledDate ? 'text-primary' : 'text-text-secondary'}`}>
                                        {formatDisplayDate(scheduledDate)}
                                    </p>
                                </div>
                                <span className="material-symbols-outlined text-text-secondary text-[18px]">
                                    chevron_right
                                </span>
                            </button>

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

                    {/* Date Picker Modal */}
                    <DatePickerModal
                        isOpen={isDatePickerOpen}
                        onClose={() => setIsDatePickerOpen(false)}
                        onSelect={setScheduledDate}
                        selectedDate={scheduledDate}
                    />
                </>
            )}
        </AnimatePresence>
    );
};
