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
}

export const MemoryFeed: React.FC<MemoryFeedProps> = ({ items }) => {
    return (
        <section className="py-12">
            <div className="px-6 mb-8">
                <h3 className="text-[10px] uppercase tracking-[0.3em] font-black opacity-40">추억 피드</h3>
            </div>
            {/* FORCE flex-row and handling scrolling */}
            <div className="flex flex-row overflow-x-auto no-scrollbar snap-x snap-mandatory px-6 gap-8 w-full">
                {items.map((item) => (
                    <div key={item.id} className="snap-center shrink-0 w-[82vw] flex flex-col gap-6">
                        {item.type === 'image' ? (
                            <div
                                className="aspect-[4/5] w-full bg-neutral-100 bg-center bg-cover grayscale-img border border-neutral-100"
                                style={{ backgroundImage: `url("${item.imageUrl}")` }}
                            />
                        ) : (
                            <div className="aspect-[4/5] w-full border border-neutral-200 flex items-center justify-center p-12 text-center bg-white">
                                <p className="text-xl font-light leading-relaxed tracking-tight italic text-primary/80">
                                    "{item.quote}"
                                </p>
                            </div>
                        )}
                        <div className="flex flex-col gap-1.5">
                            <p className="text-lg font-bold tracking-tighter uppercase">{item.title}</p>
                            <p className="text-[11px] opacity-40 font-bold uppercase tracking-widest">{item.subtitle}</p>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};
