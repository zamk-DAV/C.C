import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createDiaryEntry, updateDiaryEntry } from '../../lib/notion';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { CalendarEvent } from '../../types';

interface EventWriteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    selectedDate?: Date;
    editEvent?: CalendarEvent; // Added editEvent prop
}

export const EventWriteModal: React.FC<EventWriteModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    selectedDate = new Date(),
    editEvent
}) => {
    const [title, setTitle] = useState('');
    const [time, setTime] = useState('');
    const [note, setNote] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Populate form when editEvent changes or modal opens
    useEffect(() => {
        if (isOpen && editEvent) {
            setTitle(editEvent.title);
            setTime(editEvent.time || '');
            setNote(editEvent.note || '');
        } else if (isOpen) {
            // Reset for new event
            setTitle('');
            setTime('');
            setNote('');
        }
    }, [isOpen, editEvent]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) {
            setError('제목을 입력해주세요.');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const dateString = format(selectedDate, 'yyyy-MM-dd');
            // Combine mood/time note logic from create
            const moodString = time ? `${time} - ${note || ''}`.trim() : note || undefined;

            if (editEvent) {
                // Update existing event
                await updateDiaryEntry(
                    editEvent.id,
                    title.trim(), // content
                    [],
                    {
                        date: dateString,
                        mood: moodString,
                        title: title.trim() // explicit title update if supported
                    }
                );
            } else {
                // Create new event
                await createDiaryEntry(
                    title.trim(),
                    [], // No images for events
                    'Event',
                    {
                        date: dateString,
                        mood: moodString
                    }
                );
            }

            onSuccess();
            handleClose();
        } catch (err) {
            console.error('Failed to save event:', err);
            setError('일정 저장에 실패했습니다.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setTitle('');
        setTime('');
        setNote('');
        setError(null);
        onClose();
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
                        className="fixed inset-0 bg-black/50 z-50"
                    />

                    {/* Modal - Bottom Sheet */}
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        className="fixed inset-x-0 bottom-0 z-50 bg-background rounded-t-3xl max-h-[80vh] overflow-hidden"
                    >
                        {/* Handle */}
                        <div className="flex justify-center py-3">
                            <div className="w-10 h-1 bg-border rounded-full" />
                        </div>

                        {/* Header */}
                        <div className="flex items-center justify-between px-6 pb-4 border-b border-border">
                            <button
                                onClick={handleClose}
                                className="text-text-secondary hover:text-primary transition-colors"
                            >
                                취소
                            </button>
                            <h2 className="text-lg font-bold">새 일정</h2>
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting || !title.trim()}
                                className="text-primary font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? '저장 중...' : '저장'}
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            {/* Selected Date Display */}
                            <div className="text-center py-3 bg-secondary rounded-xl">
                                <p className="text-sm text-text-secondary">
                                    {format(selectedDate, 'yyyy년 M월 d일 (EEEE)', { locale: ko })}
                                </p>
                            </div>

                            {/* Title */}
                            <div>
                                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">
                                    제목
                                </label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="일정 제목을 입력하세요"
                                    className="w-full px-4 py-3 bg-secondary rounded-xl border border-border focus:border-primary focus:outline-none transition-colors"
                                    autoFocus
                                />
                            </div>

                            {/* Time */}
                            <div>
                                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">
                                    시간 (선택)
                                </label>
                                <input
                                    type="time"
                                    value={time}
                                    onChange={(e) => setTime(e.target.value)}
                                    className="w-full px-4 py-3 bg-secondary rounded-xl border border-border focus:border-primary focus:outline-none transition-colors"
                                />
                            </div>

                            {/* Note */}
                            <div>
                                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">
                                    메모 (선택)
                                </label>
                                <textarea
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    placeholder="추가 메모를 입력하세요"
                                    rows={3}
                                    className="w-full px-4 py-3 bg-secondary rounded-xl border border-border focus:border-primary focus:outline-none transition-colors resize-none"
                                />
                            </div>

                            {/* Error Message */}
                            {error && (
                                <p className="text-red-500 text-sm text-center">{error}</p>
                            )}
                        </form>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
