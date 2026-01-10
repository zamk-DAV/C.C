import React from 'react';
// import { cn } from '../../lib/utils';

interface HeaderProps {
    partnerName: string;
    partnerImage: string;
    myImage: string;
    isOnline: boolean;
    daysTogether: number;
}

export const Header: React.FC<HeaderProps> = ({
    partnerName,
    partnerImage,
    myImage,
    isOnline,
    daysTogether,
}) => {
    return (
        <header className="flex items-start justify-between px-6 pt-16 pb-12">
            <div className="flex items-center gap-3">
                <div className="flex -space-x-4">
                    <div
                        className="size-12 rounded-full border-2 border-background bg-center bg-cover grayscale-img z-10"
                        style={{ backgroundImage: `url("${partnerImage}")` }}
                    />
                    <div
                        className="size-12 rounded-full border-2 border-background bg-center bg-cover grayscale-img"
                        style={{ backgroundImage: `url("${myImage}")` }}
                    />
                </div>
                <div className="flex flex-col">
                    <p className="text-[11px] font-bold tracking-tight text-primary">{partnerName}</p>
                    <p className="text-[10px] font-medium text-primary/40">
                        {isOnline ? '현재 접속 중' : '오프라인'}
                    </p>
                </div>
            </div>

            <div className="flex flex-col items-end gap-6">
                <div className="flex flex-col items-end">
                    <p className="text-3xl font-black tracking-tighter leading-none">{daysTogether}</p>
                    <p className="text-[9px] uppercase tracking-[0.2em] font-bold opacity-30 mt-1">
                        DAYS TOGETHER
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] opacity-40">notifications</span>
                    <div className="toggle-pill toggle-active"></div>
                </div>
            </div>
        </header>
    );
};
