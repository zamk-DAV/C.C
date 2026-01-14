import React, { useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import type { MemoryItem } from '../../types';

export interface MemoryFeedProps {
    items: MemoryItem[];
    onLoadMore?: () => void;
    hasMore?: boolean;
    onItemClick?: (item: MemoryItem) => void;
}

const MemoryImageCard = ({ item, onClick }: { item: MemoryItem, onClick: (item: MemoryItem) => void }) => {
    // Filter valid images. Fallback to imageUrl if images array is empty.
    const displayImages = item.images && item.images.length > 0
        ? item.images.filter(img => img && typeof img === 'string')
        : (item.imageUrl ? [item.imageUrl] : []);

    // Helper to extract date
    const formattedDate = item.date ? (() => {
        try {
            return format(parseISO(item.date), 'MM.dd');
        } catch {
            return '';
        }
    })() : '';

    const imageCount = displayImages.length;
    const remainingCount = imageCount > 3 ? imageCount - 3 : 0;

    // Common Text Overlay
    const TextOverlay = () => (
        <div className="absolute top-0 right-0 p-3 z-10">
            <span className="bg-black/40 backdrop-blur-sm text-[10px] font-bold text-white px-2 py-1 rounded-full">{formattedDate}</span>
        </div>
    );

    // Single image - Full width
    if (imageCount === 1) {
        return (
            <div className="py-2 w-full cursor-pointer animate-in fade-in duration-500" onClick={() => onClick(item)}>
                <div className="relative w-full rounded-2xl overflow-hidden bg-secondary shadow-sm hover:shadow-md transition-all">
                    <img
                        src={displayImages[0]}
                        alt={item.title || 'Memory'}
                        className="w-full h-auto object-cover max-h-[500px]"
                        loading="lazy"
                    />
                    <TextOverlay />
                    {item.title && (
                        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
                            <p className="text-white font-medium text-sm line-clamp-1">{item.title}</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Multiple images - Main + Thumbnails (Instagram style gallery hint)
    return (
        <div className="py-2 w-full cursor-pointer animate-in fade-in duration-500" onClick={() => onClick(item)}>
            <div className="relative rounded-2xl overflow-hidden bg-secondary shadow-sm hover:shadow-md transition-all">
                {/* Main Large Image */}
                <div className="w-full aspect-[4/3] relative">
                    <img
                        src={displayImages[0]}
                        alt="Main memory"
                        className="w-full h-full object-cover"
                        loading="lazy"
                    />
                    <TextOverlay />
                </div>

                {/* Thumbnails Row */}
                <div className="grid grid-cols-3 gap-0.5 mt-0.5 h-24">
                    {displayImages.slice(1, 3).map((img, idx) => (
                        <div key={idx} className="relative w-full h-full">
                            <img
                                src={img}
                                alt={`Memory ${idx + 2}`}
                                className="w-full h-full object-cover"
                                loading="lazy"
                            />
                        </div>
                    ))}
                    {/* More indicator or 3rd image */}
                    {imageCount >= 4 ? (
                        <div className="relative w-full h-full">
                            <img
                                src={displayImages[3]}
                                alt="More"
                                className="w-full h-full object-cover"
                                loading="lazy"
                            />
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                <span className="text-white font-bold text-lg">+{remainingCount}</span>
                            </div>
                        </div>
                    ) : (displayImages[3] && (
                        <div className="relative w-full h-full">
                            <img
                                src={displayImages[3]}
                                alt="Memory 4"
                                className="w-full h-full object-cover"
                                loading="lazy"
                            />
                        </div>
                    ))}
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

    // Preload Images (Item 3)
    useEffect(() => {
        if (!items.length) return;

        // Preload first 10 images or so
        const imagesToPreload = items
            .slice(0, 10)
            .flatMap(item => {
                if (item.images && item.images.length > 0) return item.images;
                if (item.imageUrl) return [item.imageUrl];
                return [];
            });

        imagesToPreload.forEach(url => {
            const img = new Image();
            img.src = url;
        });
    }, [items]);

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
                        // Text Entry Logic - Clean Note Card
                        const formattedDate = formatDate(item.date);
                        return (
                            <div
                                key={item.id}
                                className="py-2 w-full animate-in fade-in duration-500 cursor-pointer group"
                                onClick={() => handleItemClick(item)}
                            >
                                <div className="bg-secondary/20 p-5 rounded-2xl border border-border/40 hover:border-primary/20 transition-all hover:bg-secondary/40 relative overflow-hidden">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">{formattedDate}</span>
                                        <span className="material-symbols-outlined text-text-secondary/30 text-[16px]">format_quote</span>
                                    </div>
                                    <h3 className="font-medium text-lg text-primary leading-relaxed line-clamp-3">
                                        {item.quote || item.title || '기록 없음'}
                                    </h3>
                                    {/* Decorative corner */}
                                    <div className="absolute -bottom-4 -right-4 w-12 h-12 bg-primary/5 rounded-full blur-xl group-hover:bg-primary/10 transition-colors"></div>
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
