import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { PinInput } from './PinInput';

export const LockScreen: React.FC = () => {
    const { userData, unlockApp } = useAuth();
    const [pin, setPin] = useState('');
    const [shake, setShake] = useState(false);

    const handlePinComplete = (enteredPin: string) => {
        if (userData?.passcode === enteredPin) {
            // Success
            unlockApp();
        } else {
            // Error
            setShake(true);
            setTimeout(() => {
                setPin('');
                setShake(false);
            }, 500);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background text-primary pb-20 transition-colors duration-300">
            <div className="mb-12 flex flex-col items-center gap-4">
                <span className="material-symbols-outlined text-4xl text-text-secondary">lock</span>
                <p className="text-sm font-medium tracking-widest uppercase text-text-secondary/70">암호 입력</p>
                <h1 className="text-2xl font-bold font-display text-primary">
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
