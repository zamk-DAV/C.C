import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence, type PanInfo } from 'framer-motion';
import type { MemoryItem } from '../../types';
import { format, parseISO } from 'date-fns';

interface FeedDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: MemoryItem | null;
}

export const FeedDetailModal: React.FC<FeedDetailModalProps> = ({ isOpen, onClose, item }) => {
    // const { userData, partnerData } = useAuth(); // Unused for now
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [dragDirection, setDragDirection] = useState<'x' | 'y' | null>(null);

    // Safe derivation of values for hooks
    const images = item ? (item.images && item.images.length > 0 ? item.images : (item.imageUrl ? [item.imageUrl] : [])) : [];
    const hasMultipleImages = images.length > 1;

    // Format date for header
    const formattedDate = item && item.date ? (() => {
        try {
            return format(parseISO(item.date), 'yyyy. M. d. a h:mm');
        } catch {
            return item.date;
        }
    })() : '';

    // Author name display (placeholder - will be refined)
    const authorName = "Memory";

    // Handle swipe gestures
    const handleDragEnd = useCallback((_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        const threshold = 50;
        const velocity = 500;

        // Horizontal swipe for image navigation
        if (Math.abs(info.offset.x) > Math.abs(info.offset.y)) {
            if (info.offset.x < -threshold || info.velocity.x < -velocity) {
                // Swipe left - next image
                if (currentImageIndex < images.length - 1) {
                    setCurrentImageIndex(prev => prev + 1);
                }
            } else if (info.offset.x > threshold || info.velocity.x > velocity) {
                // Swipe right - previous image
                if (currentImageIndex > 0) {
                    setCurrentImageIndex(prev => prev - 1);
                }
            }
        }

        // Vertical swipe to close
        if (info.offset.y > 100 || info.velocity.y > velocity) {
            onClose();
        }

        setDragDirection(null);
    }, [currentImageIndex, images.length, onClose]);

    if (!item) return null;

    const handleDrag = useCallback((_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        if (!dragDirection) {
            if (Math.abs(info.offset.x) > Math.abs(info.offset.y)) {
                setDragDirection('x');
            } else {
                setDragDirection('y');
            }
        }
    }, [dragDirection]);

    // Download image
    const handleDownload = async () => {
        if (images.length === 0) return;
        const imageUrl = images[currentImageIndex];

        try {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `memory_${Date.now()}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Download failed:', error);
            // Fallback: open in new tab
            window.open(imageUrl, '_blank');
        }
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
                        className="fixed inset-0 bg-black z-50"
                    />

                    {/* Bottom Sheet Container */}
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        drag="y"
                        dragConstraints={{ top: 0, bottom: 0 }}
                        dragElastic={{ top: 0, bottom: 0.5 }}
                        onDragEnd={(_, info) => {
                            if (info.offset.y > 100) onClose();
                        }}
                        className="fixed inset-0 z-50 flex flex-col bg-black"
                    >
                        {/* Header */}
                        <header className="flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-sm shrink-0">
                            <button
                                onClick={onClose}
                                className="p-2 -ml-2 text-white/80 hover:text-white transition-colors"
                            >
                                <span className="material-symbols-outlined text-2xl">arrow_back</span>
                            </button>

                            <div className="flex flex-col items-center">
                                <span className="text-white font-medium text-sm">{authorName}</span>
                                <span className="text-white/50 text-xs">{formattedDate}</span>
                            </div>

                            {/* Placeholder for grid view button (optional) */}
                            <div className="w-10" />
                        </header>

                        {/* Image Area */}
                        <motion.div
                            className="flex-1 flex items-center justify-center overflow-hidden"
                            drag={hasMultipleImages ? "x" : false}
                            dragConstraints={{ left: 0, right: 0 }}
                            dragElastic={0.2}
                            onDrag={handleDrag}
                            onDragEnd={handleDragEnd}
                        >
                            {images.length > 0 ? (
                                <motion.img
                                    key={currentImageIndex}
                                    initial={{ opacity: 0.5 }}
                                    animate={{ opacity: 1 }}
                                    src={images[currentImageIndex]}
                                    alt={`Image ${currentImageIndex + 1}`}
                                    className="max-w-full max-h-full object-contain select-none"
                                    draggable={false}
                                />
                            ) : (
                                <div className="text-white/50 text-center">
                                    <span className="material-symbols-outlined text-6xl">image</span>
                                    <p className="mt-2">No image</p>
                                </div>
                            )}
                        </motion.div>

                        {/* Image Counter */}
                        {hasMultipleImages && (
                            <div className="absolute top-1/2 left-0 right-0 flex justify-center pointer-events-none">
                                <div className="bg-black/60 text-white text-xs px-3 py-1 rounded-full">
                                    {currentImageIndex + 1} / {images.length}
                                </div>
                            </div>
                        )}

                        {/* Dot Indicators */}
                        {hasMultipleImages && (
                            <div className="absolute bottom-20 left-0 right-0 flex justify-center gap-1.5">
                                {images.map((_, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setCurrentImageIndex(idx)}
                                        className={`w-1.5 h-1.5 rounded-full transition-colors ${idx === currentImageIndex ? 'bg-white' : 'bg-white/30'
                                            }`}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Bottom Bar - Download Only */}
                        <footer className="flex items-center justify-center h-16 bg-black border-t border-white/10 shrink-0">
                            <button
                                onClick={handleDownload}
                                className="p-3 text-white/70 hover:text-white transition-colors"
                                title="다운로드"
                            >
                                <span className="material-symbols-outlined text-2xl">download</span>
                            </button>
                        </footer>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
