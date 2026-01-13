import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { cn } from '../../lib/utils';
// If not using aliased imports, might need relative path. Checking tsconfig or assumption.
// Previous files used '../context/NotionContext', so likely relative.
// Let's use relative for safety or check tsconfig in next step if it fails.
// Actually, 'clsx' and 'tailwind-merge' are likely used.
// import { twMerge } from 'tailwind-merge'; // Removed unused
// Local cn removed as it conflicts with import


interface EventDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => void;
    initialDate?: Date;
    initialEvent?: any; // Add initialEvent prop
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({
    isOpen,
    onClose,
    onSave,
    initialDate = new Date(),
    initialEvent
}) => {
    const [title, setTitle] = useState('');
    const [isAllDay, setIsAllDay] = useState(false);
    const [startDate, setStartDate] = useState<Date>(initialDate);
    const [endDate, setEndDate] = useState<Date>(initialDate);
    const [startTime] = useState('10:00'); // setStartTime unused
    const [endTime] = useState('11:00'); // setEndTime unused
    const [isFavorite, setIsFavorite] = useState(false);
    const [isShared, setIsShared] = useState(false);
    const [selectedColor, setSelectedColor] = useState<string>('blue');
    const [note, setNote] = useState('');

    React.useEffect(() => {
        if (isOpen) {
            if (initialEvent) {
                // Populate fields from initialEvent
                setTitle(initialEvent.title || '');
                setIsAllDay(initialEvent.isAllDay || false); // Assuming these fields exist or we map them
                // Date parsing logic might be needed depending on event object structure
                // For now assuming Notion data structure or a mapped internal event structure
                setStartDate(initialEvent.date ? new Date(initialEvent.date) : initialDate);
                setEndDate(initialEvent.date ? new Date(initialEvent.date) : initialDate);
                setNote(initialEvent.previewText || initialEvent.content || '');
                // ... map other fields if available
            } else {
                // Reset to defaults for new event
                setTitle('');
                const now = new Date();
                setStartDate(initialDate || now);
                setEndDate(initialDate || now);
                setNote('');
                setIsAllDay(false);
            }
        }
    }, [isOpen, initialEvent, initialDate]);

    const colors = [
        { id: 'blue', value: '#135bec' },
        { id: 'red', value: '#ef4444' },
        { id: 'green', value: '#22c55e' },
        { id: 'purple', value: '#a855f7' },
    ];

    const handleSave = () => {
        onSave({
            id: initialEvent?.id, // Pass ID if editing
            title,
            isAllDay,
            startDate,
            startTime,
            endDate,
            endTime,
            isFavorite,
            isShared,
            color: selectedColor,
            note
        });
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
                        onClick={onClose}
                        className="fixed inset-0 bg-background/80 backdrop-blur-[2px] z-50"
                    />

                    {/* Modal Content - Slide up from bottom */}
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed bottom-0 left-0 right-0 z-50 w-full max-w-lg mx-auto bg-background-secondary/90 backdrop-blur-xl border-t border-border/20 rounded-t-3xl h-[90vh] flex flex-col shadow-2xl overflow-hidden"
                    >
                        {/* Header */}
                        <header className="flex items-center justify-between px-6 h-16 border-b border-border/10 bg-background-secondary/80 backdrop-blur-md shrink-0">
                            <button
                                onClick={onClose}
                                className="text-text-secondary text-base font-normal hover:text-primary transition-colors"
                            >
                                취소
                            </button>
                            <h1 className="text-base font-bold text-primary">새로운 일정</h1>
                            <button
                                onClick={handleSave}
                                className="text-accent text-base font-bold hover:opacity-80 transition-opacity"
                            >
                                저장
                            </button>
                        </header>

                        {/* Scrollable Body */}
                        <div className="flex-1 overflow-y-auto w-full pb-10 custom-scrollbar">

                            {/* Title Input */}
                            <div className="mt-8 px-6 mb-8">
                                <input
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full bg-transparent text-3xl font-bold text-primary placeholder-text-secondary/30 border-none focus:ring-0 p-0 leading-tight caret-accent"
                                    placeholder="제목을 입력하세요"
                                    type="text"
                                />
                            </div>

                            {/* Time Section */}
                            <div className="mx-5 mb-6 overflow-hidden rounded-2xl bg-background-secondary border border-border/10 shadow-lg">
                                {/* All-day Toggle */}
                                <div className="flex items-center justify-between px-5 py-4 border-b border-border/10">
                                    <div className="flex items-center gap-3">
                                        <span className="material-symbols-outlined text-text-secondary text-[24px]">schedule</span>
                                        <span className="text-[17px] font-medium text-primary">하루 종일</span>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={isAllDay}
                                            onChange={(e) => setIsAllDay(e.target.checked)}
                                        />
                                        <div className="w-[51px] h-[31px] bg-border/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-[27px] after:w-[27px] after:transition-all peer-checked:bg-[#34C759] after:shadow-lg peer-checked:after:bg-white"></div>
                                    </label>
                                </div>

                                {/* Starts */}
                                <div className="flex items-center justify-between px-5 py-4 border-b border-border/10 hover:bg-primary/5 transition-colors cursor-pointer">
                                    <span className="text-[17px] font-normal text-text-secondary pl-[36px]">시작</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-primary bg-primary/10 px-3 py-1.5 rounded-lg text-sm font-semibold">
                                            {format(startDate, 'MMM d, yyyy', { locale: ko })}
                                        </span>
                                        {!isAllDay && (
                                            <span className="text-primary bg-primary/10 px-3 py-1.5 rounded-lg text-sm font-bold">
                                                {startTime}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Ends */}
                                <div className="flex items-center justify-between px-5 py-4 hover:bg-primary/5 transition-colors cursor-pointer">
                                    <span className="text-[17px] font-normal text-text-secondary pl-[36px]">종료</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-primary bg-primary/10 px-3 py-1.5 rounded-lg text-sm font-semibold">
                                            {format(endDate, 'MMM d, yyyy', { locale: ko })}
                                        </span>
                                        {!isAllDay && (
                                            <span className="text-primary bg-primary/10 px-3 py-1.5 rounded-lg text-sm font-bold">
                                                {endTime}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Favorite Toggle */}
                            <div className="mx-5 mb-6 overflow-hidden rounded-2xl bg-background-secondary border border-border/10 shadow-lg">
                                <div className="flex items-center justify-between px-5 py-4">
                                    <div className="flex items-center gap-3">
                                        <span className="material-symbols-outlined text-[#FFD60A] text-[24px]">star</span>
                                        <span className="text-[17px] font-normal text-primary">즐겨찾기</span>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={isFavorite}
                                            onChange={(e) => setIsFavorite(e.target.checked)}
                                        />
                                        <div className="w-[51px] h-[31px] bg-border/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-[27px] after:w-[27px] after:transition-all peer-checked:bg-[#34C759] after:shadow-lg peer-checked:after:bg-white"></div>
                                    </label>
                                </div>
                            </div>

                            {/* Shared Event Toggle */}
                            <div className="mx-5 mb-6 overflow-hidden rounded-2xl bg-background-secondary border border-border/10 shadow-lg">
                                <div className="flex items-center justify-between px-5 py-4">
                                    <div className="flex items-center gap-3">
                                        <span className="material-symbols-outlined text-[#FF453A] text-[24px]">favorite</span>
                                        <span className="text-[17px] font-normal text-primary">함께하는 일정</span>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={isShared}
                                            onChange={(e) => setIsShared(e.target.checked)}
                                        />
                                        <div className="w-[51px] h-[31px] bg-border/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-[27px] after:w-[27px] after:transition-all peer-checked:bg-[#34C759] after:shadow-lg peer-checked:after:bg-white"></div>
                                    </label>
                                </div>
                            </div>

                            {/* Color Selection */}
                            <div className="mx-5 mb-6 overflow-hidden rounded-2xl bg-background-secondary border border-border/10 shadow-lg">
                                <div className="flex items-center justify-between px-5 py-4">
                                    <div className="flex items-center gap-3">
                                        <span className="material-symbols-outlined text-accent text-[24px]">palette</span>
                                        <span className="text-[17px] font-normal text-primary">색상</span>
                                    </div>
                                    <div className="flex gap-3">
                                        {colors.map((color) => (
                                            <button
                                                key={color.id}
                                                onClick={() => setSelectedColor(color.id)}
                                                className={cn(
                                                    "w-6 h-6 rounded-full transition-all",
                                                    selectedColor === color.id && "ring-2 ring-offset-2 ring-offset-background-secondary ring-primary"
                                                )}
                                                style={{ backgroundColor: color.value }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Notes */}
                            <div className="mx-5 mb-6 overflow-hidden rounded-2xl bg-background-secondary border border-border/10 shadow-lg">
                                <div className="px-5 py-4 flex flex-col gap-4">
                                    <div className="flex items-center gap-3">
                                        <span className="material-symbols-outlined text-text-secondary text-[24px]">description</span>
                                        <span className="text-[17px] font-normal text-primary">메모</span>
                                    </div>
                                    <textarea
                                        value={note}
                                        onChange={(e) => setNote(e.target.value)}
                                        className="w-full bg-background border border-border/10 rounded-xl focus:ring-1 focus:ring-accent focus:border-accent p-3 text-[17px] text-primary placeholder-text-secondary/30 resize-none min-h-[140px] leading-relaxed transition-all"
                                        placeholder="설명이나 메모를 입력하세요..."
                                    />
                                </div>
                            </div>

                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
