import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useHaptics } from '../../hooks/useHaptics';

interface TimePickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (time: string) => void;
    initialTime?: string; // Format "HH:mm"
}

export const TimePickerModal: React.FC<TimePickerModalProps> = ({
    isOpen,
    onClose,
    onSelect,
    initialTime = '10:00'
}) => {
    const { medium, selection } = useHaptics();

    // Parse initial time
    const [initHour, initMinute] = initialTime.split(':').map(Number);
    const [ampm, setAmpm] = useState<'AM' | 'PM'>(initHour >= 12 ? 'PM' : 'AM');
    const [hour, setHour] = useState(initHour > 12 ? initHour - 12 : (initHour === 0 ? 12 : initHour));
    const [minute, setMinute] = useState(initMinute);

    const ampmList = ['AM', 'PM'];
    const hourList = Array.from({ length: 12 }, (_, i) => i + 1);
    const minuteList = Array.from({ length: 12 }, (_, i) => i * 5); // 0, 5, 10... 55

    // Refs for scroll containers
    const ampmRef = useRef<HTMLDivElement>(null);
    const hourRef = useRef<HTMLDivElement>(null);
    const minuteRef = useRef<HTMLDivElement>(null);

    const ITEM_HEIGHT = 40; // Height of each item in px

    useEffect(() => {
        if (isOpen) {
            // Scroll to initial positions
            if (ampmRef.current) {
                const index = ampmList.indexOf(ampm);
                ampmRef.current.scrollTop = index * ITEM_HEIGHT;
            }
            if (hourRef.current) {
                const index = hourList.indexOf(hour);
                hourRef.current.scrollTop = index * ITEM_HEIGHT;
            }
            if (minuteRef.current) {
                const index = minuteList.indexOf(minute);
                minuteRef.current.scrollTop = index * ITEM_HEIGHT; // Approximate for 5-step
            }
        }
    }, [isOpen]);

    const handleConfirm = () => {
        let finalHour = hour;
        if (ampm === 'PM' && hour !== 12) finalHour += 12;
        if (ampm === 'AM' && hour === 12) finalHour = 0;

        const formattedHour = finalHour.toString().padStart(2, '0');
        const formattedMinute = minute.toString().padStart(2, '0');

        onSelect(`${formattedHour}:${formattedMinute}`);
        medium();
        onClose();
    };

    // Helper to render a scrollable wheel
    const Wheel = ({
        items,
        value,
        onChange,
        containerRef
    }: {
        items: (string | number)[],
        value: string | number,
        onChange: (val: any) => void,
        containerRef: React.RefObject<HTMLDivElement>
    }) => {
        const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
            const target = e.target as HTMLDivElement;
            // Simple snap logic (for visual update, actual snap handled by CSS)
            // const scrollTop = target.scrollTop; // Removed unused var
            const index = Math.round(target.scrollTop / ITEM_HEIGHT);
            if (items[index] !== undefined && items[index] !== value) {
                onChange(items[index]);
                selection();
            }
        };

        return (
            <div className="relative h-[200px] w-full overflow-hidden">
                {/* Selection Highlight */}
                <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-[40px] bg-white/10 rounded-lg pointer-events-none z-10" />

                <div
                    ref={containerRef}
                    className="h-full overflow-y-auto no-scrollbar snap-y snap-mandatory py-[80px]"
                    onScroll={handleScroll}
                >
                    {items.map((item) => (
                        <div
                            key={item}
                            className={`h-[40px] flex items-center justify-center text-[17px] font-medium snap-center transition-colors ${item === value ? 'text-white' : 'text-gray-500'
                                }`}
                        >
                            {typeof item === 'number' ? item.toString().padStart(2, '0') : item}
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
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="fixed bottom-0 left-0 right-0 z-[60] bg-[#1C1C1E] rounded-t-2xl overflow-hidden pb-8"
                        // Prevent scroll propagation
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700/50">
                            <button
                                onClick={onClose}
                                className="text-gray-400 text-[16px]"
                            >
                                취소
                            </button>
                            <span className="text-white font-semibold text-[17px]">시간 설정</span>
                            <button
                                onClick={handleConfirm}
                                className="text-[#0A84FF] font-semibold text-[16px]"
                            >
                                완료
                            </button>
                        </div>

                        {/* Wheels Container */}
                        <div className="flex px-8 py-6 gap-2">
                            {/* AM/PM */}
                            <div className="flex-1">
                                <Wheel
                                    items={ampmList}
                                    value={ampm}
                                    onChange={setAmpm}
                                    containerRef={ampmRef as any}
                                />
                            </div>

                            {/* Hour */}
                            <div className="flex-1">
                                <Wheel
                                    items={hourList}
                                    value={hour}
                                    onChange={setHour}
                                    containerRef={hourRef as any}
                                />
                            </div>

                            {/* Colon Separator (Optional visuals) */}
                            <div className="flex items-center justify-center text-white pb-2">:</div>

                            {/* Minute */}
                            <div className="flex-1">
                                <Wheel
                                    items={minuteList}
                                    value={minute}
                                    onChange={setMinute}
                                    containerRef={minuteRef as any}
                                />
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
