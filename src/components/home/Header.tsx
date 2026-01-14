import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

interface HeaderProps {
    partnerName: string;
    isOnline: boolean;
    lastActive?: any;
    isPushEnabled: boolean;
    onTogglePush: () => void;
}

export const Header: React.FC<HeaderProps> = ({
    partnerName,
    isOnline,
    lastActive,
    isPushEnabled,
    onTogglePush,
}) => {

    const getStatusText = () => {
        if (isOnline) return '현재 접속 중';
        if (lastActive) {
            const date = lastActive.toDate ? lastActive.toDate() : new Date(lastActive);
            return `${formatDistanceToNow(date, { addSuffix: true, locale: ko })} 활동`;
        }
        return '오프라인';
    };

    return (
        <header className="flex items-start justify-between px-6 pt-16 pb-12 border-b border-border/40 backdrop-blur-sm sticky top-0 z-50 bg-background/50">
            <div className="flex items-center">
                <div
                    className={`toggle-pill ${isPushEnabled ? 'toggle-active' : ''}`}
                    onClick={onTogglePush}
                ></div>
            </div>
            <div className="flex flex-col items-end">
                <p className="text-[14px] font-bold tracking-tight text-primary uppercase">{partnerName}</p>
                <p className={`text-[10px] font-normal tracking-tight ${isOnline ? 'text-green-500' : 'text-primary/40'}`}>
                    {getStatusText()}
                </p>
            </div>
        </header>
    );
};
