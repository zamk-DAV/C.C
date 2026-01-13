import React, { useState, useRef } from 'react';
import { format, parseISO } from 'date-fns';
import type { MemoryItem } from '../../types';

export interface MemoryFeedProps {
    items: MemoryItem[];
    onLoadMore?: () => void;
    hasMore?: boolean;
    onItemClick?: (item: MemoryItem) => void;
}

const MemoryImageCard = ({ item, onClick }: { item: MemoryItem, onClick: (item: MemoryItem) => void }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Filter valid images. Fallback to imageUrl if images array is empty.
    const displayImages = item.images && item.images.length > 0
        ? item.images
        : (item.imageUrl ? [item.imageUrl] : []);

    // Helper to extract date
    const formattedDate = item.date ? (() => {
        try {
            return format(parseISO(item.date), 'MM.dd');
        } catch {
            return '';
        }
    })() : '';

    const handleScroll = () => {
        if (scrollRef.current) {
            const index = Math.round(scrollRef.current.scrollLeft / scrollRef.current.clientWidth);
            setCurrentIndex(index);
        }
    };

    return (
        <div className="py-6 w-full cursor-pointer" onClick={() => onClick(item)}>
            <div className="relative w-full aspect-[3/4] rounded-sm overflow-hidden bg-secondary group">
                {/* Horizontal Scroll Container */}
                <div
                    ref={scrollRef}
                    className="flex overflow-x-auto snap-x snap-mandatory w-full h-full"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }} // Hide scrollbar
                    onScroll={handleScroll}
                >
                    {displayImages.map((img, idx) => (
                        <div key={idx} className="w-full h-full flex-shrink-0 snap-center relative">
                            <div
                                className="w-full h-full bg-cover bg-center transition-all duration-300"
                                style={{ backgroundImage: `url('${img}')` }}
                            />
                            {/* Optional: Grayscale effect on hover could be added here if desired, keeping it clean for now */}
                            <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors" />
                        </div>
                    ))}
                </div>

                {/* Indicators (Dots) */}
                {displayImages.length > 1 && (
                    <div className="absolute top-4 right-4 flex gap-1.5 z-10 pointer-events-none">
                        {displayImages.map((_, idx) => (
                            <div
                                key={idx}
                                className={`w-1.5 h-1.5 rounded-full transition-all shadow-sm ${idx === currentIndex
                                        ? 'bg-white scale-110'
                                        : 'bg-white/40'
                                    }`}
                            />
                        ))}
                    </div>
                )}

                {/* Gradient & Content */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

                <div className="absolute bottom-0 left-0 p-6 w-full pointer-events-none">
                    <span className="text-[10px] font-bold tracking-[0.2em] text-white/70 uppercase">
                        {formattedDate}
                    </span>
                    <h2 className="font-serif text-2xl text-white mt-1 leading-tight italic line-clamp-2">
                        {item.title || 'No content'}
                    </h2>
                </div>
            </div>
        </div>
    );
};

export const MemoryFeed: React.FC<MemoryFeedProps> = ({ items, onLoadMore, hasMore, onItemClick }) => {
    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '';
        try {
            return format(parseISO(dateStr), 'MM.dd');
        } catch {
            return '';
        }
    };

    const handleItemClick = (item: MemoryItem) => {
        if (onItemClick) {
            onItemClick(item);
        }
    };

    return (
        <section className="px-6 pb-24">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-text-secondary">Memory Feed</h2>
                <div className="h-[1px] flex-1 bg-border ml-4"></div>
            </div>

            <div className="flex flex-col gap-0 w-full">
                {items.map((item) => {
                    // Check if item has images (either array or single cover)
                    const hasImages = (item.images && item.images.length > 0) || !!item.imageUrl;

                    if (item.type === 'image' && hasImages) {
                        return <MemoryImageCard key={item.id} item={item} onClick={handleItemClick} />;
                    } else {
                        // Text Entry Logic
                        const formattedDate = formatDate(item.date);
                        return (
                            <div
                                key={item.id}
                                className="flex items-baseline justify-between py-5 border-b border-dashed border-border cursor-pointer hover:bg-secondary/30 transition-colors"
                                onClick={() => handleItemClick(item)}
                            >
                                <div className="text-xs font-bold text-text-secondary w-12 shrink-0">
                                    {formattedDate}
                                </div>
                                <div className="flex-1 text-right">
                                    <h3 className="font-serif text-lg text-primary italic leading-tight">
                                        {item.quote || item.title || 'No content'}
                                    </h3>
                                </div>
                            </div>
                        );
                    }
                })}

                {hasMore && (
                    <div className="flex justify-center py-6">
                        <button
                            onClick={onLoadMore}
                            className="text-xs font-medium text-text-secondary hover:text-primary transition-colors"
                        >
                            더 보기
                        </button>
                    </div>
                )}
            </div>
        </section>
    );
};
