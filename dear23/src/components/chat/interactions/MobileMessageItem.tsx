import React, { useRef } from 'react';
import { type PanInfo, motion, useAnimation } from 'framer-motion';
import { useGesture } from '@use-gesture/react';
import { useHaptics } from '../../../hooks/useHaptics';

interface MobileMessageItemProps {
    children: React.ReactNode;
    isMine: boolean;
    onReply?: () => void;
    onReaction?: () => void;
    onLongPress?: () => void;
}

export const MobileMessageItem: React.FC<MobileMessageItemProps> = ({
    children,
    isMine,
    onReply,
    onReaction,
    onLongPress,
}) => {
    const controls = useAnimation();
    const { heavy, success } = useHaptics();

    const bind = useGesture(
        {
            onDoubleTap: () => {
                success();
                onReaction?.();
            },
            onLongPress: ({ cancel }) => {
                heavy();
                onLongPress?.();
                cancel(); // Prevent drag from starting after long press
            },
            onDrag: ({ active, movement: [mx], cancel }) => {
                // Only allow swiping left (negative x) for reply, similar to KakaoTalk
                const isSwipeLeft = mx < 0;

                if (!isSwipeLeft && active) {
                    cancel();
                    return;
                }

                if (active) {
                    // Apply resistance to the drag
                    controls.set({ x: mx * 0.5 });
                } else {
                    // Trigger reply if swiped far enough
                    if (mx < -50) {
                        heavy();
                        onReply?.();
                    }
                    // Reset position
                    controls.start({ x: 0, transition: { type: 'spring', stiffness: 400, damping: 25 } });
                }
            },
        },
        {
            drag: {
                axis: 'x',
                filterTaps: true,
                from: () => [0, 0], // Start from 0
            },
        }
    );

    return (
        <motion.div
            className="relative touch-manipulation"
            {...bind() as any}
            animate={controls}
            style={{ touchAction: 'pan-y' }} // Allow vertical scroll, handle horizontal in JS
        >
            {children}
        </motion.div>
    );
};
