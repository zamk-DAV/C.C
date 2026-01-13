import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useGesture } from '@use-gesture/react';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { NotionItem } from '../../lib/notion';
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

    // Zoom & Pan State
    const [scale, setScale] = useState(1);
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    // Spring animation for smooth physics
    const springX = useSpring(x, { stiffness: 300, damping: 30 });
    const springY = useSpring(y, { stiffness: 300, damping: 30 });

    // Background opacity based on drag distance (when not zoomed)
    const dragDistance = useTransform(y, [-200, 0, 200], [0.5, 1, 0.5]);

    // Safe derivation of values
    const images = item
        ? (item.images && item.images.length > 0 ? item.images : (item.coverImage ? [item.coverImage] : []))
        : [];
    const hasMultipleImages = images.length > 1;

    // Reset state when opening or changing images
    useEffect(() => {
        if (isOpen) {
            setScale(1);
            x.set(0);
            y.set(0);
            setCurrentImageIndex(0);
        }
    }, [isOpen]);

    useEffect(() => {
        // Reset transform when changing images
        setScale(1);
        x.set(0);
        y.set(0);
    }, [currentImageIndex, x, y]);

    // Format date for header
    const formattedDate = item && item.date ? (() => {
        try {
            return format(parseISO(item.date), 'yyyy. M. d. a h:mm', { locale: ko });
        } catch {
            return item.date;
        }
    })() : '';

    // Gesture Logic
    const bind = useGesture({
        onDrag: ({ offset: [mx, my], cancel, tap, active, direction: [dx], velocity: [vx] }) => {
            if (tap) return;

            if (scale > 1) {
                // Pan logic when zoomed
                x.set(mx);
                y.set(my);
            } else {
                // Drag to dismiss or swipe to navigate
                x.set(mx);
                y.set(my);

                // Horizontal swipe for gallery navigation (only when not zoomed)
                if (!active && Math.abs(mx) > 50 && vx > 0.3) {
                    if (dx < 0 && currentImageIndex < images.length - 1) {
                        // Swipe left -> next
                        setCurrentImageIndex(prev => prev + 1);
                        return;
                    } else if (dx > 0 && currentImageIndex > 0) {
                        // Swipe right -> previous
                        setCurrentImageIndex(prev => prev - 1);
                        return;
                    }
                }

                // Vertical drag to dismiss
                if (my > 100 && active) {
                    cancel();
                    onClose();
                }
            }
        },
        onPinch: ({ offset: [s] }) => {
            setScale(s);
        },
        onDoubleClick: () => {
            if (scale > 1) {
                setScale(1);
                x.set(0);
                y.set(0);
            } else {
                setScale(2.5);
            }
        }
    }, {
        drag: {
            from: () => [x.get(), y.get()],
            filterTaps: true,
            rubberband: true,
            bounds: scale > 1 ? undefined : { left: -100, right: 100, top: -150, bottom: 150 }
        },
        pinch: {
            scaleBounds: { min: 1, max: 5 },
            rubberband: true
        }
    });

    // Handle drag end - reset position if not dismissed
    useEffect(() => {
        const unsubscribe = y.on('change', () => {
            // Should spring back if not dismissed
        });
        return unsubscribe;
    }, [y]);

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
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black z-50 touch-none"
                    />

                    {/* Container */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex flex-col pointer-events-none"
                    >
                        {/* Header */}
                        <motion.header
                            initial={{ y: -50, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            className="flex items-center justify-between px-4 pt-14 pb-4 bg-black/60 backdrop-blur-sm shrink-0 pointer-events-auto z-10"
                        >
                            <button
                                onClick={onClose}
                                className="p-2 -ml-2 text-white/80 hover:text-white transition-colors"
                            >
                                <span className="material-symbols-outlined text-2xl">arrow_back</span>
                            </button>

                            <div className="flex flex-col items-center flex-1 mx-4">
                                <span className="text-white font-medium text-sm">{authorName}</span>
                                <span className="text-white/50 text-xs">{formattedDate}</span>
                            </div>

                            {/* Counter in Request Position (Top Right) */}
                            <div className="w-10 flex justify-end">
                                {hasMultipleImages && (
                                    <span className="text-white/90 font-medium text-sm">
                                        {currentImageIndex + 1}/{images.length}
                                    </span>
                                )}
                            </div>
                        </motion.header>

                        {/* Image Area */}
                        <div className="flex-1 flex items-center justify-center overflow-hidden pointer-events-auto relative">
                            {/* Dynamic opacity background for drag */}
                            <motion.div
                                className="absolute inset-0 bg-black -z-10"
                                style={{ opacity: dragDistance }}
                            />

                            <div {...bind() as any} className="w-full h-full flex items-center justify-center touch-action-none">
                                {images.length > 0 ? (
                                    <motion.img
                                        key={currentImageIndex}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        src={images[currentImageIndex]}
                                        alt={`Image ${currentImageIndex + 1}`}
                                        className="max-w-full max-h-screen object-contain select-none"
                                        draggable={false}
                                        style={{
                                            x: springX,
                                            y: springY,
                                            scale: scale,
                                            touchAction: 'none'
                                        }}
                                        onError={() => {
                                            if (!retryRef.current) {
                                                console.log("[DiaryDetail] Image load failed. Refreshing...");
                                                retryRef.current = true;
                                                refreshData();
                                            }
                                        }}
                                    />
                                ) : (
                                    <div className="text-white/50 text-center">
                                        <span className="material-symbols-outlined text-6xl">image</span>
                                        <p className="mt-2">No image</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer - Download */}
                        <motion.footer
                            initial={{ y: 50, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            className="flex items-center justify-center h-20 bg-black/60 backdrop-blur-sm shrink-0 pointer-events-auto pb-6"
                        >
                            <button
                                onClick={handleDownload}
                                disabled={images.length === 0}
                                className="p-3 text-white/70 hover:text-white transition-colors disabled:opacity-30"
                            >
                                <span className="material-symbols-outlined text-2xl">download</span>
                            </button>
                        </motion.footer>

                        {/* Dot Indicators */}
                        {hasMultipleImages && (
                            <div className="absolute bottom-24 left-0 right-0 flex justify-center gap-1.5 pointer-events-auto">
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
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
