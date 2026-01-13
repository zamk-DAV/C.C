import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createDiaryEntry, updateDiaryEntry } from '../../lib/notion';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { CalendarEvent } from '../../types';
import { useHaptics } from '../../hooks/useHaptics';
import { DatePickerModal } from '../common/DatePickerModal';
import { TimePickerModal } from '../common/TimePickerModal';

interface EventWriteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
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
    const { medium, simpleClick } = useHaptics();

    const [title, setTitle] = useState('');
    const [isAllDay, setIsAllDay] = useState(false);

    const [startDate, setStartDate] = useState(new Date());
    const [startTime, setStartTime] = useState('10:00');
    const [endDate, setEndDate] = useState(new Date());
    const [endTime, setEndTime] = useState('11:00');

    const [isImportant, setIsImportant] = useState(false);
    const [isShared, setIsShared] = useState(true);
    const [selectedColor, setSelectedColor] = useState('#135bec');
    const [note, setNote] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);

    // Modal Visibility States
    const [isStartDatePickerOpen, setIsStartDatePickerOpen] = useState(false);
    const [isEndDatePickerOpen, setIsEndDatePickerOpen] = useState(false);
    const [isStartTimePickerOpen, setIsStartTimePickerOpen] = useState(false);
    const [isEndTimePickerOpen, setIsEndTimePickerOpen] = useState(false);

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

                if (editEvent.color) setSelectedColor(editEvent.color);
                setIsImportant(editEvent.isImportant ?? false);
                setIsShared(editEvent.isShared ?? true);
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
                setSelectedColor('#135bec');
            }
        }
    }, [isOpen, editEvent, selectedDate]);

    const handleSave = async () => {
        if (!title.trim()) return;

        setIsSubmitting(true);
        medium();

        try {
            const dateString = format(startDate, 'yyyy-MM-dd');
            const timeString = isAllDay ? undefined : startTime;
            const moodContent = timeString ? `${timeString} ${note}`.trim() : note;
            const endDateString = format(endDate, 'yyyy-MM-dd');

            if (editEvent) {
                await updateDiaryEntry(
                    editEvent.id,
                    title.trim(),
                    [],
                    {
                        date: dateString,
                        mood: moodContent,
                        title: title.trim(),
                        endDate: endDateString,
                        color: selectedColor,
                        isImportant: isImportant,
                        isShared: isShared
                    }
                );
            } else {
                await createDiaryEntry(
                    title.trim(),
                    [],
                    'Event',
                    {
                        date: dateString,
                        mood: moodContent,
                        endDate: endDateString,
                        color: selectedColor,
                        isImportant: isImportant,
                        isShared: isShared
                    }
                );
            }
            onSuccess();
        } catch (e) {
            console.error(e);
        } finally {
            setIsSubmitting(false);
        }
    };

    const colors = ['#135bec', '#EF4444', '#10B981', '#A855F7'];

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
                            {/* Title Input */}
                            <div className="px-5 mt-8 mb-6">
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="제목"
                                    className="w-full bg-transparent text-3xl font-bold text-primary placeholder-text-secondary/30 border-none focus:ring-0 p-0 leading-tight caret-accent"
                                    autoFocus
                                />
                            </div>

                            {/* Section 1: Time */}
                            <div className="mx-4 overflow-hidden rounded-xl bg-background-secondary border border-border/5">
                                {/* All-day */}
                                <div className="flex items-center justify-between px-4 py-3 border-b border-border/10">
                                    <div className="flex items-center gap-3">
                                        <span className="material-symbols-outlined text-[20px] text-text-secondary">schedule</span>
                                        <span className="text-[16px]">하루 종일</span>
                                    </div>
                                    <button
                                        onClick={() => { setIsAllDay(!isAllDay); simpleClick(); }}
                                        className={`w-[51px] h-[31px] rounded-full p-[2px] transition-colors duration-200 ease-in-out ${isAllDay ? 'bg-[#34C759]' : 'bg-border/20'}`}
                                    >
                                        <div className={`w-[26px] h-[26px] bg-white rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${isAllDay ? 'translate-x-[20px]' : 'translate-x-0'}`} />
                                    </button>
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
                                <div className="flex items-center justify-between px-4 py-3">
                                    <div className="flex items-center gap-3">
                                        <span className="material-symbols-outlined text-[20px] text-[#FFD60A]">star</span>
                                        <span className="text-[16px]">즐겨찾기</span>
                                    </div>
                                    <button
                                        onClick={() => { setIsImportant(!isImportant); simpleClick(); }}
                                        className={`w-[51px] h-[31px] rounded-full p-[2px] transition-colors duration-200 ease-in-out ${isImportant ? 'bg-[#34C759]' : 'bg-border/20'}`}
                                    >
                                        <div className={`w-[26px] h-[26px] bg-white rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${isImportant ? 'translate-x-[20px]' : 'translate-x-0'}`} />
                                    </button>
                                </div>
                            </div>

                            {/* Section 3: Shared */}
                            <div className="mx-4 mt-6 overflow-hidden rounded-xl bg-background-secondary border border-border/5">
                                <div className="flex items-center justify-between px-4 py-3">
                                    <div className="flex items-center gap-3">
                                        <span className="material-symbols-outlined text-[20px] text-[#FF453A]">favorite</span>
                                        <span className="text-[16px]">함께 공유</span>
                                    </div>
                                    <button
                                        onClick={() => { setIsShared(!isShared); simpleClick(); }}
                                        className={`w-[51px] h-[31px] rounded-full p-[2px] transition-colors duration-200 ease-in-out ${isShared ? 'bg-[#34C759]' : 'bg-border/20'}`}
                                    >
                                        <div className={`w-[26px] h-[26px] bg-white rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${isShared ? 'translate-x-[20px]' : 'translate-x-0'}`} />
                                    </button>
                                </div>
                            </div>

                            {/* Section 4: Color */}
                            <div className="mx-4 mt-6 overflow-hidden rounded-xl bg-background-secondary border border-border/5">
                                <div className="flex items-center justify-between px-4 py-3">
                                    <div className="flex items-center gap-3">
                                        <span className="material-symbols-outlined text-[20px] text-accent">palette</span>
                                        <span className="text-[16px]">색상</span>
                                    </div>
                                    <div className="flex gap-3">
                                        {colors.map(color => (
                                            <button
                                                key={color}
                                                onClick={() => { setSelectedColor(color); simpleClick(); }}
                                                className={`size-6 rounded-full transition-all relative`}
                                                style={{ backgroundColor: color }}
                                            >
                                                {selectedColor === color && (
                                                    <div className="absolute inset-0 rounded-full ring-2 ring-primary ring-offset-2 ring-offset-background-secondary" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>
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
