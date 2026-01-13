import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { createDiaryEntry } from '../../lib/notion';
import { useAuth } from '../../context/AuthContext';
import { DatePickerModal } from '../common/DatePickerModal';

interface FeedWriteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    type?: 'Diary' | 'Memory';
}

const MOOD_OPTIONS = [
    { emoji: '😊', label: '행복', value: '행복' },
    { emoji: '😌', label: '평온', value: '평온' },
    { emoji: '🥰', label: '사랑', value: '사랑' },
    { emoji: '😢', label: '슬픔', value: '슬픔' },
    { emoji: '😤', label: '화남', value: '화남' },
    { emoji: '😴', label: '피곤', value: '피곤' },
    { emoji: '🤔', label: '고민', value: '고민' },
    { emoji: '✨', label: '설렘', value: '설렘' },
];

const FeedWriteModal: React.FC<FeedWriteModalProps> = ({ isOpen, onClose, onSuccess, type = 'Diary' }) => {
    const { user, userData } = useAuth();
    const [content, setContent] = useState('');
    const [images, setImages] = useState<{ base64: string, type: string, size: number, name: string }[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedMood, setSelectedMood] = useState('평온');
    const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [isMoodPickerOpen, setIsMoodPickerOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);

            files.forEach(file => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setImages(prev => [...prev, {
                        base64: reader.result as string,
                        type: file.type,
                        size: file.size,
                        name: file.name
                    }]);
                };
                reader.readAsDataURL(file);
            });
        }
    };

    const handleRemoveImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (!content && images.length === 0) return;

        setIsLoading(true);
        try {
            await createDiaryEntry(content, images, type, {
                mood: selectedMood,
                sender: userData?.name || user?.displayName || "나",
                date: selectedDate
            });
            setContent('');
            setImages([]);
            setSelectedMood('평온');
            setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
            onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            alert('업로드에 실패했습니다. 다시 시도해주세요.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        if ((content || images.length > 0) && !isLoading) {
            if (window.confirm('작성 중인 내용이 있습니다. 정말 닫으시겠습니까?')) {
                setContent('');
                setImages([]);
                onClose();
            }
        } else {
            onClose();
        }
    };

    const formatDisplayDate = (dateStr: string) => {
        try {
            return format(new Date(dateStr), 'M월 d일 (EEE)', { locale: ko });
        } catch {
            return dateStr;
        }
    };

    const currentMood = MOOD_OPTIONS.find(m => m.value === selectedMood) || MOOD_OPTIONS[1];

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
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, y: 100 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 100 }}
                        className="fixed inset-x-4 bottom-24 top-32 z-50 bg-background rounded-xl shadow-2xl overflow-hidden max-w-lg mx-auto flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                            <h3 className="text-lg font-bold text-primary">
                                {type === 'Diary' ? '새 일기' : '새 추억'}
                            </h3>
                            <button
                                onClick={handleClose}
                                className="p-1 rounded-full hover:bg-secondary transition-colors"
                            >
                                <span className="material-symbols-outlined text-text-secondary">close</span>
                            </button>
                        </div>

                        {/* Meta Info Bar */}
                        <div className="flex items-center gap-2 px-5 py-3 border-b border-border bg-secondary/30">
                            {/* Date Selector */}
                            <button
                                onClick={() => setIsDatePickerOpen(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background border border-border hover:border-primary transition-colors"
                            >
                                <span className="material-symbols-outlined text-[16px] text-text-secondary">calendar_today</span>
                                <span className="text-xs font-medium text-primary">{formatDisplayDate(selectedDate)}</span>
                            </button>

                            {/* Mood Selector */}
                            <button
                                onClick={() => setIsMoodPickerOpen(!isMoodPickerOpen)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background border border-border hover:border-primary transition-colors"
                            >
                                <span className="text-base">{currentMood.emoji}</span>
                                <span className="text-xs font-medium text-primary">{currentMood.label}</span>
                                <span className="material-symbols-outlined text-[14px] text-text-secondary">
                                    {isMoodPickerOpen ? 'expand_less' : 'expand_more'}
                                </span>
                            </button>
                        </div>

                        {/* Mood Picker Dropdown */}
                        <AnimatePresence>
                            {isMoodPickerOpen && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden border-b border-border bg-secondary/20"
                                >
                                    <div className="flex flex-wrap gap-2 px-5 py-3">
                                        {MOOD_OPTIONS.map((mood) => (
                                            <button
                                                key={mood.value}
                                                onClick={() => {
                                                    setSelectedMood(mood.value);
                                                    setIsMoodPickerOpen(false);
                                                }}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all ${selectedMood === mood.value
                                                        ? 'bg-primary text-background'
                                                        : 'bg-background border border-border hover:border-primary'
                                                    }`}
                                            >
                                                <span className="text-sm">{mood.emoji}</span>
                                                <span className="text-xs font-medium">{mood.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Content Area */}
                        <div className="flex-1 p-5 overflow-y-auto">
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="오늘 하루는 어땠나요?"
                                className="w-full h-full min-h-[120px] bg-transparent text-primary placeholder-text-secondary/50 resize-none outline-none font-serif text-base leading-relaxed"
                                autoFocus
                            />

                            {/* Image Previews */}
                            {images.length > 0 && (
                                <div className="flex gap-3 overflow-x-auto py-3 scrollbar-hide">
                                    {images.map((img, idx) => (
                                        <div key={idx} className="relative flex-shrink-0 size-20 rounded-lg overflow-hidden shadow-sm group border border-border">
                                            <img src={img.base64} alt="preview" className="w-full h-full object-cover" />
                                            <button
                                                onClick={() => handleRemoveImage(idx)}
                                                className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <span className="material-symbols-outlined text-[14px]">close</span>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer Actions */}
                        <div className="flex items-center justify-between px-5 py-4 border-t border-border">
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="flex items-center gap-2 text-text-secondary hover:text-primary transition-colors px-2 py-1"
                            >
                                <span className="material-symbols-outlined text-xl">add_photo_alternate</span>
                                <span className="text-xs font-medium">사진 추가</span>
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                multiple
                                accept="image/*"
                                onChange={handleFileChange}
                            />

                            <button
                                onClick={handleSubmit}
                                disabled={isLoading || (!content && images.length === 0)}
                                className="px-6 py-2.5 bg-primary text-background font-bold text-sm rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:opacity-90 active:scale-95"
                            >
                                {isLoading ? '저장 중...' : '저장하기'}
                            </button>
                        </div>
                    </motion.div>

                    {/* Date Picker Modal */}
                    <DatePickerModal
                        isOpen={isDatePickerOpen}
                        onClose={() => setIsDatePickerOpen(false)}
                        onSelect={(date) => {
                            if (date) setSelectedDate(date);
                            setIsDatePickerOpen(false);
                        }}
                        selectedDate={selectedDate}
                        minDate={new Date(2020, 0, 1)} // Allow past dates for diary
                    />
                </>
            )}
        </AnimatePresence>
    );
};

export default FeedWriteModal;
