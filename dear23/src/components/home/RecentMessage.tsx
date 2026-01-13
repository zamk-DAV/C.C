import React from 'react';
import { Link } from 'react-router-dom';

interface RecentMessageProps {
    senderName: string;
    message: string;
    timestamp: string;
    isNew?: boolean;
}

export const RecentMessage: React.FC<RecentMessageProps> = ({
    senderName,
    message,
    timestamp,
    isNew = false,
}) => {
    return (
        <section className="px-6 py-4">
            <div className="flex items-center justify-between mb-4 px-1">
                <h3 className="text-[10px] uppercase tracking-[0.3em] font-black opacity-40">최근 메시지</h3>
            </div>


            // ...
            <Link
                className="group block border border-border/20 p-6 bg-background-secondary hover:border-accent transition-all rounded-2xl shadow-sm"
                to="/chat"
            >
                <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <p className="text-[13px] font-bold tracking-tight text-primary uppercase">
                                {senderName}
                            </p>
                            {isNew && <span className="size-1.5 rounded-full bg-primary" />}
                        </div>
                        <p className="text-[10px] font-medium opacity-30 tracking-tight">{timestamp}</p>
                    </div>
                    <div>
                        <p className="text-[16px] font-normal leading-relaxed text-primary/90 tracking-tight">
                            {message}
                        </p>
                    </div>
                </div>
            </Link>
        </section>
    );
};
