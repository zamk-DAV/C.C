import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isBefore, startOfToday, getDay } from 'date-fns';
import { ko } from 'date-fns/locale';

interface DatePickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (date: string) => void;
    selectedDate?: string;
    minDate?: Date;
}

export const DatePickerModal: React.FC<DatePickerModalProps> = ({
    isOpen,
    onClose,
    onSelect,
    selectedDate,
    minDate = startOfToday()
}) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const days = useMemo(() => {
        const start = startOfMonth(currentMonth);
        const end = endOfMonth(currentMonth);
        const daysInMonth = eachDayOfInterval({ start, end });

        // Add padding for the first day of the week
        const startDay = getDay(start); // 0 = Sunday
        const padding = Array(startDay).fill(null);

        return [...padding, ...daysInMonth];
    }, [currentMonth]);

    const handlePrevMonth = () => {
        setCurrentMonth(subMonths(currentMonth, 1));
    };

    const handleNextMonth = () => {
        setCurrentMonth(addMonths(currentMonth, 1));
    };

    const handleSelectDate = (date: Date) => {
        if (isBefore(date, minDate)) return;
        onSelect(format(date, 'yyyy-MM-dd'));
        onClose();
    };

    const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 z-[60]"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        className="fixed bottom-0 left-0 right-0 z-[60] bg-background rounded-t-2xl shadow-2xl max-w-lg mx-auto overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                            <h3 className="text-lg font-bold text-primary">날짜 선택</h3>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-secondary rounded-full transition-colors"
                            >
                                <span className="material-symbols-outlined text-primary">close</span>
                            </button>
                        </div>

                        {/* Month Navigation */}
                        <div className="flex items-center justify-between px-6 py-4">
                            <button
                                onClick={handlePrevMonth}
                                className="p-2 hover:bg-secondary rounded-full transition-colors"
                            >
                                <span className="material-symbols-outlined text-primary">chevron_left</span>
                            </button>
                            <span className="text-lg font-bold text-primary">
                                {format(currentMonth, 'yyyy년 M월', { locale: ko })}
                            </span>
                            <button
                                onClick={handleNextMonth}
                                className="p-2 hover:bg-secondary rounded-full transition-colors"
                            >
                                <span className="material-symbols-outlined text-primary">chevron_right</span>
                            </button>
                        </div>

                        {/* Weekday Headers */}
                        <div className="grid grid-cols-7 gap-1 px-4 pb-2">
                            {weekDays.map((day, idx) => (
                                <div
                                    key={day}
                                    className={`text-center text-xs font-bold py-2 ${idx === 0 ? 'text-red-400' : idx === 6 ? 'text-blue-400' : 'text-text-secondary'
                                        }`}
                                >
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Days Grid */}
                        <div className="grid grid-cols-7 gap-1 px-4 pb-6">
                            {days.map((date, idx) => {
                                if (!date) {
                                    return <div key={`empty-${idx}`} className="aspect-square" />;
                                }

                                const isDisabled = isBefore(date, minDate);
                                const isSelected = selectedDate && isSameDay(date, new Date(selectedDate));
                                const isToday = isSameDay(date, new Date());
                                const dayOfWeek = getDay(date);

                                return (
                                    <button
                                        key={date.toISOString()}
                                        onClick={() => handleSelectDate(date)}
                                        disabled={isDisabled}
                                        className={`aspect-square flex items-center justify-center rounded-full text-sm font-medium transition-all ${isSelected
                                            ? 'bg-primary text-background'
                                            : isToday
                                                ? 'border-2 border-primary text-primary'
                                                : isDisabled
                                                    ? 'text-text-secondary/30 cursor-not-allowed'
                                                    : dayOfWeek === 0
                                                        ? 'text-red-400 hover:bg-secondary'
                                                        : dayOfWeek === 6
                                                            ? 'text-blue-400 hover:bg-secondary'
                                                            : 'text-primary hover:bg-secondary'
                                            }`}
                                    >
                                        {format(date, 'd')}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Clear Button */}
                        <div className="px-4 pb-8">
                            <button
                                onClick={() => {
                                    onSelect('');
                                    onClose();
                                }}
                                className="w-full py-3 text-text-secondary font-medium text-sm hover:bg-secondary transition-colors rounded-lg"
                            >
                                취소
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
