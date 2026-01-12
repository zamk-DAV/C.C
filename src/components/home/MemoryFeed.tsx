import React from 'react';
import { format, parseISO } from 'date-fns';
import type { MemoryItem } from '../../types';

export interface MemoryFeedProps {
    items: MemoryItem[];
    onLoadMore?: () => void;
    hasMore?: boolean;
}

export const MemoryFeed: React.FC<MemoryFeedProps> = ({ items, onLoadMore, hasMore }) => {
    // Helper to format date as MM.DD
    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '';
        try {
            const d = parseISO(dateStr);
            return format(d, 'MM.dd');
        } catch {
            return '';
        }
    };

    return (
        <section className="px-6 pb-24">
            {/* Feed Header */}
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-text-secondary">Memory Feed</h2>
                <div className="h-[1px] flex-1 bg-border ml-4"></div>
            </div>

            <div className="flex flex-col gap-0 w-full">
                {items.map((item) => {
                    const formattedDate = formatDate(item.date);

                    // Determine if we show a visual card
                    const hasImages = (item.images && item.images.length > 0) || !!item.imageUrl;
                    const displayImages = item.images && item.images.length > 0 ? item.images : (item.imageUrl ? [item.imageUrl] : []);

                    if (item.type === 'image' && hasImages) {
                        // Visual Entry Card (Full Width with Grayscale)
                        return (
                            <div key={item.id} className="py-6 w-full cursor-pointer">
                                <div className="relative w-full aspect-[3/4] rounded-sm overflow-hidden bg-secondary group">
                                    {/* Image with Grayscale Filter */}
                                    <div
                                        className="absolute inset-0 bg-cover bg-center grayscale transition-all duration-300 group-hover:grayscale-0"
                                        style={{ backgroundImage: `url('${displayImages[0]}')` }}
                                    />

                                    {/* Gradient Overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                                    {/* Content Overlay */}
                                    <div className="absolute bottom-0 left-0 p-6 w-full">
                                        <span className="text-[10px] font-bold tracking-[0.2em] text-white/70 uppercase">
                                            {formattedDate}
                                        </span>
                                        <h2 className="font-serif text-2xl text-white mt-1 leading-tight italic line-clamp-2">
                                            {item.title || 'No content'}
                                        </h2>

                                        {/* Optional: Like & Comment counts */}
                                        {/* <div className="flex items-center gap-4 mt-4 opacity-80">
                                            <div className="flex items-center gap-1">
                                                <span className="material-symbols-outlined text-[16px] text-white">favorite</span>
                                                <span className="text-[10px] text-white">0</span>
                                            </div>
                                        </div> */}
                                    </div>
                                </div>
                            </div>
                        );
                    } else {
                        // Text Entry Item (Date left, Title right with italic)
                        return (
                            <div
                                key={item.id}
                                className="flex items-baseline justify-between py-5 border-b border-dashed border-border cursor-pointer hover:bg-secondary/30 transition-colors"
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
