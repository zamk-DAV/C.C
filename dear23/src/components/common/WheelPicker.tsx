import React, { useRef, useEffect, useCallback } from 'react';
import { useHaptics } from '../../hooks/useHaptics';
import { animate } from 'framer-motion';

interface WheelPickerProps<T> {
    items: T[];
    value: T;
    onChange: (value: T) => void;
    formatItem?: (item: T) => string;
    itemHeight?: number;
    visibleItems?: number;
}

/**
 * iOS-style 3D wheel picker with optimized mouse wheel response.
 * Features:
 * - High-performance Wheel handling with Framer Motion (Snappy 0.15s duration)
 * - Native wheel listener with passive: false to prevent background scroll
 * - Throttled items movement (80ms) for responsive but controlled scrolling
 * - 3D perspective effect & Haptic feedback
 */
export function WheelPicker<T>({
    items,
    value,
    onChange,
    formatItem = (item) => String(item),
    itemHeight = 44,
    visibleItems = 5
}: WheelPickerProps<T>) {
    const containerRef = useRef<HTMLDivElement>(null);
    const { selection } = useHaptics();
    const currentIndex = items.indexOf(value);

    const lastScrollTime = useRef(0);
    const targetIndexRef = useRef(currentIndex);
    const isProgrammaticScroll = useRef(false);
    const animationRef = useRef<any>(null);

    // Sync targetIndexRef with external prop changes
    useEffect(() => {
        targetIndexRef.current = currentIndex;
    }, [currentIndex]);

    // Cleanup animation on unmount
    useEffect(() => {
        return () => {
            if (animationRef.current) animationRef.current.stop();
        };
    }, []);

    // Optimized Wheel Handling
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const onWheelNative = (e: WheelEvent) => {
            e.preventDefault();
            e.stopPropagation();

            const now = Date.now();
            // Reduced throttle for snappier response (80ms)
            if (now - lastScrollTime.current < 80) {
                return;
            }
            lastScrollTime.current = now;

            const delta = Math.sign(e.deltaY);
            const nextTarget = Math.max(0, Math.min(items.length - 1, targetIndexRef.current + delta));

            if (nextTarget !== targetIndexRef.current) {
                isProgrammaticScroll.current = true;
                targetIndexRef.current = nextTarget;
                onChange(items[nextTarget]);
                selection();

                // Keep the lock slightly longer than the move but shorter than before
                setTimeout(() => {
                    isProgrammaticScroll.current = false;
                }, 100);
            }
        };

        container.addEventListener('wheel', onWheelNative, { passive: false });
        return () => container.removeEventListener('wheel', onWheelNative);
    }, [items, onChange, selection]);

    // Snappy scroll to current value using Framer Motion
    useEffect(() => {
        if (containerRef.current) {
            const targetScrollTop = currentIndex * itemHeight;
            const startScrollTop = containerRef.current.scrollTop;

            if (Math.abs(startScrollTop - targetScrollTop) > 1) {
                if (animationRef.current) animationRef.current.stop();

                animationRef.current = animate(startScrollTop, targetScrollTop, {
                    type: "spring",
                    stiffness: 400,
                    damping: 35,
                    mass: 0.8,
                    onUpdate: (latest) => {
                        if (containerRef.current) {
                            containerRef.current.scrollTop = latest;
                        }
                    },
                    onComplete: () => {
                        animationRef.current = null;
                    }
                });
            }
        }
    }, [currentIndex, itemHeight]);

    // Handle touch scroll snap (for momentum/touch only)
    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        if (isProgrammaticScroll.current) return;

        const target = e.target as HTMLDivElement;
        const scrollTop = target.scrollTop;
        const newIndex = Math.round(scrollTop / itemHeight);

        if (newIndex >= 0 && newIndex < items.length && items[newIndex] !== value) {
            onChange(items[newIndex]);
            selection();
        }
    }, [items, itemHeight, value, onChange, selection]);

    // Click to select item
    const handleItemClick = (item: T) => {
        if (item !== value) {
            isProgrammaticScroll.current = true;
            onChange(item);
            selection();

            setTimeout(() => {
                isProgrammaticScroll.current = false;
            }, 100);
        }
    };

    const containerHeight = itemHeight * visibleItems;
    const paddingY = (containerHeight - itemHeight) / 2;

    return (
        <div className="relative" style={{ height: containerHeight }}>
            {/* Selection indicator */}
            <div
                className="absolute left-2 right-2 top-1/2 -translate-y-1/2 rounded-xl bg-primary/10 pointer-events-none z-10"
                style={{ height: itemHeight }}
            />

            {/* Gradient overlays for 3D effect */}
            <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-background-secondary to-transparent pointer-events-none z-20" />
            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-background-secondary to-transparent pointer-events-none z-20" />

            {/* Scrollable container */}
            <div
                ref={containerRef}
                className="h-full overflow-y-auto no-scrollbar snap-y snap-mandatory overscroll-none"
                onScroll={handleScroll}
                style={{
                    paddingTop: paddingY,
                    paddingBottom: paddingY,
                    scrollSnapType: 'y mandatory'
                }}
            >
                {items.map((item, index) => {
                    const offset = index - currentIndex;
                    const isSelected = item === value;

                    // 3D rotation and opacity based on distance from center
                    const rotateX = offset * 20;
                    const opacity = Math.max(0.3, 1 - Math.abs(offset) * 0.25);
                    const scale = Math.max(0.85, 1 - Math.abs(offset) * 0.08);

                    return (
                        <div
                            key={String(item)}
                            className="flex items-center justify-center snap-center transition-all duration-150 cursor-pointer"
                            style={{
                                height: itemHeight,
                                transform: `perspective(200px) rotateX(${rotateX}deg) scale(${scale})`,
                                opacity,
                                scrollSnapAlign: 'center'
                            }}
                            onClick={() => handleItemClick(item)}
                        >
                            <span
                                className={`text-[20px] font-semibold transition-colors ${isSelected ? 'text-primary' : 'text-text-secondary/60'
                                    }`}
                            >
                                {formatItem(item)}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
