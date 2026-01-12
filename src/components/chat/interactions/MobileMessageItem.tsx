import React, { useRef, useState } from 'react';
import { motion, PanInfo, useAnimation } from 'framer-motion';
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
    const [isDragging, setIsDragging] = useState(false);

    // Double tap detection
    const lastTap = useRef<number>(0);
    const DOUBLE_TAP_DELAY = 300;

    const handleTap = () => {
        const now = Date.now();
        if (now - lastTap.current < DOUBLE_TAP_DELAY) {
            // Double tap detected
            success();
            onReaction?.();
            lastTap.current = 0;
        } else {
            lastTap.current = now;
        }
    };

    // Drag logic for Swipe to Reply
    const handleDragEnd = async (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        setIsDragging(false);
        const threshold = 50; // px to trigger reply

        const dragDistance = isMine ? -info.offset.x : info.offset.x;

        if (dragDistance > threshold) {
            heavy(); // Vibration feedback
            onReply?.();
        }

        // Reset position
        controls.start({ x: 0 });
    };

    return (
        <motion.div
            className="relative touch-manipulation"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={{ left: isMine ? 0.5 : 0.05, right: isMine ? 0.05 : 0.5 }}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={handleDragEnd}
            animate={controls}
            onTap={handleTap}
            onLongPress={() => {
                if (!isDragging) {
                    heavy();
                    onLongPress?.();
                }
            }}
            style={{ touchAction: 'pan-y' }} // Allow vertical scroll, handle horizontal in JS
        >
            {/* Visual Indicator for Reply (Icon appearing behind) could be added here */}
            {children}
        </motion.div>
    );
};
