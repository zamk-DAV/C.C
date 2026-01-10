import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { PinInput } from './PinInput';

export const LockScreen: React.FC = () => {
    const { userData, unlockApp } = useAuth();
    const [pin, setPin] = useState('');
    const [error, setError] = useState(false);
    const [shake, setShake] = useState(false);

    const handlePinComplete = (enteredPin: string) => {
        if (userData?.passcode === enteredPin) {
            // Success
            unlockApp();
        } else {
            // Error
            setError(true);
            setShake(true);
            setTimeout(() => {
                setPin('');
                setError(false);
                setShake(false);
            }, 500);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white dark:bg-black text-black dark:text-white pb-20">
            <div className="mb-12 flex flex-col items-center gap-4">
                <span className="material-symbols-outlined text-4xl text-gray-400">lock</span>
                <p className="text-sm font-medium tracking-widest uppercase text-gray-500">암호 입력</p>
                <h1 className="text-2xl font-bold font-display">
                    {userData?.name ? `${userData.name}님의 Dear23` : 'Dear23'}
                </h1>
            </div>

            <PinInput
                value={pin}
                onChange={setPin}
                onComplete={handlePinComplete}
                error={shake}
            />
        </div>
    );
};
