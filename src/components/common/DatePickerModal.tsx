import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isBefore, startOfToday, getDay } from 'date-fns';
import { ko } from 'date-fns/locale';

interface DatePickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (date: string) => void;
    selectedDate?: string | Date;
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
                        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[60]"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, y: "100%" }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="fixed bottom-0 left-0 right-0 z-[60] bg-background-secondary/95 backdrop-blur-xl rounded-t-2xl shadow-2xl max-w-lg mx-auto overflow-hidden pb-8 border-t border-border/20"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-border/10">
                            <button
                                onClick={onClose}
                                className="text-text-secondary font-medium text-[16px]"
                            >
                                취소
                            </button>
                            <h3 className="text-[17px] font-semibold text-primary">날짜 선택</h3>
                            <div className="w-[30px]" /> {/* Spacer for centering */}
                        </div>

                        {/* Month Navigation */}
                        <div className="flex items-center justify-between px-6 py-6">
                            <button
                                onClick={handlePrevMonth}
                                className="p-2 hover:bg-primary/10 rounded-full transition-colors text-primary"
                            >
                                <span className="material-symbols-outlined">chevron_left</span>
                            </button>
                            <span className="text-[18px] font-bold text-primary">
                                {format(currentMonth, 'yyyy년 M월', { locale: ko })}
                            </span>
                            <button
                                onClick={handleNextMonth}
                                className="p-2 hover:bg-primary/10 rounded-full transition-colors text-primary"
                            >
                                <span className="material-symbols-outlined">chevron_right</span>
                            </button>
                        </div>

                        {/* Weekday Headers */}
                        <div className="grid grid-cols-7 gap-1 px-4 pb-2">
                            {weekDays.map((day, idx) => (
                                <div
                                    key={day}
                                    className={`text-center text-xs font-bold py-2 ${idx === 0 ? 'text-[#FF453A]' : idx === 6 ? 'text-accent' : 'text-text-secondary'
                                        }`}
                                >
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Days Grid */}
                        <div className="grid grid-cols-7 gap-1 px-4 pb-4">
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
                                        className={`aspect-square flex items-center justify-center rounded-full text-[15px] font-medium transition-all ${isSelected
                                            ? 'bg-accent text-white'
                                            : isToday
                                                ? 'text-accent font-bold'
                                                : isDisabled
                                                    ? 'text-text-secondary/30'
                                                    : dayOfWeek === 0
                                                        ? 'text-[#FF453A]'
                                                        : dayOfWeek === 6
                                                            ? 'text-accent'
                                                            : 'text-primary'
                                            }`}
                                    >
                                        {format(date, 'd')}
                                    </button>
                                );
                            })}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
