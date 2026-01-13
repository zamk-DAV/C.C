import React from 'react';
import { useHaptics } from '../../hooks/useHaptics';

interface ThemeToggleProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
    label?: string;
    icon?: React.ReactNode;
}

/**
 * A reusable iOS-style toggle switch component that follows the app's theme.
 * - On state: System Green (#34C759)
 * - Off state: Uses theme border color for consistency
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
        <div className="flex items-center justify-between">
            {(icon || label) && (
                <div className="flex items-center gap-3">
                    {icon}
                    {label && <span className="text-[16px] text-primary">{label}</span>}
                </div>
            )}
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                disabled={disabled}
                onClick={handleToggle}
                className={`
                    w-[51px] h-[31px] rounded-full p-[2px] 
                    transition-colors duration-200 ease-in-out
                    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    ${checked ? 'bg-[#34C759]' : 'bg-border/30'}
                `}
            >
                <div
                    className={`
                        w-[26px] h-[26px] bg-white rounded-full shadow-md 
                        transform transition-transform duration-200 ease-in-out
                        ${checked ? 'translate-x-[20px]' : 'translate-x-0'}
                    `}
                />
            </button>
        </div>
    );
};
