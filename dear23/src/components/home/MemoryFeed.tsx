import React, { useState } from 'react';
import { cn } from '../../lib/utils';
import { type MemoryEntry } from '../../lib/firebase/services';

interface MemoryFeedProps {
    items: (MemoryEntry & { id: string })[];
}

const FeedCard: React.FC<{ item: MemoryEntry & { id: string } }> = ({ item }) => {
    const [imageIndex, setImageIndex] = useState(0);
    const [imgError, setImgError] = useState(false);

    const hasMultipleImages = item.images && item.images.length > 1;
    const displayImages = item.images || [];

    const currentImage = displayImages[imageIndex];

    console.log(`[Dear23 Debug] FeedCard rendering. ID: ${item.id}, ImageIndex: ${imageIndex}`);
    console.log(`[Dear23 Debug] currentImage value:`, currentImage);
    console.log(`[Dear23 Debug] hasMultipleImages: ${hasMultipleImages}, displayImages length: ${displayImages.length}`);

    const handleNext = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (displayImages.length > 0) {
            setImageIndex((prev) => (prev + 1) % displayImages.length);
            setImgError(false);
        }
    };

    const handlePrev = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (displayImages.length > 0) {
            setImageIndex((prev) => (prev - 1 + displayImages.length) % displayImages.length);
            setImgError(false);
        }
    };

    return (
        <div className="snap-center shrink-0 w-[82vw] flex flex-col gap-6 group">
            <div className="relative aspect-[4/5] w-full rounded-3xl overflow-hidden border border-neutral-100 bg-neutral-100">
                {currentImage && !imgError ? (
                    <img
                        src={currentImage}
                        alt="Memory"
                        className="w-full h-full object-cover transition-all duration-300"
                        onLoad={() => console.log("Image loaded successfully:", currentImage)}
                        onError={(e) => {
                            console.error("Image load error for URL:", currentImage);
                            console.error("Error event:", e);
                            setImgError(true);
                        }}
                    />
                ) : (
                    <div className="w-full h-full border border-border flex items-center justify-center p-12 text-center bg-secondary/10">
                        <p className="text-xl font-light leading-relaxed tracking-tight italic text-primary/80">
                            "{item.content}"
                        </p>
                    </div>
                )}

                {/* Debug Overlay */}
                <div className="absolute top-0 left-0 w-full bg-black/70 text-green-400 text-[10px] p-2 break-all z-50 font-mono pointer-events-none">
                    DEBUG URL: {currentImage || 'UNDEFINED'}
                    <br />
                    Status: {imgError ? 'ERROR' : 'LOADING/OK'}
                </div>

                {/* Navigation Buttons for Multiple Images */}
                {hasMultipleImages && (
                    <>
                        {/* Prev Button */}
                        <button
                            onClick={handlePrev}
                            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm z-10 hover:bg-black/70"
                        >
                            <span className="material-symbols-outlined text-xl">chevron_left</span>
                        </button>

                        {/* Next Button */}
                        <button
                            onClick={handleNext}
                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm z-10 hover:bg-black/70"
                        >
                            <span className="material-symbols-outlined text-xl">chevron_right</span>
                        </button>

                        {/* Pagination Dots */}
                        <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-10">
                            {displayImages.map((_, idx) => (
                                <div
                                    key={idx}
                                    className={cn(
                                        "w-1.5 h-1.5 rounded-full shadow-sm transition-colors",
                                        idx === imageIndex ? "bg-white" : "bg-white/40"
                                    )}
                                />
                            ))}
                        </div>
                    </>
                )}
            </div>

            <div className="flex flex-col gap-1.5">
                <p className="text-lg font-bold tracking-tighter uppercase text-primary line-clamp-1">{item.content}</p>
                <div className="flex items-center justify-between">
                    <p className="text-[11px] opacity-40 font-bold uppercase tracking-widest text-primary">{item.date}</p>
                    {hasMultipleImages && (
                        <p className="text-[10px] text-primary/40 font-bold">
                            {imageIndex + 1} / {displayImages.length}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export const MemoryFeed: React.FC<MemoryFeedProps> = ({ items }) => {
    console.log(`[Dear23 Debug] MemoryFeed mounted. Received items count: ${items.length}`);
    return (
        <section className="py-12">
            <div className="px-6 mb-8">
                <h3 className="text-[10px] uppercase tracking-[0.3em] font-black opacity-40">추억 피드</h3>
            </div>
            {/* FORCE flex-row and handling scrolling */}
            <div className="flex flex-row overflow-x-auto no-scrollbar snap-x snap-mandatory px-6 gap-8 w-full">
                {items.map((item) => (
                    <FeedCard key={item.id} item={item} />
                ))}
            </div>
        </section>
    );
};
