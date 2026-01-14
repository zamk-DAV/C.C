import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { createDiaryEntry } from '../../lib/notion';
import { useAuth } from '../../context/AuthContext';
import { useNotion } from '../../context/NotionContext';
import type { NotionItem } from '../../types';

interface MemoryWriteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const MemoryWriteModal: React.FC<MemoryWriteModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const { user, userData } = useAuth();
    const { addOptimisticItem } = useNotion();
    const [content, setContent] = useState('');
    const [images, setImages] = useState<{ base64: string, type: string, size: number, name: string }[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setContent('');
            setImages([]);
        }
    }, [isOpen]);

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
        const dateString = format(new Date(), 'yyyy-MM-dd');

        // Optimistic Update
        const optimisticItem: NotionItem = {
            id: `optimistic-${Date.now()}`,
            title: '추억',
            date: dateString,
            coverImage: images[0]?.base64 || null,
            previewText: content,
            type: 'Memory',
            author: userData?.name || user?.displayName || '나',
            images: images.map(img => img.base64)
        };

        try {
            addOptimisticItem('Memory', optimisticItem);

            setContent('');
            setImages([]);
            onSuccess();
            onClose();

            await createDiaryEntry(content, images, 'Memory', {
                sender: userData?.name || user?.displayName || "나",
                date: dateString
            });
        } catch (error) {
            console.error("Memory save failed:", error);
            alert('저장에 실패했습니다.');
            refreshData(); // Restore UI state on failure
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                    />

                    {/* Modal Container - Simpler, lighter design */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="relative w-full max-w-md bg-background rounded-3xl overflow-hidden flex flex-col shadow-2xl border border-border"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
                            <button
                                onClick={onClose}
                                className="text-text-secondary text-sm font-medium hover:text-primary transition-colors"
                            >
                                취소
                            </button>
                            <h2 className="text-primary text-lg font-bold tracking-tight flex items-center gap-2">
                                <span className="material-symbols-outlined text-xl">auto_awesome</span>
                                추억 남기기
                            </h2>
                            <button
                                onClick={handleSubmit}
                                disabled={isLoading || (!content && images.length === 0)}
                                className="bg-primary text-background px-5 py-2 rounded-full text-sm font-bold hover:opacity-90 transition-all active:scale-95 disabled:opacity-30"
                            >
                                {isLoading ? '...' : '저장'}
                            </button>
                        </div>

                        {/* Loading Overlay */}
                        <AnimatePresence>
                            {isLoading && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute inset-0 z-[100] bg-background/60 backdrop-blur-md flex flex-col items-center justify-center"
                                >
                                    <div className="w-16 h-16 border-4 border-secondary/30 border-t-primary rounded-full animate-spin" />
                                    <p className="mt-4 text-primary font-bold tracking-tight">추억을 저장하는 중...</p>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 max-h-[60vh]">
                            {/* Image Upload Section */}
                            <section>
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
                                        className="group w-full aspect-video rounded-2xl border-2 border-dashed border-secondary/40 hover:border-primary flex flex-col items-center justify-center gap-3 hover:bg-secondary/10 transition-all cursor-pointer bg-secondary/5"
                                    >
                                        <div className="w-14 h-14 rounded-full bg-secondary/20 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                                            <span className="material-symbols-outlined text-text-secondary group-hover:text-primary text-3xl transition-colors">add_photo_alternate</span>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-text-secondary group-hover:text-primary text-sm font-medium transition-colors">사진 추가하기</p>
                                            <p className="text-text-secondary/50 text-xs mt-1">여러 장 선택 가능</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {/* Image Grid */}
                                        <div className="grid grid-cols-3 gap-2">
                                            {images.map((img, idx) => (
                                                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden group/item">
                                                    <img src={img.base64} alt="preview" className="w-full h-full object-cover" />
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleRemoveImage(idx); }}
                                                        className="absolute top-1.5 right-1.5 bg-black/60 text-white rounded-full p-1 opacity-100 sm:opacity-0 group-hover/item:opacity-100 transition-opacity hover:bg-red-500"
                                                    >
                                                        <span className="material-symbols-outlined text-xs">close</span>
                                                    </button>
                                                </div>
                                            ))}
                                            {/* Add More Button */}
                                            <div
                                                onClick={() => fileInputRef.current?.click()}
                                                className="aspect-square rounded-xl border-2 border-dashed border-secondary/30 hover:border-primary flex items-center justify-center cursor-pointer hover:bg-secondary/10 transition-all"
                                            >
                                                <span className="material-symbols-outlined text-text-secondary text-2xl">add</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </section>

                            {/* Text Input */}
                            <section>
                                <textarea
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    className="w-full bg-secondary/10 border border-secondary/20 focus:border-primary rounded-2xl p-4 text-base leading-relaxed text-primary placeholder-text-secondary/40 focus:ring-0 min-h-[120px] resize-none outline-none transition-all"
                                    placeholder="이 순간을 기록해보세요..."
                                />
                            </section>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default MemoryWriteModal;
