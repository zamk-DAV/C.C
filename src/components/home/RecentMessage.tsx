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


            <Link
                className="group block border border-border p-6 bg-background rounded-xl hover:border-primary transition-all shadow-sm"
                to="/chat"
            >
                <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <p className="text-[13px] font-bold tracking-tight text-primary uppercase">
                                {senderName}
                            </p>
                            {isNew && <span className="size-2 rounded-full bg-red-500 animate-pulse" />}
                        </div>
                        <p className="text-[10px] font-medium text-text-secondary tracking-tight">{timestamp}</p>
                    </div>
                    <div>
                        <p className="text-[16px] font-normal leading-relaxed text-primary/90 tracking-tight font-sans">
                            {message}
                        </p>
                    </div>
                </div>
            </Link>
        </section>
    );
};
