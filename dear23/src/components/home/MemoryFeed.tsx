import React from 'react';

import { NotionItem } from '../../lib/notion';

interface MemoryFeedProps {
    items: NotionItem[];
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
                        {item.coverImage ? (
                            <div
                                className="aspect-[4/5] w-full bg-neutral-100 bg-center bg-cover grayscale-img border border-neutral-100 rounded-3xl overflow-hidden"
                                style={{ backgroundImage: `url("${item.coverImage}")` }}
                            />
                        ) : (
                            <div className="aspect-[4/5] w-full border border-border flex items-center justify-center p-12 text-center bg-secondary/10 rounded-3xl">
                                <p className="text-xl font-light leading-relaxed tracking-tight italic text-primary/80">
                                    "{item.previewText || item.title}"
                                </p>
                            </div>
                        )}
                        <div className="flex flex-col gap-1.5">
                            <p className="text-lg font-bold tracking-tighter uppercase text-primary">{item.title}</p>
                            <p className="text-[11px] opacity-40 font-bold uppercase tracking-widest text-primary">{item.date}</p>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};
