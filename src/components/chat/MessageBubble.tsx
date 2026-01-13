import React from 'react';
import { Heart, ThumbsUp, Smile, Frown, Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { ChatMessage } from '../../types';

interface MessageBubbleProps {
    message: ChatMessage;
    isMine: boolean;
    senderName?: string;
    avatarUrl?: string | null;
    showProfile?: boolean;
    showTime?: boolean;
    onContextMenu?: (e: React.MouseEvent | React.TouchEvent, message: ChatMessage) => void;
    onReply?: (message: ChatMessage) => void;
    onReaction?: (message: ChatMessage, emoji: string) => void;
    onImageClick?: (imageUrl: string) => void;
}

const ReactionIcons: Record<string, any> = {
    heart: { icon: Heart, color: 'text-red-400 fill-red-400' },
    thumb: { icon: ThumbsUp, color: 'text-primary fill-primary' },
    smile: { icon: Smile, color: 'text-orange-400 fill-orange-400' },
    sad: { icon: Frown, color: 'text-blue-400 fill-blue-400' },
    wow: { icon: Sparkles, color: 'text-purple-400 fill-purple-400' },
};

const MessageMeta: React.FC<{
    isMine: boolean;
    isRead: boolean;
    showTime: boolean;
    timestamp: string;
}> = ({ isMine, isRead, showTime, timestamp }) => {
    return (
        <div className={cn(
            "flex flex-col gap-0.5 mb-[2px] transition-opacity duration-150",
            isMine ? "items-end" : "items-start"
        )}>
            {!isRead && <Heart className="w-3 h-3 text-red-400 fill-red-400" />}
            {showTime && <span className="text-[10px] text-text-secondary min-w-fit leading-none">{timestamp}</span>}
        </div>
    );
};

export const MessageBubble: React.FC<MessageBubbleProps> = ({
    message: msg,
    isMine,
    senderName,
    avatarUrl,
    showProfile = true,
    showTime = true,
    onContextMenu,
    onReaction,
    onImageClick
}) => {
    const timestamp = msg.createdAt?.toDate ?
        new Intl.DateTimeFormat('ko-KR', { hour: 'numeric', minute: 'numeric', hour12: true }).format(msg.createdAt.toDate())
        : '';

    const handleContextMenu = (e: React.MouseEvent) => {
        if (onContextMenu) {
            e.preventDefault();
            onContextMenu(e, msg);
        }
    };

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

    return (
        <div
            className={cn("group flex flex-col max-w-[85%] mb-1 select-none", isMine ? "items-end ml-auto" : "items-start")}
            onContextMenu={handleContextMenu}
        >
            {!isMine && showProfile && senderName && (
                <span className="text-[11px] text-text-secondary ml-10 mb-1">{senderName}</span>
            )}

            <div className="flex items-start gap-2">
                {!isMine && (
                    showProfile ? (
                        <div
                            className="size-8 rounded-[12px] bg-secondary bg-center bg-cover border border-border shrink-0 self-start"
                            style={{ backgroundImage: avatarUrl ? `url(${avatarUrl})` : undefined }}
                        />
                    ) : <div className="w-8 shrink-0" />
                )}

                <div className={cn("flex flex-col", isMine ? "items-end" : "items-start")}>

                    <div className="flex items-end gap-1">
                        {isMine && (
                            <MessageMeta
                                isMine={true}
                                isRead={msg.isRead ?? true}
                                showTime={showTime}
                                timestamp={timestamp}
                            />
                        )}

                        <div className="flex flex-col gap-1">
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
                                            className="w-full aspect-square bg-secondary bg-center bg-cover rounded-[12px] cursor-pointer active:opacity-90 transition-opacity"
                                            style={{ backgroundImage: `url("${msg.imageUrl}")` }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (msg.imageUrl && onImageClick) onImageClick(msg.imageUrl);
                                            }}
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
                                    "px-3.5 py-2.5 rounded-2xl break-words whitespace-pre-wrap text-[14px] leading-normal",
                                    isMine ? "bg-primary text-background rounded-tr-sm" : "border border-border bg-background text-primary rounded-tl-sm"
                                )}>
                                    {msg.text}
                                </div>
                            )}
                        </div>

                        {!isMine && (
                            <MessageMeta
                                isMine={false}
                                isRead={msg.isRead ?? true}
                                showTime={showTime}
                                timestamp={timestamp}
                            />
                        )}
                    </div>

                    {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                        <div className={cn(
                            "flex flex-wrap gap-1 mt-0.5 z-10",
                            isMine ? "justify-end mr-0.5" : "justify-start ml-0.5"
                        )}>
                            {Object.entries(msg.reactions).map(([emoji, userIds]) => {
                                if (!userIds || userIds.length === 0) return null;
                                const IconConfig = ReactionIcons[emoji];
                                if (!IconConfig) return null;

                                return (
                                    <button
                                        key={emoji}
                                        onClick={(e) => { e.stopPropagation(); onReaction?.(msg, emoji); }}
                                        className="bg-background border border-border rounded-full p-1 flex items-center justify-center shadow-sm hover:bg-secondary/50 transition-colors"
                                    >
                                        <IconConfig.icon className={cn("w-3 h-3", IconConfig.color)} />
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
