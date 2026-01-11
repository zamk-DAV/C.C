import React from 'react';

interface MessageBubbleProps {
    message: string;
    timestamp: string;
    isMine: boolean;
    senderName?: string;
    avatarUrl?: string | null;
    type?: 'text' | 'image';
    imageUrl?: string;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
    message,
    timestamp,
    isMine,
    senderName,
    avatarUrl,
    type = 'text',
    imageUrl
}) => {
    // Mine: Right aligned, specific bubble shape, no avatar, time on left
    if (isMine) {
        return (
            <div className="flex flex-col items-end gap-2 ml-auto max-w-[85%]">
                <div className="flex items-end gap-1">
                    <span className="text-[9px] font-bold text-text-secondary uppercase tracking-wider mb-1 min-w-fit">{timestamp}</span>
                    {type === 'image' ? (
                        <div className="flex flex-col rounded-2xl rounded-tr-sm overflow-hidden border border-border">
                            <div className="p-1 bg-background overflow-hidden rounded-t-[14px]">
                                <div
                                    className="w-full aspect-square bg-secondary bg-center bg-cover grayscale-img rounded-[12px]"
                                    style={{ backgroundImage: `url("${imageUrl}")` }}
                                />
                            </div>
                            {message && (
                                <div className="border-t border-border p-4 bg-background rounded-b-[14px]">
                                    <p className="text-[14px] leading-relaxed text-primary">{message}</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-primary p-4 bubble-out rounded-2xl rounded-tr-sm">
                            <p className="text-[14px] leading-relaxed text-background">{message}</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Partner: Left aligned, specific bubble shape, with avatar, time on right
    return (
        <div className="flex flex-col items-start gap-2 max-w-[85%]">
            {senderName && (
                <span className="text-[10px] text-text-secondary ml-10 mb-[-4px]">{senderName}</span>
            )}
            <div className="flex items-start gap-2">
                {/* Avatar */}
                <div
                    className="size-8 rounded-[12px] bg-secondary bg-center bg-cover border border-border shrink-0 grayscale-img"
                    style={{ backgroundImage: avatarUrl ? `url(${avatarUrl})` : undefined }}
                />

                <div className="flex items-end gap-1">
                    {type === 'image' ? (
                        <div className="flex flex-col rounded-2xl rounded-tl-sm overflow-hidden border border-border">
                            <div className="p-1 bg-background image-bubble-in overflow-hidden">
                                <div
                                    className="w-full aspect-square bg-secondary bg-center bg-cover grayscale-img rounded-[12px]"
                                    style={{ backgroundImage: `url("${imageUrl}")` }}
                                />
                            </div>
                            {message && (
                                <div className="border-t border-border p-4 bg-background image-caption-in">
                                    <p className="text-[14px] leading-relaxed text-primary">{message}</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="border border-border p-4 bg-background bubble-in rounded-2xl rounded-tl-sm">
                            <p className="text-[14px] leading-relaxed text-primary">{message}</p>
                        </div>
                    )}
                    <span className="text-[9px] font-bold text-text-secondary uppercase tracking-wider mb-1 min-w-fit">{timestamp}</span>
                </div>
            </div>
        </div>
    );
};
