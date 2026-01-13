import React from 'react';
import { motion, useAnimation } from 'framer-motion';
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
    // isMine, // Unused
    onReply,
    onReaction,
    onLongPress,
}) => {
    const controls = useAnimation();
    const { heavy, success } = useHaptics();

    // Cast handlers to any because onDoubleTap is not standard in some useGesture types or custom config
    const bind = useGesture(
        {
            onDoubleTap: () => {
                success();
                onReaction?.();
            },
            onLongPress: ({ cancel }: any) => {
                heavy();
                onLongPress?.();
                cancel();
            },
            onDrag: ({ active, movement: [mx], cancel }: any) => {
                const isSwipeLeft = mx < 0;
                if (!isSwipeLeft && active) {
                    cancel();
                    return;
                }
                if (active) {
                    controls.set({ x: mx * 0.5 });
                } else {
                    if (mx < -50) {
                        heavy();
                        onReply?.();
                    }
                    controls.start({ x: 0, transition: { type: 'spring', stiffness: 400, damping: 25 } });
                }
            },
        } as any,
        {
            drag: {
                axis: 'x',
                filterTaps: true,
                from: () => [0, 0],
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
