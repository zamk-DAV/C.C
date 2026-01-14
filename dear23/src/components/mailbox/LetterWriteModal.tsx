import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { DatePickerModal } from '../common/DatePickerModal';
import { LetterService } from '../../lib/firebase/services';

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
        if (!content.trim()) return;

        setIsLoading(true);
        try {
            await LetterService.addLetter(coupleId, senderId, {
                content: content.trim(),
                senderName: senderName,
                recipientName: recipientName,
                date: scheduledDate || new Date().toISOString().split('T')[0]
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
        <AnimatePresence mode="wait">
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed inset-x-4 bottom-24 top-40 z-[101] bg-background rounded-xl shadow-2xl overflow-hidden max-w-lg mx-auto flex flex-col border border-border"
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
                        <div className="px-6 py-4 border-t border-border space-y-3 bg-secondary/10">
                            {/* Scheduled Date Button */}
                            <button
                                onClick={() => setIsDatePickerOpen(true)}
                                className="w-full flex items-center gap-3 p-3 rounded-lg border border-border bg-background hover:bg-secondary/50 transition-colors"
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
                                className="w-full py-4 bg-primary text-background font-bold text-sm uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:opacity-90 active:scale-[0.98] shadow-lg flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                                        <span>발송 중...</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-sm">send</span>
                                        <span>{scheduledDate ? '예약 발송' : '지금 보내기'}</span>
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Loading Overlay Animation */}
                        <AnimatePresence>
                            {isLoading && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute inset-0 bg-background/80 backdrop-blur-md z-[110] flex flex-col items-center justify-center"
                                >
                                    <motion.div
                                        animate={{
                                            scale: [1, 1.2, 1],
                                            opacity: [0.5, 1, 0.5]
                                        }}
                                        transition={{
                                            duration: 2,
                                            repeat: Infinity,
                                            ease: "easeInOut"
                                        }}
                                        className="mb-6"
                                    >
                                        <span className="material-symbols-outlined text-6xl text-primary opacity-20">mail</span>
                                    </motion.div>
                                    <h2 className="text-xl font-bold text-primary mb-2 italic">마음을 전하는 중...</h2>
                                    <div className="flex items-center gap-1">
                                        {[0, 1, 2].map((i) => (
                                            <motion.div
                                                key={i}
                                                animate={{
                                                    scale: [1, 1.5, 1],
                                                    opacity: [0.3, 1, 0.3]
                                                }}
                                                transition={{
                                                    duration: 1,
                                                    repeat: Infinity,
                                                    delay: i * 0.2
                                                }}
                                                className="size-1.5 bg-primary rounded-full"
                                            />
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
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
