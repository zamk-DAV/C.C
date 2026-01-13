import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { useGesture } from '@use-gesture/react';
import { useHaptics } from '../../hooks/useHaptics';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface ImageViewerProps {
    src: string | string[] | null; // Single image or array of images
    alt?: string;
    isOpen: boolean;
    onClose: () => void;
    initialIndex?: number;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({
    src,
    alt,
    isOpen,
    onClose,
    initialIndex = 0
}) => {
    const { medium, light } = useHaptics();

    // Normalize src to array
    const images = Array.isArray(src) ? src : (src ? [src] : []);
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const currentImage = images[currentIndex];

    const [scale, setScale] = useState(1);

    // Motion values for drag
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    // Spring animation for smooth reset
    const springX = useSpring(x, { stiffness: 300, damping: 30 });
    const springY = useSpring(y, { stiffness: 300, damping: 30 });

    // Background opacity based on drag distance
    const dragDistance = useTransform(y, [-200, 0, 200], [0.3, 1, 0.3]);
    const imageScale = useTransform(y, [-200, 0, 200], [0.8, 1, 0.8]);

    // Reset state on open or image change
    useEffect(() => {
        if (isOpen) {
            setScale(1);
            x.set(0);
            y.set(0);
            setCurrentIndex(initialIndex);
        }
    }, [isOpen, initialIndex]);

    // Navigate to previous/next image
    const goToPrevious = useCallback(() => {
        if (currentIndex > 0) {
            light();
            setCurrentIndex(prev => prev - 1);
            x.set(0);
            y.set(0);
            setScale(1);
        }
    }, [currentIndex, light, x, y]);

    const goToNext = useCallback(() => {
        if (currentIndex < images.length - 1) {
            light();
            setCurrentIndex(prev => prev + 1);
            x.set(0);
            y.set(0);
            setScale(1);
        }
    }, [currentIndex, images.length, light, x, y]);

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
                if (!active && Math.abs(mx) > 80 && vx > 0.3) {
                    if (dx < 0 && currentIndex < images.length - 1) {
                        // Swipe left -> next
                        goToNext();
                        return;
                    } else if (dx > 0 && currentIndex > 0) {
                        // Swipe right -> previous
                        goToPrevious();
                        return;
                    }
                }

                // Vertical drag to dismiss
                if (my > 120 && active) {
                    cancel();
                    medium();
                    onClose();
                }
            }
        },
        onPinch: ({ offset: [s] }) => {
            setScale(s);
        },
        onDoubleClick: () => {
            medium();
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
        const unsubscribe = y.on('change', (latest) => {
            // If drag ended without dismissing, spring back
            if (Math.abs(latest) < 120 && scale === 1) {
                // Will spring back via springY
            }
        });
        return unsubscribe;
    }, [y, scale]);

    return (
        <AnimatePresence>
            {isOpen && currentImage && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center touch-none overflow-hidden"
                >
                    {/* Dynamic background */}
                    <motion.div
                        className="absolute inset-0 bg-black"
                        style={{ opacity: dragDistance }}
                    />

                    {/* Close button */}
                    <button
                        onClick={onClose}
                        className="absolute top-12 right-6 z-50 p-2 text-white/70 hover:text-white bg-black/30 rounded-full backdrop-blur-sm transition-colors"
                    >
                        <X className="size-6" />
                    </button>

                    {/* Image counter */}
                    {images.length > 1 && (
                        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-50 px-3 py-1 bg-black/30 backdrop-blur-sm rounded-full">
                            <span className="text-white/80 text-[13px] font-medium">
                                {currentIndex + 1} / {images.length}
                            </span>
                        </div>
                    )}

                    {/* Navigation arrows (desktop/tablet) */}
                    {images.length > 1 && (
                        <>
                            {currentIndex > 0 && (
                                <button
                                    onClick={goToPrevious}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 z-50 p-2 text-white/70 hover:text-white bg-black/30 rounded-full backdrop-blur-sm transition-colors hidden md:flex"
                                >
                                    <ChevronLeft className="size-6" />
                                </button>
                            )}
                            {currentIndex < images.length - 1 && (
                                <button
                                    onClick={goToNext}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 z-50 p-2 text-white/70 hover:text-white bg-black/30 rounded-full backdrop-blur-sm transition-colors hidden md:flex"
                                >
                                    <ChevronRight className="size-6" />
                                </button>
                            )}
                        </>
                    )}

                    {/* Image container */}
                    <div {...bind() as any} className="w-full h-full flex items-center justify-center relative z-10">
                        <motion.img
                            key={currentImage}
                            src={currentImage}
                            alt={alt || `Image ${currentIndex + 1}`}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.2 }}
                            style={{
                                x: springX,
                                y: springY,
                                scale: scale === 1 ? imageScale : scale,
                                touchAction: 'none'
                            }}
                            className="max-w-full max-h-screen object-contain pointer-events-auto select-none"
                            draggable={false}
                        />
                    </div>

                    {/* Thumbnail strip for multiple images */}
                    {images.length > 1 && (
                        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 flex gap-2 p-2 bg-black/30 backdrop-blur-sm rounded-xl">
                            {images.map((img, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => {
                                        light();
                                        setCurrentIndex(idx);
                                        setScale(1);
                                        x.set(0);
                                        y.set(0);
                                    }}
                                    className={`size-12 rounded-lg overflow-hidden border-2 transition-all ${idx === currentIndex
                                            ? 'border-white scale-110'
                                            : 'border-transparent opacity-60 hover:opacity-100'
                                        }`}
                                >
                                    <img src={img} alt="" className="w-full h-full object-cover" />
                                </button>
                            ))}
                        </div>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
};
