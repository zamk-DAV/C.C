import React from 'react';
import { Heart } from 'lucide-react';
import { cn } from '../../lib/utils';

interface MessageBubbleProps {
    message: string;
    timestamp: string;
    isMine: boolean;
    senderName?: string;
    avatarUrl?: string | null;
    type?: 'text' | 'image';
    imageUrl?: string;
    isRead: boolean;
    showProfile?: boolean; // Show avatar/name (only for partner, first in group)
    showTime?: boolean;    // Show timestamp (last in group)
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
    message,
    timestamp,
    isMine,
    senderName,
    avatarUrl,
    type = 'text',
    imageUrl,
    isRead,
    showProfile = true,
    showTime = true
}) => {
    // Mine: Right aligned
    if (isMine) {
        return (
            <div className="flex flex-col items-end max-w-[85%] ml-auto mb-1">
                <div className="flex items-end gap-1">
                    {/* Time & Unread Count Container */}
                    <div className="flex flex-col items-end gap-0.5 mb-[2px]">
                        {!isRead && (
                            <Heart className="w-3 h-3 text-red-400 fill-red-400" />
                        )}
                        {showTime && (
                            <span className="text-[10px] text-text-secondary min-w-fit leading-none">{timestamp}</span>
                        )}
                    </div>

                    {/* Check if Image or Text */}
                    {type === 'image' ? (
                        <div className="flex flex-col rounded-2xl rounded-tr-sm overflow-hidden border border-border">
                            <div className="p-1 bg-background overflow-hidden rounded-t-[14px]">
                                <div
                                    className="w-full aspect-square bg-secondary bg-center bg-cover grayscale-img rounded-[12px]"
                                    style={{ backgroundImage: `url("${imageUrl}")` }}
                                />
                            </div>
                            {message && (
                                <div className="border-t border-border p-3 bg-background rounded-b-[14px]">
                                    <p className="text-[14px] leading-relaxed text-primary">{message}</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-primary px-3.5 py-2.5 rounded-2xl rounded-tr-sm">
                            <p className="text-[14px] leading-normal text-background break-all whitespace-pre-wrap">{message}</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Partner: Left aligned
    return (
        <div className="flex flex-col items-start max-w-[85%] mb-1">
            {/* Name (Only show if profile is shown) */}
            {showProfile && senderName && (
                <span className="text-[11px] text-text-secondary ml-10 mb-1">{senderName}</span>
            )}

            <div className="flex items-start gap-2">
                {/* Avatar (Only visible for first message in group, otherwise transparent spacer) */}
                {showProfile ? (
                    <div
                        className="size-8 rounded-[12px] bg-secondary bg-center bg-cover border border-border shrink-0 grayscale-img self-start"
                        style={{ backgroundImage: avatarUrl ? `url(${avatarUrl})` : undefined }}
                    />
                ) : (
                    <div className="w-8 shrink-0" /> // Spacer to align valid grouping
                )}

                <div className="flex items-end gap-1">
                    {/* Check if Image or Text */}
                    {type === 'image' ? (
                        <div className="flex flex-col rounded-2xl rounded-tl-sm overflow-hidden border border-border">
                            <div className="p-1 bg-background image-bubble-in overflow-hidden">
                                <div
                                    className="w-full aspect-square bg-secondary bg-center bg-cover grayscale-img rounded-[12px]"
                                    style={{ backgroundImage: `url("${imageUrl}")` }}
                                />
                            </div>
                            {message && (
                                <div className="border-t border-border p-3 bg-background image-caption-in">
                                    <p className="text-[14px] leading-relaxed text-primary">{message}</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="border border-border px-3.5 py-2.5 bg-background rounded-2xl rounded-tl-sm">
                            <p className="text-[14px] leading-normal text-primary break-all whitespace-pre-wrap">{message}</p>
                        </div>
                    )}

                    {/* Time & Unread Count Container */}
                    <div className="flex flex-col items-start gap-0.5 mb-[2px]">
                        {!isRead && (
                            <Heart className="w-3 h-3 text-red-400 fill-red-400" />
                        )}
                        {showTime && (
                            <span className="text-[10px] text-text-secondary min-w-fit leading-none">{timestamp}</span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
