import React from 'react';
import { Heart } from 'lucide-react';
import { cn } from '../../lib/utils';
import { ChatMessage } from '../../types';

interface MessageBubbleProps {
    message: ChatMessage;
    isMine: boolean;
    senderName?: string;
    avatarUrl?: string | null;
    showProfile?: boolean;
    showTime?: boolean;
    onContextMenu: (e: React.MouseEvent | React.TouchEvent, message: ChatMessage) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
    message: msg,
    isMine,
    senderName,
    avatarUrl,
    showProfile = true,
    showTime = true,
    onContextMenu
}) => {
    // Format timestamp
    const timestamp = msg.createdAt?.toDate ?
        new Intl.DateTimeFormat('ko-KR', { hour: 'numeric', minute: 'numeric', hour12: true }).format(msg.createdAt.toDate())
        : '';

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        onContextMenu(e, msg);
    };

    const handleLongPress = (e: React.TouchEvent) => {
        // Simple long press implementation could be improved with custom hook
        // For now, relying on native context menu or user tap
        onContextMenu(e, msg);
    };

    // Deleted Message View
    if (msg.isDeleted) {
        return (
            <div className={cn("flex flex-col max-w-[85%] mb-1", isMine ? "items-end ml-auto" : "items-start")}>
                <div className="flex items-end gap-1">
                    {isMine && showTime && <span className="text-[10px] text-text-secondary min-w-fit leading-none mb-[2px]">{timestamp}</span>}

                    <div className={cn(
                        "px-3.5 py-2.5 rounded-2xl text-[14px] leading-normal break-all bg-secondary/50 text-text-secondary italic flex items-center gap-1",
                        isMine ? "rounded-tr-sm" : "rounded-tl-sm"
                    )}>
                        <span className="material-symbols-outlined text-[16px]">block</span>
                        삭제된 메시지입니다.
                    </div>

                    {!isMine && showTime && <span className="text-[10px] text-text-secondary min-w-fit leading-none mb-[2px]">{timestamp}</span>}
                </div>
            </div>
        );
    }

    // Normal Message View
    return (
        <div
            className={cn("flex flex-col max-w-[85%] mb-1 select-none", isMine ? "items-end ml-auto" : "items-start")}
            onContextMenu={handleContextMenu}
        >
            {/* Name (Only show if profile is shown for partner) */}
            {!isMine && showProfile && senderName && (
                <span className="text-[11px] text-text-secondary ml-10 mb-1">{senderName}</span>
            )}

            <div className="flex items-start gap-2">
                {/* Avatar */}
                {!isMine && (
                    showProfile ? (
                        <div
                            className="size-8 rounded-[12px] bg-secondary bg-center bg-cover border border-border shrink-0 grayscale-img self-start"
                            style={{ backgroundImage: avatarUrl ? `url(${avatarUrl})` : undefined }}
                        />
                    ) : <div className="w-8 shrink-0" />
                )}

                <div className="flex items-end gap-1">
                    {/* Time (Mine) */}
                    {isMine && (
                        <div className="flex flex-col items-end gap-0.5 mb-[2px]">
                            {!msg.isRead && <Heart className="w-3 h-3 text-red-400 fill-red-400" />}
                            {showTime && <span className="text-[10px] text-text-secondary min-w-fit leading-none">{timestamp}</span>}
                        </div>
                    )}

                    {/* Content */}
                    <div className="flex flex-col gap-1">
                        {/* Reply Quote */}
                        {msg.replyTo && (
                            <div className="text-[11px] text-text-secondary/70 bg-black/5 px-2 py-1 rounded-md mb-0.5 border-l-2 border-primary/50">
                                <span className="font-bold mr-1">{msg.replyTo.senderName}:</span>
                                <span className="line-clamp-1">{msg.replyTo.text}</span>
                            </div>
                        )}

                        {msg.type === 'image' ? (
                            <div className={cn("flex flex-col rounded-2xl overflow-hidden border border-border", isMine ? "rounded-tr-sm" : "rounded-tl-sm")}>
                                <div className="p-1 bg-background overflow-hidden rounded-t-[14px]">
                                    <div
                                        className="w-full aspect-square bg-secondary bg-center bg-cover grayscale-img rounded-[12px]"
                                        style={{ backgroundImage: `url("${msg.imageUrl}")` }}
                                    />
                                </div>
                                {msg.text && (
                                    <div className="border-t border-border p-3 bg-background rounded-b-[14px]">
                                        <p className="text-[14px] leading-relaxed text-primary">{msg.text}</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className={cn(
                                "px-3.5 py-2.5 rounded-2xl break-all whitespace-pre-wrap text-[14px] leading-normal",
                                isMine ? "bg-primary text-background rounded-tr-sm" : "border border-border bg-background text-primary rounded-tl-sm"
                            )}>
                                {msg.text}
                            </div>
                        )}
                    </div>

                    {/* Time (Partner) */}
                    {!isMine && (
                        <div className="flex flex-col items-start gap-0.5 mb-[2px]">
                            {!msg.isRead && <Heart className="w-3 h-3 text-red-400 fill-red-400" />}
                            {showTime && <span className="text-[10px] text-text-secondary min-w-fit leading-none">{timestamp}</span>}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
