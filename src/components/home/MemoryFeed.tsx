import React from 'react';

interface MemoryItem {
    id: string;
    type: 'image' | 'quote';
    imageUrl?: string;
    quote?: string;
    title: string;
    subtitle: string;
    date?: string;
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

                    if (item.type === 'image' && item.imageUrl) {
                        // Visual Entry Card (Full Width)
                        return (
                            <div key={item.id} className="py-8 w-full cursor-pointer hover:opacity-95 transition-opacity">
                                <div className="relative w-full aspect-[4/5] rounded-2xl overflow-hidden shadow-sm group">
                                    <div
                                        className="absolute inset-0 bg-cover bg-center bw-filter transition-all duration-300 group-hover:grayscale-0"
                                        style={{ backgroundImage: `url('${item.imageUrl}')` }}
                                    />
                                    {/* Overlay Gradient */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none"></div>

                                    {/* Content Overlay */}
                                    <div className="absolute bottom-0 left-0 w-full p-6 text-white flex flex-col items-start pointer-events-none">
                                        <div className="text-xs font-bold tracking-widest mb-2 opacity-80">{formattedDate}</div>
                                        <h2 className="font-serif text-2xl font-normal leading-snug mb-4 line-clamp-2">{item.title}</h2>

                                        <div className="flex items-center gap-4 text-white/80">
                                            <div className="flex items-center gap-1">
                                                <span className="material-symbols-outlined filled text-[18px]">favorite</span>
                                                <span className="text-xs font-medium">--</span>
                                            </div>
                                            {/* <div className="flex items-center gap-1">
                                                <span className="material-symbols-outlined text-[18px]">chat_bubble</span>
                                                <span className="text-xs font-medium">--</span>
                                            </div> */}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    } else {
                        // Text Entry Item
                        return (
                            <div key={item.id} className="group flex items-baseline justify-between py-5 border-b border-dashed border-gray-200 dark:border-gray-800 cursor-pointer hover:bg-surface-light/50 dark:hover:bg-surface-dark/50 transition-colors px-2 -mx-2 rounded-lg">
                                <div className="text-sm font-bold text-text-main dark:text-white w-14 shrink-0 font-display">{formattedDate}</div>
                                <div className="flex flex-col items-end flex-1 gap-1">
                                    <h3 className={`font-serif text-lg text-text-main dark:text-white leading-tight ${isEven ? 'text-right' : 'text-left'}`}>
                                        {item.quote || item.title}
                                    </h3>
                                    <div className="flex items-center gap-3 mt-1 opacity-100 transition-opacity">
                                        {/* Always visible for now, or group-hover:opacity-100 */}
                                        <button className="text-text-muted hover:text-primary transition-colors">
                                            <span className="material-symbols-outlined text-[14px]">favorite_border</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    }
                })}

                {hasMore && (
                    <div className="py-8 flex justify-center">
                        <button
                            onClick={onLoadMore}
                            className="bg-primary text-background px-6 py-2 rounded-full text-sm font-bold shadow-lg hover:opacity-90 transition-all"
                        >
                            Load More
                        </button>
                    </div>
                )}
            </div>
        </section>
    );
};
