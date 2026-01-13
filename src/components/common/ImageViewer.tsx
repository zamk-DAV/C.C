import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue } from 'framer-motion';
import { useGesture } from '@use-gesture/react';
import { useHaptics } from '../../hooks/useHaptics';

interface ImageViewerProps {
    src: string | null;
    alt?: string;
    isOpen: boolean;
    onClose: () => void;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({ src, alt, isOpen, onClose }) => {
    const { medium } = useHaptics();

    // We use ref to detecting double taps manually if needed, 
    // but useGesture has onDoubleClick (or triggers on generic handlers).

    const [scale, setScale] = useState(1);
    // Drag offset
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    // Reset state on open
    useEffect(() => {
        if (isOpen) {
            setScale(1);
            x.set(0);
            y.set(0);
        }
    }, [isOpen]);

    const bind = useGesture({
        onDrag: ({ offset: [mx, my], cancel, tap, active }) => {
            if (tap) return;

            if (scale > 1) {
                // Pan logic
                x.set(mx);
                y.set(my);
            } else {
                // Drag to dismiss logic
                // Only allow dragging down significantly or panning slightly
                x.set(mx);
                y.set(my);

                // If user drags down enough, close
                if (my > 150 && active) {
                    cancel();
                    medium();
                    onClose();
                }
            }
        },
        onPinch: ({ offset: [s], memo }) => {
            // Basic pinch zoom
            setScale(s);
            return memo;
        },
        onDoubleClick: () => {
            medium();
            if (scale > 1) {
                setScale(1);
                x.set(0);
                y.set(0);
            } else {
                setScale(2);
            }
        }
    }, {
        drag: {
            from: () => [x.get(), y.get()],
            filterTaps: true,
            rubberband: true
        },
        pinch: {
            scaleBounds: { min: 1, max: 4 },
            rubberband: true
        }
    });

    return (
        <AnimatePresence>
            {isOpen && src && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] bg-black flex items-center justify-center touch-none overflow-hidden"
                >
                    {/* Close button for fallback */}
                    <button
                        onClick={onClose}
                        className="absolute top-10 right-6 z-50 p-2 text-white/50 hover:text-white bg-black/20 rounded-full backdrop-blur-sm"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>

                    <div {...bind() as any} className="w-full h-full flex items-center justify-center">
                        <motion.img
                            src={src}
                            alt={alt}
                            style={{ x, y, scale, touchAction: 'none' }}
                            className="max-w-full max-h-screen object-contain pointer-events-auto"
                            draggable={false}
                        />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
