import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, getDaysInMonth } from 'date-fns';
import { ko } from 'date-fns/locale';
import { WheelPicker } from './WheelPicker';
import { useHaptics } from '../../hooks/useHaptics';

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
    minDate
}) => {
    const { medium } = useHaptics();

    // Parse initial date
    const initialDate = selectedDate ? new Date(selectedDate) : new Date();
    const [year, setYear] = useState(initialDate.getFullYear());
    const [month, setMonth] = useState(initialDate.getMonth() + 1);
    const [day, setDay] = useState(initialDate.getDate());

    // Generate year options (current year - 10 to current year + 10)
    const currentYear = new Date().getFullYear();
    const years = useMemo(() =>
        Array.from({ length: 21 }, (_, i) => currentYear - 10 + i),
        [currentYear]);

    // Generate month options (1-12)
    const months = useMemo(() =>
        Array.from({ length: 12 }, (_, i) => i + 1),
        []);

    // Generate day options based on selected year and month
    const days = useMemo(() => {
        const daysInMonth = getDaysInMonth(new Date(year, month - 1));
        return Array.from({ length: daysInMonth }, (_, i) => i + 1);
    }, [year, month]);

    // Adjust day if it exceeds the days in the new month
    React.useEffect(() => {
        if (day > days.length) {
            setDay(days.length);
        }
    }, [days, day]);

    const handleConfirm = () => {
        const formattedDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        onSelect(formattedDate);
        medium();
        onClose();
    };

    const formatMonth = (m: number) => {
        return format(new Date(2024, m - 1, 1), 'M월', { locale: ko });
    };

    const formatDay = (d: number) => {
        return `${d}일`;
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
                        onClick={onClose}
                        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[60]"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, y: "100%" }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="fixed bottom-0 left-0 right-0 z-[60] bg-background-secondary/95 backdrop-blur-xl rounded-t-3xl shadow-2xl max-w-lg mx-auto overflow-hidden border-t border-border/20"
                    >
                        {/* Handle bar */}
                        <div className="flex justify-center pt-3 pb-1">
                            <div className="w-10 h-1 rounded-full bg-border/40" />
                        </div>

                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-3">
                            <button
                                onClick={onClose}
                                className="text-text-secondary font-medium text-[17px] active:opacity-70 transition-opacity"
                            >
                                취소
                            </button>
                            <h3 className="text-[17px] font-semibold text-primary">날짜 선택</h3>
                            <button
                                onClick={handleConfirm}
                                className="text-accent font-semibold text-[17px] active:opacity-70 transition-opacity"
                            >
                                완료
                            </button>
                        </div>

                        {/* Wheel Pickers */}
                        <div className="flex px-4 py-6 gap-2">
                            {/* Year */}
                            <div className="flex-1">
                                <WheelPicker
                                    items={years}
                                    value={year}
                                    onChange={setYear}
                                    formatItem={(y) => `${y}년`}
                                />
                            </div>

                            {/* Month */}
                            <div className="flex-1">
                                <WheelPicker
                                    items={months}
                                    value={month}
                                    onChange={setMonth}
                                    formatItem={formatMonth}
                                />
                            </div>

                            {/* Day */}
                            <div className="flex-1">
                                <WheelPicker
                                    items={days}
                                    value={day}
                                    onChange={setDay}
                                    formatItem={formatDay}
                                />
                            </div>
                        </div>

                        {/* Preview */}
                        <div className="px-6 pb-8">
                            <div className="bg-primary/5 rounded-2xl p-4 text-center">
                                <span className="text-[15px] text-text-secondary">선택된 날짜</span>
                                <p className="text-[20px] font-bold text-primary mt-1">
                                    {format(new Date(year, month - 1, day), 'yyyy년 M월 d일 (EEE)', { locale: ko })}
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
