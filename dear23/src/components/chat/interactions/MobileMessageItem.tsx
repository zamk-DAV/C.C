import React, { useRef, useState } from 'react';
import { motion, useAnimation, useMotionValue, useTransform } from 'framer-motion';
import { useDrag } from '@use-gesture/react';
import { useHaptics } from '../../../hooks/useHaptics';
import { CornerUpLeft } from 'lucide-react';

interface MobileMessageItemProps {
    children: React.ReactNode;
    isMine: boolean;
    onReply?: () => void;
    onReaction?: () => void;
    onLongPress?: (e: React.TouchEvent | React.MouseEvent) => void;
}

export const MobileMessageItem: React.FC<MobileMessageItemProps> = ({
    children,
    isMine,
    onReply,
    onReaction,
    onLongPress,
}) => {
    const controls = useAnimation();
    const { heavy, light, success } = useHaptics();
    const [isDragging, setIsDragging] = useState(false);
    const hasTriggeredHaptic = useRef(false);

    // Long press detection via touch events
    const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const touchStartPos = useRef<{ x: number; y: number } | null>(null);
    const LONG_PRESS_DURATION = 500; // ms
    const MOVE_THRESHOLD = 10; // px - if moved more, cancel long press

    // Motion values for real-time visual feedback
    const x = useMotionValue(0);
    const replyIconOpacity = useTransform(x, isMine ? [0, -60] : [0, 60], [0, 1]);
    const replyIconScale = useTransform(x, isMine ? [0, -60] : [0, 60], [0.5, 1.2]);
    const replyIconRotate = useTransform(x, isMine ? [0, -60] : [0, 60], isMine ? [20, 0] : [-20, 0]);

    // Double tap detection
    const lastTap = useRef<number>(0);
    const DOUBLE_TAP_DELAY = 300;

    const SWIPE_THRESHOLD = 100;

    // @use-gesture/react - useDrag configuration
    const bind = useDrag(
        ({ down, movement: [mx], last }) => {
            const dragDistance = isMine ? -mx : mx;

            if (down) {
                setIsDragging(true);
                // Clamp movement: Only allow swipe in the intended direction
                // isMine: Only allow negative mx (left swipe), !isMine: Only allow positive mx (right swipe)
                const clampedX = isMine
                    ? Math.min(0, Math.max(mx, -100))
                    : Math.max(0, Math.min(mx, 100));
                x.set(clampedX);

                // Haptic feedback when threshold reached
                if (dragDistance > SWIPE_THRESHOLD && !hasTriggeredHaptic.current) {
                    light();
                    hasTriggeredHaptic.current = true;
                } else if (dragDistance <= SWIPE_THRESHOLD) {
                    hasTriggeredHaptic.current = false;
                }
            }

            if (last) {
                setIsDragging(false);
                hasTriggeredHaptic.current = false;

                if (dragDistance > SWIPE_THRESHOLD) {
                    heavy();
                    onReply?.();
                }

                // Animate back to origin
                controls.start({ x: 0, transition: { type: 'spring', stiffness: 500, damping: 30 } });
                x.set(0);
            }
        },
        {
            axis: 'x',
            threshold: 10, // 10px threshold helps distinguish between deliberate swipe and slight horizontal movement during scroll
            filterTaps: true,
            from: () => [x.get(), 0],
            pointer: { touch: true },
            eventOptions: { passive: true }, // Crucial for allowing native scroll to continue
        }
    );

    const handleTap = () => {
        if (isDragging) return;
        const now = Date.now();
        if (now - lastTap.current < DOUBLE_TAP_DELAY) {
            success();
            onReaction?.();
            lastTap.current = 0;
        } else {
            lastTap.current = now;
        }
    };

    // Touch handlers for long press
    const handleTouchStart = (e: React.TouchEvent) => {
        const touch = e.touches[0];
        touchStartPos.current = { x: touch.clientX, y: touch.clientY };

        longPressTimer.current = setTimeout(() => {
            if (!isDragging && touchStartPos.current) {
                heavy();
                onLongPress?.(e);
            }
        }, LONG_PRESS_DURATION);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!touchStartPos.current || !longPressTimer.current) return;
        const touch = e.touches[0];
        const dx = Math.abs(touch.clientX - touchStartPos.current.x);
        const dy = Math.abs(touch.clientY - touchStartPos.current.y);

        if (dx > MOVE_THRESHOLD || dy > MOVE_THRESHOLD) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    };

    const handleTouchEnd = () => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
        touchStartPos.current = null;
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
    };

    return (
        <div
            className="relative group touch-pan-y active:z-50"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
            onContextMenu={handleContextMenu}
        >
            {/* Reply Icon Overlay (Behind) */}
            <div className={`absolute inset-y-0 flex items-center px-4 ${isMine ? 'right-0 justify-end' : 'left-0 justify-start'}`}>
                <motion.div
                    style={{
                        opacity: replyIconOpacity,
                        scale: replyIconScale,
                        rotate: replyIconRotate,
                        x: useTransform(x, isMine ? [0, -100] : [0, 100], isMine ? [20, 0] : [-20, 0])
                    }}
                    className="flex items-center justify-center size-8 rounded-full bg-primary/10 text-primary"
                >
                    <CornerUpLeft className="size-5" />
                </motion.div>
            </div>

            <motion.div
                {...(bind() as any)}
                className="relative z-10 touch-pan-y"
                animate={controls}
                onClick={handleTap}
                style={{ x }}
            >
                {children}
            </motion.div>
        </div>
    );
};
