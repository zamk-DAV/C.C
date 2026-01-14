import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { createDiaryEntry, updateDiaryEntry, deleteDiaryEntry } from '../../lib/notion';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { CalendarEvent } from '../../types';
import { useHaptics } from '../../hooks/useHaptics';
import { DatePickerModal } from '../common/DatePickerModal';
import { TimePickerModal } from '../common/TimePickerModal';
import { useNotion } from '../../context/NotionContext';
import type { NotionItem } from '../../types';
import { compressImage } from '../../utils/imageUtils';

interface EventWriteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (mockEvent?: CalendarEvent) => void;
    selectedDate?: Date;
    editEvent?: CalendarEvent;
}

export const EventWriteModal: React.FC<EventWriteModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    selectedDate = new Date(),
    editEvent
}) => {
    const { medium } = useHaptics();
    const { user, userData } = useAuth();
    const { addOptimisticItem, updateOptimisticItem, deleteOptimisticItem } = useNotion();

    const [title, setTitle] = useState('');
    const [isAllDay, setIsAllDay] = useState(false);

    const [startDate, setStartDate] = useState(new Date());
    const [startTime, setStartTime] = useState('10:00');
    const [endDate, setEndDate] = useState(new Date());
    const [endTime, setEndTime] = useState('11:00');

    const [isImportant, setIsImportant] = useState(false);
    const [isShared, setIsShared] = useState(true);
    const [note, setNote] = useState('');

    const [images, setImages] = useState<{ url?: string; base64?: string; file?: File }[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Modal Visibility States
    const [isStartDatePickerOpen, setIsStartDatePickerOpen] = useState(false);
    const [isEndDatePickerOpen, setIsEndDatePickerOpen] = useState(false);
    const [isStartTimePickerOpen, setIsStartTimePickerOpen] = useState(false);
    const [isEndTimePickerOpen, setIsEndTimePickerOpen] = useState(false);

    const handleDelete = async () => {
        if (!editEvent) return;
        setIsDeleting(true);
        medium();

        try {
            // Optimistic Delete
            deleteOptimisticItem('Event', editEvent.id);
            onSuccess(); // Close modal immediately

            await deleteDiaryEntry(editEvent.id);
        } catch (e) {
            console.error(e);
            alert('삭제에 실패했습니다.');
        } finally {
            setIsDeleting(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            if (editEvent) {
                setTitle(editEvent.title);
                setNote(editEvent.note || '');
                if (editEvent.time) {
                    setStartTime(editEvent.time);
                    setIsAllDay(false);
                } else {
                    setIsAllDay(true);
                }
                const evtDate = editEvent.date instanceof Date ? editEvent.date : new Date(editEvent.date);
                setStartDate(evtDate);

                if (editEvent.endDate) {
                    setEndDate(editEvent.endDate instanceof Date ? editEvent.endDate : new Date(editEvent.endDate));
                } else {
                    setEndDate(evtDate);
                }

                setEndTime(format(editEvent.endDate || editEvent.date, 'HH:mm'));
                setIsImportant(editEvent.isImportant || false);
                setIsShared(editEvent.isShared ?? true);
                setNote(editEvent.note || '');
                if (editEvent.images && editEvent.images.length > 0) {
                    setImages(editEvent.images.map(imgUrl => ({
                        base64: imgUrl,
                        type: 'image/jpeg',
                        size: 0,
                        name: 'existing-image',
                        url: imgUrl
                    })));
                } else {
                    setImages([]);
                }
            } else {
                setTitle('');
                setNote('');
                setIsAllDay(false);
                setStartDate(selectedDate);
                setEndDate(selectedDate);
                const now = new Date();
                setStartTime(format(now, 'HH:mm'));
                setEndTime(format(new Date(now.getTime() + 60 * 60 * 1000), 'HH:mm'));
                setIsImportant(false);
                setIsShared(true);
                setNote('');
                setImages([]);
            }
        }
    }, [isOpen, editEvent, selectedDate]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            setIsLoading(true);
            try {
                const compressedImages = await Promise.all(
                    files.map(file => compressImage(file))
                );
                setImages(prev => [...prev, ...compressedImages]);
            } catch (error) {
                console.error("Image compression failed:", error);
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleRemoveImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        if (!title.trim()) return;

        setIsSubmitting(true);
        medium();

        try {
            const buildIsoDate = (date: Date, time: string, isAllDay: boolean) => {
                if (isAllDay) return format(date, 'yyyy-MM-dd');
                const [h, m] = time.split(':').map(Number);
                const d = new Date(date);
                d.setHours(h, m, 0, 0);
                return d.toISOString();
            };

            const dateString = buildIsoDate(startDate, startTime, isAllDay);
            const endDateString = buildIsoDate(endDate, endTime, isAllDay);

            // Optimistic Update
            const optimisticItem: NotionItem = {
                id: editEvent ? editEvent.id : `optimistic-${Date.now()}`,
                title: title.trim(),
                date: dateString,
                coverImage: images[0]?.url || images[0]?.base64 || null,
                previewText: note,
                type: 'Event',
                author: userData?.name || user?.displayName || '나',
                color: userData?.theme || '#135bec',
                isImportant: isImportant,
                isShared: isShared,
                endDate: endDateString,
                images: images.map(img => img.url || img.base64 || ''),
                isOptimisticUpdate: !!editEvent // Mark as update if editing
            };

            if (editEvent) {
                updateOptimisticItem('Event', optimisticItem);
            } else {
                addOptimisticItem('Event', optimisticItem);
            }

            onSuccess(); // Close modal immediately for smooth transition

            // Background API Action
            const action = async () => {
                const newImages = images.filter(img => img.base64?.startsWith('data:'));
                const imagePayload = newImages.map(img => ({
                    base64: img.base64 || img.url || '',
                    type: img.file?.type || 'image/jpeg',
                    size: img.file?.size || 0,
                    name: img.file?.name || 'image.jpg'
                }));

                if (editEvent) {
                    await updateDiaryEntry(
                        editEvent.id,
                        note,
                        imagePayload,
                        {
                            date: dateString,
                            title: title.trim(),
                            endDate: endDateString,
                            isImportant: isImportant,
                            isShared: isShared,
                            color: userData?.theme || '#135bec',
                            url: ''
                        }
                    );
                } else {
                    await createDiaryEntry(
                        note,
                        imagePayload,
                        'Event',
                        {
                            date: dateString,
                            title: title.trim(),
                            endDate: endDateString,
                            isImportant: isImportant,
                            isShared: isShared,
                            color: userData?.theme || '#135bec',
                            url: ''
                        }
                    );
                }
            };

            await action();
        } catch (e) {
            console.error(e);
            alert('저장에 실패했습니다.');
            refreshData(); // Restore state on error
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-[2px]" onClick={onClose} />

                    {/* Modal Bottom Sheet */}
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed inset-x-0 bottom-0 z-50 h-[85vh] rounded-t-3xl bg-background-secondary/90 backdrop-blur-xl text-primary flex flex-col overflow-hidden shadow-2xl border-t border-border/20"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 h-16 border-b border-border/10 bg-background-secondary">
                            <button onClick={onClose} className="text-text-secondary font-medium text-[17px] active:opacity-70">
                                취소
                            </button>
                            <h2 className="text-[17px] font-semibold text-primary">
                                {editEvent ? '일정 수정' : '새로운 일정'}
                            </h2>
                            <button
                                onClick={handleSave}
                                disabled={isSubmitting}
                                className={`text-accent font-semibold text-[17px] active:opacity-70 transition-opacity ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {isSubmitting ? '저장 중...' : '저장'}
                            </button>
                        </div>

                        {/* Content Scrollable */}
                        <div className="flex-1 overflow-y-auto no-scrollbar pb-10 bg-background">
                            {/* Title Input Section */}
                            <div className="mx-4 mt-8 mb-6 overflow-hidden rounded-xl bg-background-secondary/50 border border-border/20 px-4 py-4 backdrop-blur-sm shadow-sm">
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="제목"
                                    className="w-full bg-transparent text-2xl font-bold text-primary placeholder-text-secondary/30 border-none focus:ring-0 p-0 leading-tight caret-accent"
                                    autoFocus
                                />
                            </div>

                            {/* Section 1: Time */}
                            <div className="mx-4 overflow-hidden rounded-xl bg-background-secondary border border-border/5">
                                {/* All-day */}
                                <div className="flex items-center justify-between px-4 py-3 border-b border-border/10">
                                    <ThemeToggle
                                        checked={isAllDay}
                                        onChange={setIsAllDay}
                                        label="하루 종일"
                                        icon={<span className="material-symbols-outlined text-[20px] text-text-secondary">schedule</span>}
                                    />
                                </div>

                                {/* Start Date/Time */}
                                <div className="flex items-center justify-between px-4 py-3 hover:bg-primary/5 active:bg-primary/10 transition-colors border-b border-border/10">
                                    <span className="text-[16px] pl-[34px]">시작</span>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setIsStartDatePickerOpen(true)}
                                            className="bg-primary/5 px-3 py-1.5 rounded-md text-[15px] text-accent font-medium active:scale-95 transition-transform"
                                        >
                                            {format(startDate, 'M월 d일 (EEE)', { locale: ko })}
                                        </button>
                                        {!isAllDay && (
                                            <button
                                                onClick={() => setIsStartTimePickerOpen(true)}
                                                className="bg-primary/5 px-2 py-1.5 rounded-md text-[15px] font-medium text-primary active:scale-95 transition-transform"
                                            >
                                                {startTime}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* End Date/Time */}
                                <div className="flex items-center justify-between px-4 py-3 hover:bg-primary/5 active:bg-primary/10 transition-colors">
                                    <span className="text-[16px] pl-[34px]">종료</span>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setIsEndDatePickerOpen(true)}
                                            className="bg-primary/5 px-3 py-1.5 rounded-md text-[15px] text-text-secondary font-medium active:scale-95 transition-transform"
                                        >
                                            {format(endDate, 'M월 d일 (EEE)', { locale: ko })}
                                        </button>
                                        {!isAllDay && (
                                            <button
                                                onClick={() => setIsEndTimePickerOpen(true)}
                                                className="bg-primary/5 px-2 py-1.5 rounded-md text-[15px] font-medium text-primary active:scale-95 transition-transform"
                                            >
                                                {endTime}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>


                            {/* Section 2: Important */}
                            <div className="mx-4 mt-6 overflow-hidden rounded-xl bg-background-secondary border border-border/5">
                                <div className="px-4 py-3">
                                    <ThemeToggle
                                        checked={isImportant}
                                        onChange={setIsImportant}
                                        label="즐겨찾기"
                                        icon={
                                            <motion.span
                                                animate={isImportant ? { scale: [1, 1.4, 1] } : { scale: 1 }}
                                                transition={{ duration: 0.3, ease: "easeOut" }}
                                                className="material-symbols-outlined text-[20px] text-[#FFD60A]"
                                            >
                                                star
                                            </motion.span>
                                        }
                                    />
                                </div>
                            </div>

                            {/* Section 3: Shared */}
                            <div className="mx-4 mt-6 overflow-hidden rounded-xl bg-background-secondary border border-border/5">
                                <div className="px-4 py-3">
                                    <ThemeToggle
                                        checked={isShared}
                                        onChange={setIsShared}
                                        label="함께 공유"
                                        icon={
                                            <motion.span
                                                animate={isShared ? { scale: [1, 1.4, 1] } : { scale: 1 }}
                                                transition={{ duration: 0.3, ease: "easeOut" }}
                                                className="material-symbols-outlined text-[20px] text-[#FF453A]"
                                            >
                                                favorite
                                            </motion.span>
                                        }
                                    />
                                </div>
                            </div>

                            {/* Images Section */}
                            <div className="mx-4 mt-6 overflow-hidden rounded-xl bg-background-secondary border border-border/5 px-4 py-4">
                                <h4 className="text-primary text-[11px] font-extrabold uppercase tracking-[0.1em] mb-4 opacity-40">사진 추가</h4>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    multiple
                                    accept="image/*"
                                    onChange={handleFileChange}
                                />
                                {images.length === 0 ? (
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full h-24 rounded-xl border-2 border-dashed border-border/20 flex flex-col items-center justify-center gap-2 hover:bg-primary/5 transition-all cursor-pointer bg-primary/2"
                                    >
                                        {isLoading ? (
                                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent"></div>
                                        ) : (
                                            <>
                                                <span className="material-symbols-outlined text-text-secondary text-2xl">add_a_photo</span>
                                                <span className="text-[12px] text-text-secondary font-medium">사진 선택하기</span>
                                            </>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                                        {images.map((img, idx) => (
                                            <div key={idx} className="relative h-20 aspect-square rounded-lg overflow-hidden shrink-0 shadow-sm border border-border/10">
                                                <img src={img.base64 || img.url} alt="preview" className="w-full h-full object-cover" />
                                                <button
                                                    onClick={() => handleRemoveImage(idx)}
                                                    className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5 hover:bg-red-500 transition-colors"
                                                >
                                                    <span className="material-symbols-outlined text-[14px]">close</span>
                                                </button>
                                            </div>
                                        ))}
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={isLoading}
                                            className="h-20 aspect-square rounded-lg border-2 border-dashed border-border/20 flex items-center justify-center shrink-0 hover:bg-primary/5 transition-all bg-primary/2"
                                        >
                                            {isLoading ? (
                                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-accent"></div>
                                            ) : (
                                                <span className="material-symbols-outlined text-text-secondary">add</span>
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Section 5: Notes */}
                            <div className="mx-4 mt-6 overflow-hidden rounded-xl bg-background-secondary border border-border/5">
                                <div className="px-4 py-3 border-b border-border/10">
                                    <div className="flex items-center gap-3">
                                        <span className="material-symbols-outlined text-[20px] text-text-secondary">description</span>
                                        <span className="text-[16px]">메모</span>
                                    </div>
                                </div>
                                <textarea
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    className="w-full h-32 bg-transparent text-[16px] text-primary p-4 border-none focus:ring-0 resize-none font-sans"
                                    placeholder="메모를 입력하세요"
                                />
                            </div>

                            {/* Delete Button (Only for Edit Mode) */}
                            {editEvent && (
                                <div className="mx-4 mt-8">
                                    <button
                                        onClick={handleDelete}
                                        disabled={isDeleting || isSubmitting}
                                        className="w-full py-3.5 rounded-xl bg-red-500/5 text-red-500 font-medium hover:bg-red-500/10 active:scale-[0.98] transition-all flex items-center justify-center gap-2 border border-red-500/20"
                                    >
                                        {isDeleting ? (
                                            <span className="text-sm">삭제 중...</span>
                                        ) : (
                                            <>
                                                <span className="material-symbols-outlined text-[20px]">delete</span>
                                                <span className="text-[15px]">일정 삭제</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}

                            <div className="h-20" /> {/* Bottom spacer for safety */}
                        </div>
                    </motion.div>

                    {/* Modals */}
                    <DatePickerModal
                        isOpen={isStartDatePickerOpen}
                        onClose={() => setIsStartDatePickerOpen(false)}
                        onSelect={(date) => {
                            if (date) {
                                setStartDate(new Date(date));
                                // Auto-adjust end date if it's before start date
                                if (new Date(date) > endDate) {
                                    setEndDate(new Date(date));
                                }
                            }
                            setIsStartDatePickerOpen(false);
                        }}
                        selectedDate={startDate}
                    />

                    <DatePickerModal
                        isOpen={isEndDatePickerOpen}
                        onClose={() => setIsEndDatePickerOpen(false)}
                        onSelect={(date) => {
                            if (date) setEndDate(new Date(date));
                            setIsEndDatePickerOpen(false);
                        }}
                        selectedDate={endDate}
                        minDate={startDate} // Prevent end date before start date
                    />

                    <TimePickerModal
                        isOpen={isStartTimePickerOpen}
                        onClose={() => setIsStartTimePickerOpen(false)}
                        onSelect={(time) => {
                            setStartTime(time);
                            // Optional: Auto-adjust end time logic here
                        }}
                        initialTime={startTime}
                    />

                    <TimePickerModal
                        isOpen={isEndTimePickerOpen}
                        onClose={() => setIsEndTimePickerOpen(false)}
                        onSelect={(time) => setEndTime(time)}
                        initialTime={endTime}
                    />
                </>
            )}
        </AnimatePresence>
    );
};
