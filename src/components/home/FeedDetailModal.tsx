import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { MemoryItem } from '../../types';

interface FeedDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: MemoryItem | null;
}

export const FeedDetailModal: React.FC<FeedDetailModalProps> = ({ isOpen, onClose, item }) => {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    if (!item) return null;

    const images = item.images && item.images.length > 0 ? item.images : (item.imageUrl ? [item.imageUrl] : []);
    const hasMultipleImages = images.length > 1;

    const handlePrevImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
    };

    const handleNextImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
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
                        className="fixed inset-0 bg-black/90 z-50"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4"
                    >
                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="absolute top-6 right-6 p-2 text-white/70 hover:text-white transition-colors z-50"
                        >
                            <span className="material-symbols-outlined text-3xl">close</span>
                        </button>

                        {/* Image Carousel */}
                        {images.length > 0 && (
                            <div className="relative w-full max-w-2xl aspect-[3/4] flex items-center justify-center">
                                {/* Current Image */}
                                <motion.img
                                    key={currentImageIndex}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    src={images[currentImageIndex]}
                                    alt={`Image ${currentImageIndex + 1}`}
                                    className="max-w-full max-h-full object-contain rounded-lg"
                                />

                                {/* Navigation Arrows */}
                                {hasMultipleImages && (
                                    <>
                                        <button
                                            onClick={handlePrevImage}
                                            className="absolute left-2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                                        >
                                            <span className="material-symbols-outlined">chevron_left</span>
                                        </button>
                                        <button
                                            onClick={handleNextImage}
                                            className="absolute right-2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                                        >
                                            <span className="material-symbols-outlined">chevron_right</span>
                                        </button>
                                    </>
                                )}

                                {/* Image Counter */}
                                {hasMultipleImages && (
                                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1 rounded-full">
                                        {currentImageIndex + 1} / {images.length}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Title and Content */}
                        <div className="w-full max-w-2xl mt-6 text-center">
                            <p className="text-white/50 text-xs uppercase tracking-widest mb-2">
                                {item.date}
                            </p>
                            <h2 className="text-white text-xl font-serif italic mb-4">
                                {item.title || item.quote || 'No content'}
                            </h2>
                            {item.subtitle && (
                                <p className="text-white/70 text-sm max-w-md mx-auto">
                                    {item.subtitle}
                                </p>
                            )}
                        </div>

                        {/* Dot Indicators */}
                        {hasMultipleImages && (
                            <div className="flex gap-2 mt-6">
                                {images.map((_, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setCurrentImageIndex(idx)}
                                        className={`w-2 h-2 rounded-full transition-colors ${idx === currentImageIndex ? 'bg-white' : 'bg-white/30'
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
