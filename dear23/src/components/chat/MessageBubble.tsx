import React, { useRef, useLayoutEffect } from 'react';
import { Heart, ThumbsUp, Smile, Frown, Sparkles, Reply } from 'lucide-react';
import { cn } from '../../../lib/utils'; // Path adjusted for dear23/src/components/chat/MessageBubble.tsx -> ../../../lib/utils
// Wait, path is dear23/src/components/chat/MessageBubble.tsx
// lib is dear23/src/lib
// So ../../../lib/utils is correct.

// Note: I need to verify ChatMessage type import.
// dear23/src/types/index.ts -> ../../../types
import type { ChatMessage } from '../../../types';

interface MessageBubbleProps {
    message: ChatMessage;
    isMine: boolean;
    senderName?: string;
    avatarUrl?: string | null;
    showProfile?: boolean;
    showTime?: boolean;
    onContextMenu?: (e: React.MouseEvent | React.TouchEvent, message: ChatMessage) => void;
    // These are now optional as they are handled by wrappers, but we keep them for logic if needed
    onReply?: (message: ChatMessage) => void;
    onReaction?: (message: ChatMessage, emoji: string) => void;
}

const ReactionIcons: Record<string, any> = {
    heart: { icon: Heart, color: 'text-red-400 fill-red-400' },
    thumb: { icon: ThumbsUp, color: 'text-primary fill-primary' },
    smile: { icon: Smile, color: 'text-orange-400 fill-orange-400' },
    sad: { icon: Frown, color: 'text-blue-400 fill-blue-400' },
    wow: { icon: Sparkles, color: 'text-purple-400 fill-purple-400' },
};

/**
 * Time/Read Status Area
 * Removed Hover Actions to avoid conflict with DesktopMessageItem
 */
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
    onReaction
}) => {
    // Format timestamp
    const timestamp = msg.createdAt?.toDate ?
        new Intl.DateTimeFormat('ko-KR', { hour: 'numeric', minute: 'numeric', hour12: true }).format(msg.createdAt.toDate())
        : '';

    const handleContextMenu = (e: React.MouseEvent) => {
        if (onContextMenu) {
            e.preventDefault();
            onContextMenu(e, msg);
        }
    };

    // Scroll preservation logic (simplistic)
    // Real fix for scroll jumping often requires a resize observer on the list container
    // or utilizing 'overflow-anchor: auto' (which is default in modern browsers).
    // If scroll jumps, it might be because elements are removed entirely from DOM.
    // Ensure container min-height or similar can help, but here we focus on structural fix.

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
            className={cn("group flex flex-col max-w-[85%] mb-1 select-none", isMine ? "items-end ml-auto" : "items-start")}
            onContextMenu={handleContextMenu}
        >
            {/* Name */}
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

                {/* Content Column (Message + Reactions) */}
                <div className={cn("flex flex-col", isMine ? "items-end" : "items-start")}>

                    {/* Message Bubble + Meta Row */}
                    <div className="flex items-end gap-1">
                        {/* Time/Actions (Mine - Left side) */}
                        {isMine && (
                            <MessageMeta
                                isMine={true}
                                isRead={msg.isRead ?? true}
                                showTime={showTime}
                                timestamp={timestamp}
                            />
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

                        {/* Time/Actions (Partner - Right side) */}
                        {!isMine && (
                            <MessageMeta
                                isMine={false}
                                isRead={msg.isRead ?? true}
                                showTime={showTime}
                                timestamp={timestamp}
                            />
                        )}
                    </div>

                    {/* Reactions Display */}
                    {/* Fixed: Moved inside flex-col to align naturally with message */}
                    {/* Fixed: Removed ml-10, used slight margin for spacing */}
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
