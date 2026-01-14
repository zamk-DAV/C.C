import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence, type PanInfo } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { NotionItem } from '../../types';
import { useNotion } from '../../context/NotionContext';

interface DiaryDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: NotionItem | null;
    authorName: string;
}

export const DiaryDetailModal: React.FC<DiaryDetailModalProps> = ({
    isOpen,
    onClose,
    item,
    authorName
}) => {
    const { refreshData } = useNotion();
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const retryRef = useRef(false);

    // Safe derivation of values for hooks
    const images = item
        ? (item.images && item.images.length > 0 ? item.images : (item.coverImage ? [item.coverImage] : []))
        : [];

    const title = item?.title;
    const content = item?.content;
    const date = item?.date ? (() => {
        try {
            return format(parseISO(item.date), 'yyyy. M. d. (EEEE)', { locale: ko });
        } catch {
            return item.date;
        }
    })() : '';

    // Handle swipe gestures
    const handleDragEnd = useCallback((_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        const threshold = 50;
        const velocity = 500;

        if (Math.abs(info.offset.x) > Math.abs(info.offset.y)) {
            if (info.offset.x < -threshold || info.velocity.x < -velocity) {
                if (currentImageIndex < images.length - 1) {
                    setCurrentImageIndex(prev => prev + 1);
                }
            } else if (info.offset.x > threshold || info.velocity.x > velocity) {
                if (currentImageIndex > 0) {
                    setCurrentImageIndex(prev => prev - 1);
                }
            }
        }

        if (info.offset.y > 100 || info.velocity.y > velocity) {
            onClose();
        }
    }, [currentImageIndex, images.length, onClose]);

    const handleDownload = async (imageUrl: string) => {
        try {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `diary_${Date.now()}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Download failed:', error);
            window.open(imageUrl, '_blank');
        }
    };

    if (!item) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] bg-background flex flex-col pt-14"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-background/80 backdrop-blur-md">
                        <button
                            onClick={onClose}
                            className="material-symbols-outlined text-primary hover:text-text-secondary transition-colors"
                        >
                            arrow_back
                        </button>
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-text-secondary">Diary Entry</span>
                            <span className="text-[12px] font-medium text-primary">{date}</span>
                        </div>
                        <div className="w-6" />
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
                        {/* Image Section */}
                        {images.length > 0 && (
                            <div className="relative w-full aspect-[4/5] bg-secondary overflow-hidden mb-8">
                                <motion.div
                                    className="flex h-full"
                                    drag="x"
                                    dragConstraints={{ left: 0, right: 0 }}
                                    onDragEnd={handleDragEnd}
                                    animate={{ x: `-${currentImageIndex * 100}%` }}
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                >
                                    {images.map((img, idx) => (
                                        <div key={idx} className="w-full h-full flex-shrink-0 flex items-center justify-center p-4">
                                            <img
                                                src={img}
                                                alt={`Diary Image ${idx + 1}`}
                                                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                                                draggable={false}
                                            />
                                        </div>
                                    ))}
                                </motion.div>

                                {/* Image Indicators */}
                                {images.length > 1 && (
                                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                                        {images.map((_, idx) => (
                                            <div
                                                key={idx}
                                                className={`w-1.5 h-1.5 rounded-full transition-all shadow-sm ${idx === currentImageIndex ? 'bg-primary scale-125' : 'bg-primary/20'}`}
                                            />
                                        ))}
                                    </div>
                                )}

                                {/* Image Count Badge */}
                                {images.length > 1 && (
                                    <div className="absolute top-4 right-4 px-2 py-1 rounded-full bg-black/30 backdrop-blur-md border border-white/10">
                                        <span className="text-[10px] font-bold text-white">{currentImageIndex + 1} / {images.length}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Text Content Section */}
                        <div className="px-8 space-y-6">
                            <div className="space-y-4">
                                <h1 className="text-3xl font-serif text-primary italic leading-tight">
                                    {title || 'Untitled Entry'}
                                </h1>
                                <div className="h-[1px] w-12 bg-primary/20" />
                            </div>

                            <p className="text-[16px] text-primary/80 leading-relaxed font-serif whitespace-pre-wrap">
                                {content || '내용이 없습니다.'}
                            </p>

                            {/* Metadata & Actions */}
                            <div className="pt-12 border-t border-border/30 flex items-center justify-between">
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-text-secondary uppercase tracking-widest font-bold">Author</span>
                                    <span className="text-[14px] text-primary font-medium">{authorName}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {images.length > 0 && (
                                        <button
                                            onClick={() => handleDownload(images[currentImageIndex])}
                                            className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-text-secondary hover:text-primary transition-all text-xs border border-border/50"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">download</span>
                                            이미지 저장
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
