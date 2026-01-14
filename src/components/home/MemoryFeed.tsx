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

    const imageCount = displayImages.length;
    const remainingCount = imageCount > 4 ? imageCount - 4 : 0;

    // Single image layout (3:4 ratio)
    if (imageCount === 1) {
        return (
            <div className="py-6 w-full cursor-pointer" onClick={() => onClick(item)}>
                <div className="relative w-full aspect-[3/4] rounded-sm overflow-hidden bg-secondary group">
                    <div
                        className="w-full h-full bg-cover bg-center transition-all duration-300"
                        style={{ backgroundImage: `url('${displayImages[0]}')` }}
                    />
                    <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors" />

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
    }

    // Two images layout (1 row, 2 columns - square)
    if (imageCount === 2) {
        return (
            <div className="py-6 w-full cursor-pointer" onClick={() => onClick(item)}>
                <div className="relative w-full aspect-square rounded-sm overflow-hidden bg-secondary">
                    <div className="grid grid-cols-2 gap-1.5 h-full">
                        {displayImages.slice(0, 2).map((img, idx) => (
                            <div key={idx} className="relative overflow-hidden group">
                                <div
                                    className="w-full h-full bg-cover bg-center transition-all duration-300"
                                    style={{ backgroundImage: `url('${img}')` }}
                                />
                                <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors" />

                                {/* Content overlay only on first image */}
                                {idx === 0 && (
                                    <>
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                                        <div className="absolute bottom-0 left-0 p-4 w-full pointer-events-none">
                                            <span className="text-[9px] font-bold tracking-[0.2em] text-white/70 uppercase">
                                                {formattedDate}
                                            </span>
                                            <h2 className="font-serif text-lg text-white mt-0.5 leading-tight italic line-clamp-1">
                                                {item.title || 'No content'}
                                            </h2>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // Three images layout (2 top, 1 bottom wide)
    if (imageCount === 3) {
        return (
            <div className="py-6 w-full cursor-pointer" onClick={() => onClick(item)}>
                <div className="relative w-full rounded-sm overflow-hidden bg-secondary">
                    <div className="grid grid-rows-2 gap-1.5">
                        {/* Top row: 2 images */}
                        <div className="grid grid-cols-2 gap-1.5 aspect-[2/1]">
                            {displayImages.slice(0, 2).map((img, idx) => (
                                <div key={idx} className="relative overflow-hidden group">
                                    <div
                                        className="w-full h-full bg-cover bg-center transition-all duration-300"
                                        style={{ backgroundImage: `url('${img}')` }}
                                    />
                                    <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors" />

                                    {/* Content overlay only on first image */}
                                    {idx === 0 && (
                                        <>
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                                            <div className="absolute bottom-0 left-0 p-4 w-full pointer-events-none">
                                                <span className="text-[9px] font-bold tracking-[0.2em] text-white/70 uppercase">
                                                    {formattedDate}
                                                </span>
                                                <h2 className="font-serif text-lg text-white mt-0.5 leading-tight italic line-clamp-1">
                                                    {item.title || 'No content'}
                                                </h2>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                        {/* Bottom row: 1 wide image */}
                        <div className="relative overflow-hidden group aspect-[2/1]">
                            <div
                                className="w-full h-full bg-cover bg-center transition-all duration-300"
                                style={{ backgroundImage: `url('${displayImages[2]}')` }}
                            />
                            <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Four or more images layout (2x2 grid)
    return (
        <div className="py-6 w-full cursor-pointer" onClick={() => onClick(item)}>
            <div className="relative w-full aspect-square rounded-sm overflow-hidden bg-secondary">
                <div className="grid grid-cols-2 grid-rows-2 gap-1.5 h-full">
                    {displayImages.slice(0, 4).map((img, idx) => (
                        <div key={idx} className="relative overflow-hidden group">
                            <div
                                className="w-full h-full bg-cover bg-center transition-all duration-300"
                                style={{ backgroundImage: `url('${img}')` }}
                            />
                            <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors" />

                            {/* Content overlay only on first image */}
                            {idx === 0 && (
                                <>
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                                    <div className="absolute bottom-0 left-0 p-3 w-full pointer-events-none">
                                        <span className="text-[8px] font-bold tracking-[0.2em] text-white/70 uppercase">
                                            {formattedDate}
                                        </span>
                                        <h2 className="font-serif text-base text-white mt-0.5 leading-tight italic line-clamp-1">
                                            {item.title || 'No content'}
                                        </h2>
                                    </div>
                                </>
                            )}

                            {/* +N badge on 4th image if more images exist */}
                            {idx === 3 && remainingCount > 0 && (
                                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                                    <span className="text-3xl font-bold text-white">
                                        +{remainingCount}
                                    </span>
                                </div>
                            )}
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
