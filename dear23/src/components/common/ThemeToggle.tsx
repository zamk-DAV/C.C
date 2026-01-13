import React from 'react';
import { motion } from 'framer-motion';
import { useHaptics } from '../../hooks/useHaptics';

interface ThemeToggleProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
    label?: string;
    icon?: React.ReactNode;
}

/**
 * A premium iOS-style toggle switch component with animations.
 * Features:
 * - Smooth spring animations
 * - Scale effect on interaction
 * - Uses theme accent color for "on" state
 * - Haptic feedback
 */
export const ThemeToggle: React.FC<ThemeToggleProps> = ({
    checked,
    onChange,
    disabled = false,
    label,
    icon
}) => {
    const { simpleClick } = useHaptics();

    const handleToggle = () => {
        if (disabled) return;
        simpleClick();
        onChange(!checked);
    };

    return (
        <div className="flex items-center justify-between w-full">
            {(icon || label) && (
                <div className="flex items-center gap-3">
                    {icon}
                    {label && <span className="text-[16px] text-primary">{label}</span>}
                </div>
            )}
            <motion.button
                type="button"
                role="switch"
                aria-checked={checked}
                disabled={disabled}
                onClick={handleToggle}
                whileTap={{ scale: 0.95 }}
                className={`
                    relative w-[51px] h-[31px] rounded-full p-[2px] 
                    transition-colors duration-300 ease-out
                    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    ${checked ? 'bg-accent' : 'bg-border/40'}
                `}
                style={{
                    boxShadow: checked
                        ? 'inset 0 0 0 1px var(--accent-color)'
                        : 'inset 0 0 0 1px rgba(0, 0, 0, 0.08)'
                }}
            >
                <motion.div
                    layout
                    transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 30
                    }}
                    className="w-[27px] h-[27px] bg-white rounded-full"
                    style={{
                        marginLeft: checked ? '20px' : '0px',
                        boxShadow: '0 3px 8px rgba(0, 0, 0, 0.15), 0 1px 1px rgba(0, 0, 0, 0.06)'
                    }}
                />
            </motion.button>
        </div>
    );
};
