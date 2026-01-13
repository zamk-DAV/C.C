import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WheelPicker } from './WheelPicker';
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
    const { medium } = useHaptics();

    // Parse initial time
    const [initHour, initMinute] = initialTime.split(':').map(Number);
    const [ampm, setAmpm] = useState<'오전' | '오후'>(initHour >= 12 ? '오후' : '오전');
    const [hour, setHour] = useState(initHour > 12 ? initHour - 12 : (initHour === 0 ? 12 : initHour));
    const [minute, setMinute] = useState(initMinute);

    const ampmList: ('오전' | '오후')[] = ['오전', '오후'];
    const hourList = Array.from({ length: 12 }, (_, i) => i + 1);
    const minuteList = Array.from({ length: 60 }, (_, i) => i);

    const handleConfirm = () => {
        let finalHour = hour;
        if (ampm === '오후' && hour !== 12) finalHour += 12;
        if (ampm === '오전' && hour === 12) finalHour = 0;

        const formattedHour = finalHour.toString().padStart(2, '0');
        const formattedMinute = minute.toString().padStart(2, '0');

        onSelect(`${formattedHour}:${formattedMinute}`);
        medium();
        onClose();
    };

    const formatHour = (h: number) => `${h}시`;
    const formatMinute = (m: number) => `${m.toString().padStart(2, '0')}분`;

    // Calculate display time for preview
    const getDisplayTime = () => {
        const displayHour = hour.toString().padStart(2, '0');
        const displayMinute = minute.toString().padStart(2, '0');
        return `${ampm} ${displayHour}:${displayMinute}`;
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
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="fixed bottom-0 left-0 right-0 z-[60] bg-background-secondary/95 backdrop-blur-xl rounded-t-3xl overflow-hidden border-t border-border/20"
                        onClick={(e) => e.stopPropagation()}
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
                            <span className="text-primary font-semibold text-[17px]">시간 설정</span>
                            <button
                                onClick={handleConfirm}
                                className="text-accent font-semibold text-[17px] active:opacity-70 transition-opacity"
                            >
                                완료
                            </button>
                        </div>

                        {/* Column Labels */}
                        <div className="flex px-4 pt-4 pb-2 gap-2">
                            <div className="flex-1 text-center text-[13px] font-medium text-text-secondary">오전/오후</div>
                            <div className="flex-1 text-center text-[13px] font-medium text-text-secondary">시</div>
                            <div className="flex-1 text-center text-[13px] font-medium text-text-secondary">분</div>
                        </div>

                        {/* Wheel Pickers */}
                        <div className="flex px-4 pb-4 gap-2">
                            {/* AM/PM */}
                            <div className="flex-1 border border-border/10 rounded-xl overflow-hidden">
                                <WheelPicker
                                    items={ampmList}
                                    value={ampm}
                                    onChange={setAmpm}
                                />
                            </div>

                            {/* Hour */}
                            <div className="flex-1 border border-border/10 rounded-xl overflow-hidden">
                                <WheelPicker
                                    items={hourList}
                                    value={hour}
                                    onChange={setHour}
                                    formatItem={(h) => `${h}`}
                                />
                            </div>

                            {/* Minute */}
                            <div className="flex-1 border border-border/10 rounded-xl overflow-hidden">
                                <WheelPicker
                                    items={minuteList}
                                    value={minute}
                                    onChange={setMinute}
                                    formatItem={(m) => m.toString().padStart(2, '0')}
                                />
                            </div>
                        </div>

                        {/* Preview */}
                        <div className="px-6 pb-8">
                            <div className="bg-primary/5 rounded-2xl p-4 text-center">
                                <span className="text-[15px] text-text-secondary">선택된 시간</span>
                                <p className="text-[24px] font-bold text-primary mt-1 tracking-wider">
                                    {getDisplayTime()}
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
