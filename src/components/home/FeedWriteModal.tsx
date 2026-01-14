import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { createDiaryEntry, updateDiaryEntry } from '../../lib/notion';
import { useAuth } from '../../context/AuthContext';
import { DatePickerModal } from '../common/DatePickerModal';
import { useNotion } from '../../context/NotionContext';
import type { NotionItem } from '../../types';
import { compressImage } from '../../utils/imageUtils';

interface FeedWriteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    type?: 'Diary' | 'Memory';
    initialData?: {
        id: string;
        title: string;
        content: string;
        images: string[];
        date: string;
        mood?: string;
        weather?: string;
    } | null;
}

const WEATHER_OPTIONS = [
    { icon: 'wb_sunny', label: '맑음', value: '맑음' },
    { icon: 'cloud', label: '구름', value: '구름' },
    { icon: 'rainy', label: '비', value: '비' },
    { icon: 'ac_unit', label: '눈', value: '눈' },
    { icon: 'air', label: '바람', value: '바람' },
];

const MOOD_OPTIONS = [
    { icon: 'sentiment_very_dissatisfied', value: '매우 나쁨' },
    { icon: 'sentiment_dissatisfied', value: '나쁨' },
    { icon: 'sentiment_satisfied', value: '좋음', fill: true },
    { icon: 'sentiment_very_satisfied', value: '매우 좋음' },
    { icon: 'favorite', value: '사랑' },
];

const FeedWriteModal: React.FC<FeedWriteModalProps> = ({ isOpen, onClose, onSuccess, type = 'Diary', initialData }) => {
    const { user, userData } = useAuth();
    const { addOptimisticItem, updateOptimisticItem } = useNotion();
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [images, setImages] = useState<{ base64: string, type: string, size: number, name: string, url?: string }[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedMood, setSelectedMood] = useState('좋음');
    const [selectedWeather, setSelectedWeather] = useState('맑음');
    const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen && initialData) {
            setTitle(initialData.title || '');
            setContent(initialData.content || '');
            setSelectedDate(initialData.date || format(new Date(), 'yyyy-MM-dd'));
            if (initialData.mood) setSelectedMood(initialData.mood);
            if (initialData.weather) setSelectedWeather(initialData.weather);

            if (initialData.images && initialData.images.length > 0) {
                setImages(initialData.images.map(url => ({
                    base64: url,
                    type: 'image/jpeg',
                    size: 0,
                    name: 'existing-image',
                    url: url
                })));
            } else {
                setImages([]);
            }
        } else if (isOpen) {
            setTitle('');
            setContent('');
            setImages([]);
            setSelectedMood('좋음');
            setSelectedWeather('맑음');
            setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
        }
    }, [isOpen, initialData]);


    // ... existing imports

    // ... existing code

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            setIsLoading(true); // Show loading state during compression

            try {
                const compressedImages = await Promise.all(
                    files.map(file => compressImage(file))
                );

                setImages(prev => [...prev, ...compressedImages]);
            } catch (error) {
                console.error("Image compression failed:", error);
                alert("이미지 처리 중 오류가 발생했습니다.");
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleRemoveImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (!content && images.length === 0 && !title) return;

        setIsLoading(true);
        try {
            // Optimistic Update
            const optimisticItem: NotionItem = {
                id: initialData?.id || `optimistic-${Date.now()}`,
                title: title || (type === 'Memory' ? '추억' : '일기'),
                date: selectedDate,
                coverImage: images[0]?.url || images[0]?.base64 || null,
                previewText: content,
                type: type,
                mood: selectedMood,
                weather: selectedWeather,
                author: userData?.name || user?.displayName || '나',
                images: images.map(img => img.url || img.base64 || ''),
                isOptimisticUpdate: !!initialData?.id // Mark as update if editing
            };

            if (initialData?.id) {
                updateOptimisticItem(type, optimisticItem);
            } else {
                addOptimisticItem(type, optimisticItem);
            }

            setTitle('');
            setContent('');
            setImages([]);
            onSuccess();
            onClose();

            // Background API call
            const action = initialData?.id ? async () => {
                const newImages = images.filter(img => img.base64.startsWith('data:'));
                await updateDiaryEntry(
                    initialData.id,
                    content,
                    newImages,
                    {
                        mood: selectedMood,
                        weather: selectedWeather,
                        date: selectedDate,
                        title: title
                    }
                );
            } : async () => {
                await createDiaryEntry(content, images, type, {
                    mood: selectedMood,
                    weather: selectedWeather,
                    sender: userData?.name || user?.displayName || "나",
                    date: selectedDate
                });
            };

            await action();
        } catch (error) {
            console.error(error);
            alert('저장에 실패했습니다.');
            refreshData(); // Restore state on error
        } finally {
            setIsLoading(false);
        }
    };

    const formattedDateHeader = format(new Date(selectedDate), 'yyyy. MM. dd');

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-0 sm:p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm shadow-2xl"
                    />

                    {/* Modal Container */}
                    <motion.div
                        initial={{ opacity: 0, y: "100%" }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: "100%" }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="relative w-full max-w-[430px] h-[100dvh] sm:h-[90vh] bg-background overflow-hidden flex flex-col shadow-2xl sm:rounded-[2.5rem] border-primary border-0 sm:border-[2px]"
                    >
                        {/* Notch Handle */}
                        <div className="flex flex-col items-center bg-background pt-4 pb-2 shrink-0">
                            <div className="h-1.5 w-12 rounded-full bg-secondary"></div>
                        </div>

                        {/* Top Nav */}
                        <div className="flex items-center bg-background px-6 py-4 justify-between sticky top-0 z-10 shrink-0">
                            <button
                                onClick={onClose}
                                className="text-text-secondary text-base font-medium hover:text-primary transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={() => setIsDatePickerOpen(true)}
                                className="flex items-center gap-1 group"
                            >
                                <h2 className="text-primary text-lg font-bold tracking-tight">
                                    {formattedDateHeader}
                                </h2>
                                <span className="material-symbols-outlined text-text-secondary group-hover:text-primary text-sm transition-colors">calendar_today</span>
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={isLoading || (!title && !content && images.length === 0)}
                                className="bg-primary text-background px-6 py-2.5 rounded-full text-sm font-bold hover:opacity-90 transition-all shadow-md active:scale-95 disabled:opacity-30"
                            >
                                {isLoading ? '...' : '저장'}
                            </button>
                        </div>

                        {/* Scroll Content */}
                        <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-2 space-y-10 custom-scrollbar">

                            {/* Weather Section */}
                            <section>
                                <h4 className="text-primary text-[10px] font-extrabold uppercase tracking-[0.2em] mb-4 opacity-40">오늘의 날씨</h4>
                                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-2 px-2">
                                    {WEATHER_OPTIONS.map((w) => (
                                        <div
                                            key={w.value}
                                            onClick={() => setSelectedWeather(w.value)}
                                            className={`flex flex-col items-center justify-center min-w-[62px] h-[74px] rounded-xl transition-all duration-300 cursor-pointer border ${selectedWeather === w.value
                                                ? 'bg-primary text-background border-primary shadow-md scale-105'
                                                : 'bg-secondary/40 text-text-secondary border-transparent hover:border-secondary/50'
                                                }`}
                                        >
                                            <span className="material-symbols-outlined text-2xl">{w.icon}</span>
                                            <p className="text-[8px] font-bold mt-1.5 uppercase tracking-tight">{w.label}</p>
                                        </div>
                                    ))}
                                    <div className="min-w-[10px] shrink-0"></div>
                                </div>
                            </section>

                            {/* Feeling Section */}
                            <section>
                                <h4 className="text-primary text-[10px] font-extrabold uppercase tracking-[0.2em] mb-4 opacity-40">오늘의 기분</h4>
                                <div className="flex justify-between items-center bg-secondary/30 border border-secondary/50 p-2.5 rounded-[2rem] shadow-sm">
                                    {MOOD_OPTIONS.map((m) => (
                                        <button
                                            key={m.value}
                                            onClick={() => setSelectedMood(m.value)}
                                            className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all duration-300 ${selectedMood === m.value
                                                ? 'bg-primary text-background shadow-xl transform scale-110'
                                                : 'text-text-secondary/40 hover:text-text-secondary hover:bg-background'
                                                }`}
                                        >
                                            <span
                                                className="material-symbols-outlined text-3xl"
                                                style={{ fontVariationSettings: m.fill && selectedMood === m.value ? "'FILL' 1" : "'FILL' 0" }}
                                            >
                                                {m.icon}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </section>

                            {/* Image Section - Moved Up & Improved */}
                            <section className="pb-0">
                                <h4 className="text-primary text-[10px] font-extrabold uppercase tracking-[0.2em] mb-4 opacity-40">사진 기록</h4>
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
                                        className="group w-full h-32 rounded-3xl border-2 border-dashed border-secondary/30 hover:border-primary flex flex-col items-center justify-center gap-2 hover:bg-secondary/20 transition-all cursor-pointer bg-secondary/10"
                                    >
                                        <div className="flex flex-col items-center transition-transform group-hover:scale-105 z-10">
                                            <span className="material-symbols-outlined text-text-secondary group-hover:text-primary text-3xl transition-colors">add_a_photo</span>
                                            <p className="text-text-secondary group-hover:text-primary text-xs font-bold tracking-tight transition-colors mt-2">사진 추가하기</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-2 px-2">
                                        {images.map((img, idx) => (
                                            <div key={idx} className="relative h-40 aspect-[3/4] rounded-2xl overflow-hidden shrink-0 shadow-md border border-border group/item">
                                                <img src={img.base64 || img.url} alt="preview" className="w-full h-full object-cover" />
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleRemoveImage(idx); }}
                                                    className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 opacity-100 sm:opacity-0 group-hover/item:opacity-100 transition-opacity hover:bg-red-500"
                                                >
                                                    <span className="material-symbols-outlined text-[14px]">close</span>
                                                </button>
                                            </div>
                                        ))}
                                        <div
                                            onClick={() => fileInputRef.current?.click()}
                                            className="h-40 aspect-[3/4] rounded-2xl border-2 border-dashed border-secondary/30 hover:border-primary flex flex-col items-center justify-center shrink-0 hover:bg-secondary/20 transition-all cursor-pointer bg-secondary/10"
                                        >
                                            <span className="material-symbols-outlined text-text-secondary text-2xl">add</span>
                                            <span className="text-[10px] font-bold text-text-secondary mt-1">더 추가</span>
                                        </div>
                                        <div className="min-w-[10px] shrink-0"></div>
                                    </div>
                                )}
                            </section>

                            {/* Text Inputs - Moved Down */}
                            <section className="space-y-6 pt-2">
                                <input
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full bg-transparent border-b border-secondary/20 focus:border-primary p-0 pb-3 text-3xl font-bold text-primary placeholder-text-secondary/20 focus:ring-0 transition-all outline-none"
                                    placeholder="오늘의 제목..."
                                    type="text"
                                />
                                <textarea
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    className="w-full bg-transparent border-none p-0 text-xl leading-[1.8] text-primary/80 placeholder-text-secondary/20 focus:ring-0 min-h-[300px] resize-none font-normal outline-none"
                                    placeholder="무슨 일이 있었나요?"
                                />
                            </section>

                            <div className="h-20"></div>
                        </div>

                        {/* Home Indicator (Visual only) */}
                        <div className="flex justify-center pb-3 bg-background pt-2 shrink-0">
                            <div className="h-1.5 w-32 rounded-full bg-primary/5"></div>
                        </div>
                    </motion.div>

                    {/* Date Picker Modal Integration */}
                    <DatePickerModal
                        isOpen={isDatePickerOpen}
                        onClose={() => setIsDatePickerOpen(false)}
                        onSelect={(date) => {
                            if (date) setSelectedDate(date);
                            setIsDatePickerOpen(false);
                        }}
                        selectedDate={selectedDate}
                    />
                </div>
            )}
        </AnimatePresence>
    );
};

export default FeedWriteModal;
