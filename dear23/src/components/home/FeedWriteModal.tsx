import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { createDiaryEntry } from '../../lib/notion';
import { useAuth } from '../../context/AuthContext';

interface FeedWriteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    type?: 'Diary' | 'Memory';
}

const WEATHER_OPTIONS = [
    { icon: 'wb_sunny', label: 'Sunny', value: '맑음' },
    { icon: 'cloud', label: 'Cloudy', value: '구름' },
    { icon: 'rainy', label: 'Rainy', value: '비' },
    { icon: 'ac_unit', label: 'Snowy', value: '눈' },
    { icon: 'air', label: 'Windy', value: '바람' },
];

const MOOD_OPTIONS = [
    { icon: 'sentiment_very_dissatisfied', value: '매우 나쁨' },
    { icon: 'sentiment_dissatisfied', value: '나쁨' },
    { icon: 'sentiment_satisfied', value: '좋음', fill: true },
    { icon: 'sentiment_very_satisfied', value: '매우 좋음' },
    { icon: 'bolt', value: '상태 이상' },
];

const FeedWriteModal: React.FC<FeedWriteModalProps> = ({ isOpen, onClose, onSuccess, type = 'Diary' }) => {
    const { user, userData } = useAuth();
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [images, setImages] = useState<{ base64: string, type: string, size: number, name: string }[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedMood, setSelectedMood] = useState('좋음');
    const [selectedWeather, setSelectedWeather] = useState('맑음');
    const [currentDate] = useState(new Date());

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
        if (!content && images.length === 0 && !title) return;

        setIsLoading(true);
        try {
            await createDiaryEntry(content, images, type, {
                mood: selectedMood,
                weather: selectedWeather,
                sender: userData?.name || user?.displayName || "나",
                date: format(currentDate, 'yyyy-MM-dd')
            });

            // Success reset
            setTitle('');
            setContent('');
            setImages([]);
            onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            alert('업로드에 실패했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

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
                        className="relative w-full max-w-[430px] h-[100dvh] sm:h-[90vh] bg-white overflow-hidden flex flex-col shadow-2xl sm:rounded-[2.5rem] border-black border-0 sm:border-[8px]"
                    >
                        {/* Notch Handle (Visual only) */}
                        <div className="flex flex-col items-center bg-white pt-4 pb-2 shrink-0">
                            <div className="h-1.5 w-12 rounded-full bg-gray-100"></div>
                        </div>

                        {/* Top Nav */}
                        <div className="flex items-center bg-white px-6 py-4 justify-between sticky top-0 z-10 shrink-0">
                            <button
                                onClick={onClose}
                                className="text-gray-400 text-base font-medium hover:text-black transition-colors"
                            >
                                Cancel
                            </button>
                            <h2 className="text-black text-lg font-bold tracking-tight">
                                {format(currentDate, 'MMMM d, yyyy', { locale: ko })}
                            </h2>
                            <button
                                onClick={handleSubmit}
                                disabled={isLoading || (!title && !content && images.length === 0)}
                                className="bg-black text-white px-6 py-2.5 rounded-full text-sm font-bold hover:bg-gray-800 transition-all shadow-md active:scale-95 disabled:opacity-30"
                            >
                                {isLoading ? '...' : 'Save'}
                            </button>
                        </div>

                        {/* Scroll Content */}
                        <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-2 space-y-10 custom-scrollbar">

                            {/* Weather Section */}
                            <section>
                                <h4 className="text-black text-[10px] font-extrabold uppercase tracking-[0.2em] mb-4 opacity-30">Weather</h4>
                                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                                    {WEATHER_OPTIONS.map((w) => (
                                        <div
                                            key={w.value}
                                            onClick={() => setSelectedWeather(w.value)}
                                            className={`flex flex-col items-center justify-center min-w-[72px] h-[84px] rounded-2xl transition-all duration-300 cursor-pointer border-2 ${selectedWeather === w.value
                                                ? 'bg-black text-white border-black shadow-lg scale-105'
                                                : 'bg-white text-gray-400 border-gray-100 hover:border-gray-300'
                                                }`}
                                        >
                                            <span className="material-symbols-outlined text-3xl">{w.icon}</span>
                                            <p className="text-[9px] font-bold mt-2 uppercase tracking-tight">{w.label}</p>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* Feeling Section */}
                            <section>
                                <h4 className="text-black text-[10px] font-extrabold uppercase tracking-[0.2em] mb-4 opacity-30">How are you feeling?</h4>
                                <div className="flex justify-between items-center bg-gray-50/50 border border-gray-100 p-2.5 rounded-[2rem] shadow-sm">
                                    {MOOD_OPTIONS.map((m) => (
                                        <button
                                            key={m.value}
                                            onClick={() => setSelectedMood(m.value)}
                                            className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all duration-300 ${selectedMood === m.value
                                                ? 'bg-black text-white shadow-xl transform scale-110'
                                                : 'text-gray-300 hover:text-gray-500 hover:bg-white'
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

                            {/* Text Inputs */}
                            <section className="space-y-6 pt-2">
                                <input
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full bg-transparent border-b border-gray-100 focus:border-black p-0 pb-3 text-3xl font-bold text-black placeholder-gray-200 focus:ring-0 transition-all outline-none"
                                    placeholder="Title of your day..."
                                    type="text"
                                />
                                <textarea
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    className="w-full bg-transparent border-none p-0 text-xl leading-[1.8] text-gray-800 placeholder-gray-200 focus:ring-0 min-h-[300px] resize-none font-normal outline-none"
                                    placeholder="Tell your story..."
                                />
                            </section>

                            {/* Image Section */}
                            <section className="pb-8">
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="group relative w-full aspect-video rounded-3xl border-2 border-dashed border-gray-200 hover:border-black flex flex-col items-center justify-center gap-2 hover:bg-gray-50/50 transition-all cursor-pointer overflow-hidden bg-gray-50/30"
                                >
                                    {images.length > 0 ? (
                                        <div className="absolute inset-0 flex gap-2 p-2 overflow-x-auto scrollbar-hide">
                                            {images.map((img, idx) => (
                                                <div key={idx} className="relative h-full aspect-square rounded-xl overflow-hidden shrink-0 shadow-md">
                                                    <img src={img.base64} alt="preview" className="w-full h-full object-cover" />
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleRemoveImage(idx); }}
                                                        className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 hover:bg-red-500 transition-colors"
                                                    >
                                                        <span className="material-symbols-outlined text-[14px]">close</span>
                                                    </button>
                                                </div>
                                            ))}
                                            <div className="h-full aspect-square flex flex-col items-center justify-center bg-white/50 border-2 border-dashed border-gray-200 rounded-xl shrink-0">
                                                <span className="material-symbols-outlined text-gray-400">add</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center transition-transform group-hover:scale-105 z-10">
                                            <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center mb-4 group-hover:shadow-md transition-all">
                                                <span className="material-symbols-outlined text-gray-300 group-hover:text-black text-3xl transition-colors">add_a_photo</span>
                                            </div>
                                            <p className="text-gray-400 group-hover:text-black text-sm font-bold tracking-tight transition-colors">Add a memory</p>
                                        </div>
                                    )}
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        multiple
                                        accept="image/*"
                                        onChange={handleFileChange}
                                    />
                                </div>
                            </section>

                            <div className="h-32"></div>
                        </div>

                        {/* Bottom Actions Floating Bar */}
                        <div className="absolute bottom-10 left-0 w-full px-6 pointer-events-none z-20">
                            <div className="w-full flex justify-center">
                                <motion.div
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    className="bg-black/90 backdrop-blur-2xl px-8 py-4 rounded-[2rem] shadow-2xl pointer-events-auto flex items-center gap-10 border border-white/10"
                                >
                                    <button className="text-gray-500 hover:text-white transition-colors flex items-center active:scale-90">
                                        <span className="material-symbols-outlined text-2xl font-light">mic</span>
                                    </button>
                                    <div className="w-[1px] h-4 bg-gray-800"></div>
                                    <button className="text-gray-500 hover:text-white transition-colors flex items-center active:scale-90">
                                        <span className="material-symbols-outlined text-2xl font-light">location_on</span>
                                    </button>
                                    <div className="w-[1px] h-4 bg-gray-800"></div>
                                    <button className="text-gray-500 hover:text-white transition-colors flex items-center active:scale-90">
                                        <span className="material-symbols-outlined text-2xl font-light">label</span>
                                    </button>
                                </motion.div>
                            </div>
                        </div>

                        {/* Home Indicator */}
                        <div className="flex justify-center pb-3 bg-white pt-2 shrink-0">
                            <div className="h-1.5 w-32 rounded-full bg-black/5"></div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default FeedWriteModal;
