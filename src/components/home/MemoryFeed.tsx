import React from 'react';

interface MemoryItem {
    id: string;
    type: 'image' | 'quote';
    imageUrl?: string;
    quote?: string;
    title: string;
    subtitle: string;
}

interface MemoryFeedProps {
    items: MemoryItem[];
    onLoadMore?: () => void;
    hasMore?: boolean;
}

export const MemoryFeed: React.FC<MemoryFeedProps> = ({ items, onLoadMore, hasMore }) => {
    return (
        <section className="py-12">
            <div className="px-6 mb-8">
                <h3 className="text-[10px] uppercase tracking-[0.3em] font-black text-text-secondary/60">추억 피드</h3>
            </div>
            {/* FORCE flex-row and handling scrolling */}
            <div className="flex flex-row overflow-x-auto no-scrollbar snap-x snap-mandatory px-6 gap-8 w-full">
                {items.map((item) => (
                    <div key={item.id} className="snap-center shrink-0 w-[82vw] flex flex-col gap-6">
                        {item.type === 'image' ? (
                            <div
                                className="aspect-[4/5] w-full bg-secondary bg-center bg-cover grayscale-img border border-border rounded-xl"
                                style={{ backgroundImage: `url("${item.imageUrl}")` }}
                            />
                        ) : (
                            <div className="aspect-[4/5] w-full border border-border flex items-center justify-center p-12 text-center bg-background rounded-xl">
                                <p className="text-xl font-light leading-relaxed tracking-tight italic text-primary/80 font-serif">
                                    "{item.quote}"
                                </p>
                            </div>
                        )}
                        <div className="flex flex-col gap-1.5 px-1">
                            <p className="text-lg font-bold tracking-tighter uppercase text-primary">{item.title}</p>
                            <p className="text-[11px] text-text-secondary font-bold uppercase tracking-widest">{item.subtitle}</p>
                        </div>
                    </div>
                ))}

                {hasMore && (
                    <div className="snap-center shrink-0 w-[40vw] flex items-center justify-center">
                        <button
                            onClick={onLoadMore}
                            className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 active:scale-95 transition-all"
                        >
                            <span className="material-symbols-outlined text-text-secondary">arrow_forward</span>
                        </button>
                    </div>
                )}
            </div>
        </section>
    );
};
