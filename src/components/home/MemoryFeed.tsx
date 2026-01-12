import React from 'react';

interface MemoryItem {
    id: string;
    type: 'image' | 'quote';
    imageUrl?: string;
    quote?: string;
    title: string;
    subtitle: string;
    date?: string;
    images?: string[];
}

interface MemoryFeedProps {
    items: MemoryItem[];
    onLoadMore?: () => void;
    hasMore?: boolean;
}

export const MemoryFeed: React.FC<MemoryFeedProps> = ({ items, onLoadMore, hasMore }) => {
    // Helper to format date as MM.DD
    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
    };

    return (
        <section className="px-6 pb-24">
            {/* Spacer */}
            <div className="h-6"></div>

            <div className="flex flex-col gap-0 w-full">
                {items.map((item, index) => {
                    const formattedDate = formatDate(item.date);
                    const isEven = index % 2 === 0;

                    // Determine if we show a visual card
                    const hasImages = (item.images && item.images.length > 0) || !!item.imageUrl;
                    const displayImages = item.images && item.images.length > 0 ? item.images : (item.imageUrl ? [item.imageUrl] : []);

                    if (item.type === 'image' && hasImages) {
                        // Visual Entry Card (Full Width)
                        return (
                            <div key={item.id} className="py-8 w-full cursor-pointer hover:opacity-95 transition-opacity">
                                <div className="relative w-full aspect-[4/5] rounded-2xl overflow-hidden shadow-sm group">
                                    {/* Image Carousel / Single Image */}
                                    <div className="absolute inset-0 flex overflow-x-auto snap-x snap-mandatory scrollbar-hide z-0">
                                        {displayImages.map((img, idx) => (
                                            <div key={idx} className="flex-shrink-0 w-full h-full snap-center relative">
                                                <div
                                                    className="w-full h-full bg-cover bg-center transition-all duration-300 grayscale group-hover:grayscale-0"
                                                    style={{ backgroundImage: `url('${img}')` }}
                                                />
                                            </div>
                                        ))}
                                    </div>

                                    {/* Overlay Gradient */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none z-10"></div>

                                    {/* Content Overlay */}
                                    <div className="absolute bottom-0 left-0 w-full p-6 text-white flex flex-col items-start pointer-events-none z-20">
                                        <div className="text-xs font-bold tracking-widest mb-2 opacity-80 font-display">{formattedDate}</div>
                                        <h2 className="font-serif text-2xl font-normal leading-snug mb-4 line-clamp-2">{item.title}</h2>
                                    </div>
                                </div>
                            </div>
                        );
                    } else {
                        // Text Entry Item
                        return (
                            <div key={item.id} className="group flex items-baseline justify-between py-5 border-b border-dashed border-gray-200 dark:border-gray-800 cursor-pointer hover:bg-surface-light dark:hover:bg-surface-dark/10 transition-colors px-2 -mx-2 rounded-lg">
                                <div className="text-sm font-bold text-text-main dark:text-white w-16 shrink-0 font-display">{formattedDate}</div>
                                <div className="flex flex-col items-end flex-1 gap-1">
                                    <h3 className={`font-serif text-xl text-text-main dark:text-white leading-tight ${isEven ? 'text-right' : 'text-left'}`}>
                                        {item.quote || item.title}
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
                            className="text-xs font-medium text-gray-400 hover:text-black dark:hover:text-white transition-colors"
                        >
                            더 보기
                        </button>
                    </div>
                )}
            </div>
        </section>
    );
};
