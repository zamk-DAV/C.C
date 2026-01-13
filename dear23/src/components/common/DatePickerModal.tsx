import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, getDaysInMonth, setYear, setMonth, setDate } from 'date-fns';
import { useHaptics } from '../../hooks/useHaptics';

interface DatePickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (date: string) => void;
    selectedDate?: string | Date;
    minDate?: string | Date;
}

export const DatePickerModal: React.FC<DatePickerModalProps> = ({
    isOpen,
    onClose,
    onSelect,
    selectedDate = new Date()
}) => {
    const { medium, selection } = useHaptics();

    const initialDate = typeof selectedDate === 'string' ? new Date(selectedDate) : selectedDate;
    const [year, setSelectedYear] = useState(initialDate.getFullYear());
    const [month, setSelectedMonth] = useState(initialDate.getMonth() + 1); // 1-12
    const [day, setSelectedDay] = useState(initialDate.getDate());

    const years = Array.from({ length: 21 }, (_, i) => new Date().getFullYear() - 10 + i);
    const months = Array.from({ length: 12 }, (_, i) => i + 1);
    const [days, setDays] = useState<number[]>([]);

    const yearRef = useRef<HTMLDivElement>(null);
    const monthRef = useRef<HTMLDivElement>(null);
    const dayRef = useRef<HTMLDivElement>(null);

    const ITEM_HEIGHT = 40;

    useEffect(() => {
        const daysCount = getDaysInMonth(new Date(year, month - 1));
        const newDays = Array.from({ length: daysCount }, (_, i) => i + 1);
        setDays(newDays);
        if (day > daysCount) setSelectedDay(daysCount);
    }, [year, month]);

    useEffect(() => {
        if (isOpen) {
            scrollToValue(yearRef, years.indexOf(year));
            scrollToValue(monthRef, months.indexOf(month));
            scrollToValue(dayRef, days.indexOf(day));
        }
    }, [isOpen, days.length]); // Re-scroll if days count changes

    const scrollToValue = (ref: React.RefObject<HTMLDivElement | null>, index: number) => {
        if (ref.current && index !== -1) {
            ref.current.scrollTop = index * ITEM_HEIGHT;
        }
    };

    const handleConfirm = () => {
        const finalDate = setDate(setMonth(setYear(new Date(), year), month - 1), day);
        onSelect(format(finalDate, 'yyyy-MM-dd'));
        medium();
        onClose();
    };

    const Wheel = ({
        items,
        value,
        onChange,
        containerRef,
        label = ""
    }: {
        items: (string | number)[],
        value: string | number,
        onChange: (val: any) => void,
        containerRef: React.RefObject<HTMLDivElement | null>,
        label?: string
    }) => {
        const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
            const target = e.target as HTMLDivElement;
            const index = Math.round(target.scrollTop / ITEM_HEIGHT);
            if (items[index] !== undefined && items[index] !== value) {
                onChange(items[index]);
                selection();
            }
        };

        const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
            if (containerRef.current) {
                containerRef.current.scrollTop += e.deltaY;
            }
        };

        return (
            <div className="relative h-[200px] w-full overflow-hidden" onWheel={handleWheel}>
                <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-[40px] bg-primary/10 rounded-lg pointer-events-none z-10" />
                <div
                    ref={containerRef}
                    className="h-full overflow-y-auto no-scrollbar snap-y snap-mandatory py-[80px]"
                    onScroll={handleScroll}
                >
                    {items.map((item) => (
                        <div
                            key={item}
                            className={`h-[40px] flex items-center justify-center text-[17px] font-medium snap-center transition-colors ${item === value ? 'text-primary' : 'text-text-secondary'
                                }`}
                        >
                            {typeof item === 'number' ? item.toString() : item}{label}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-background/80 z-[60] backdrop-blur-[2px]"
                    />
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="fixed bottom-0 left-0 right-0 z-[60] bg-background-secondary/90 backdrop-blur-xl rounded-t-2xl overflow-hidden pb-8 shadow-2xl border-t border-border/20"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-6 py-4 border-b border-border/10">
                            <button onClick={onClose} className="text-text-secondary text-[16px] font-medium hover:opacity-70 transition-opacity">취소</button>
                            <span className="text-primary font-semibold text-[17px]">날짜 설정</span>
                            <button onClick={handleConfirm} className="text-accent font-semibold text-[16px] hover:opacity-70 transition-opacity">완료</button>
                        </div>
                        <div className="flex px-8 py-6 gap-2">
                            <div className="flex-[1.5]">
                                <Wheel items={years} value={year} onChange={setSelectedYear} containerRef={yearRef} label="년" />
                            </div>
                            <div className="flex-1">
                                <Wheel items={months} value={month} onChange={setSelectedMonth} containerRef={monthRef} label="월" />
                            </div>
                            <div className="flex-1">
                                <Wheel items={days} value={day} onChange={setSelectedDay} containerRef={dayRef} label="일" />
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

