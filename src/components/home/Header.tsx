import React from 'react';
// import { cn } from '../../lib/utils';

interface HeaderProps {
    partnerName: string;
    // partnerImage: string; // Removed
    // myImage: string;      // Removed
    isOnline: boolean;
    // daysTogether: number; // Removed
}

export const Header: React.FC<HeaderProps> = ({
    partnerName,
    isOnline,
}) => {
    // Initial state for toggle (UI only)
    const [isNotifOn, setIsNotifOn] = React.useState(false);

    return (
        <header className="flex items-start justify-between px-6 pt-16 pb-12">
            <div className="flex items-center">
                <div
                    className={`toggle-pill ${isNotifOn ? 'toggle-active' : ''}`}
                    onClick={() => setIsNotifOn(!isNotifOn)}
                ></div>
            </div>
            <div className="flex flex-col items-end">
                <p className="text-[14px] font-bold tracking-tight text-primary uppercase">{partnerName}</p>
                <p className="text-[10px] font-normal tracking-tight text-primary/40">
                    {isOnline ? '현재 접속 중' : '오프라인'}
                </p>
            </div>
        </header>
    );
};
