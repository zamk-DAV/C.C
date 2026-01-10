import React, { useEffect, useState } from 'react';

interface PinInputProps {
    value: string;
    onChange: (value: string) => void;
    onComplete?: (value: string) => void;
    maxLength?: number;
    error?: boolean;
}

export const PinInput: React.FC<PinInputProps> = ({
    value,
    onChange,
    onComplete,
    maxLength = 4,
    error = false
}) => {
    const handleNumberClick = (num: number) => {
        if (value.length < maxLength) {
            const newValue = value + num.toString();
            onChange(newValue);
            if (newValue.length === maxLength && onComplete) {
                onComplete(newValue);
            }
        }
    };

    const handleDelete = () => {
        if (value.length > 0) {
            onChange(value.slice(0, -1));
        }
    };

    return (
        <div className="flex flex-col items-center gap-8 w-full max-w-[320px] mx-auto animate-in fade-in duration-500">
            {/* Dots Display */}
            <div className={`flex gap-6 mb-8 ${error ? 'animate-shake' : ''}`}>
                {Array.from({ length: maxLength }).map((_, i) => (
                    <div
                        key={i}
                        className={`w-4 h-4 rounded-full transition-all duration-300 ${i < value.length
                                ? 'bg-black dark:bg-white scale-110'
                                : 'bg-gray-200 dark:bg-gray-700'
                            }`}
                    />
                ))}
            </div>

            {/* Numeric Keypad */}
            <div className="grid grid-cols-3 gap-x-8 gap-y-6 w-full px-4">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <button
                        key={num}
                        onClick={() => handleNumberClick(num)}
                        className="flex items-center justify-center w-16 h-16 rounded-full text-2xl font-medium text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors active:scale-95 mx-auto"
                    >
                        {num}
                    </button>
                ))}
                {/* Empty space for alignment */}
                <div />
                <button
                    onClick={() => handleNumberClick(0)}
                    className="flex items-center justify-center w-16 h-16 rounded-full text-2xl font-medium text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors active:scale-95 mx-auto"
                >
                    0
                </button>
                <button
                    onClick={handleDelete}
                    className="flex items-center justify-center w-16 h-16 rounded-full text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors active:scale-95 mx-auto"
                >
                    <span className="material-symbols-outlined text-2xl">backspace</span>
                </button>
            </div>
        </div>
    );
};
