import React, { useRef, useEffect, useCallback } from 'react';
import { useHaptics } from '../../hooks/useHaptics';

interface WheelPickerProps<T> {
    items: T[];
    value: T;
    onChange: (value: T) => void;
    formatItem?: (item: T) => string;
    itemHeight?: number;
    visibleItems?: number;
}

/**
 * iOS-style 3D wheel picker with mouse wheel and touch scroll support.
 * Features:
 * - Mouse wheel scrolling on desktop (throttled to 1 item per scroll)
 * - Touch scroll with momentum on mobile
 * - 3D perspective effect
 * - Haptic feedback on value change
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

    // Scroll to current value on mount and value change
    useEffect(() => {
        if (containerRef.current) {
            const scrollTop = currentIndex * itemHeight;
            containerRef.current.scrollTo({
                top: scrollTop,
                behavior: 'smooth'
            });
        }
    }, [currentIndex, itemHeight]);

    // Handle mouse wheel with throttling - only 1 item per 150ms
    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const now = Date.now();
        if (now - lastScrollTime.current < 150) {
            return; // Throttle: ignore if within 150ms of last scroll
        }
        lastScrollTime.current = now;

        const delta = Math.sign(e.deltaY);
        const newIndex = currentIndex + delta;

        if (newIndex >= 0 && newIndex < items.length) {
            onChange(items[newIndex]);
            selection();
        }
    }, [currentIndex, items, onChange, selection]);

    // Handle touch scroll snap
    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
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
            onChange(item);
            selection();
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
                onWheel={handleWheel}
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
