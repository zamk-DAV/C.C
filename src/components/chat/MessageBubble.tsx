import React from 'react';
import { Heart, ThumbsUp, Smile, Frown, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import type { ChatMessage } from '../../types';
import { LinkPreview } from './LinkPreview';

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
    heart: { icon: Heart, color: 'text-danger fill-danger' },
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
            {/* 하트는 내가 보낸 메시지에서만, 상대방이 읽지 않았을 때만 표시 */}
            {isMine && !isRead && (
                <Heart className="size-3 text-danger fill-danger" />
            )}
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

    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const firstUrl = msg.text?.match(urlRegex)?.[0];

    const handleContextMenu = (e: React.MouseEvent) => {
        if (onContextMenu) {
            e.preventDefault();
            onContextMenu(e, msg);
        }
    };

    if (msg.isDeleted) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={cn("flex flex-col max-w-[85%] mb-1", isMine ? "items-end ml-auto" : "items-start")}
            >
                <div className="flex items-end gap-1">
                    {isMine && showTime && <span className="text-[10px] text-text-secondary min-w-fit leading-none mb-[2px]">{timestamp}</span>}

                    <div className={cn(
                        "px-3.5 py-2.5 rounded-2xl text-[14px] leading-normal break-all bg-background-secondary/50 text-text-secondary italic flex items-center gap-1 border border-border/50",
                        isMine ? "rounded-tr-sm" : "rounded-tl-sm"
                    )}>
                        <span className="material-symbols-outlined text-[16px]">block</span>
                        삭제된 메시지입니다.
                    </div>

                    {!isMine && showTime && <span className="text-[10px] text-text-secondary min-w-fit leading-none mb-[2px]">{timestamp}</span>}
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, x: isMine ? 10 : -10, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className={cn("group flex flex-col max-w-[85%] mb-1 select-none", isMine ? "items-end ml-auto" : "items-start")}
            onContextMenu={handleContextMenu}
        >
            {!isMine && showProfile && senderName && (
                <span className="text-[11px] text-text-secondary ml-10 mb-1 font-medium">{senderName}</span>
            )}

            <div className="flex items-start gap-2">
                {!isMine && (
                    showProfile ? (
                        <div
                            className="size-8 rounded-[12px] bg-background-secondary bg-center bg-cover border border-border/50 shrink-0 self-start shadow-sm"
                            style={{ backgroundImage: avatarUrl ? `url(${avatarUrl})` : undefined }}
                        />
                    ) : <div className="w-8 shrink-0" />
                )}

                <div className={cn("flex flex-col", isMine ? "items-end" : "items-start")}>

                    <div className="flex items-end gap-1.5">
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
                                <div className="text-[11px] text-text-secondary bg-background-secondary/80 px-3 py-1.5 rounded-xl mb-1 border-l-2 border-primary/30 max-w-[200px]">
                                    <span className="font-bold mr-1 text-primary/70">{msg.replyTo.senderName}:</span>
                                    <span className="line-clamp-1 opacity-70">{msg.replyTo.text}</span>
                                </div>
                            )}

                            {msg.type === 'image' ? (
                                <div className={cn("flex flex-col rounded-2xl overflow-hidden border border-border shadow-sm", isMine ? "rounded-tr-sm" : "rounded-tl-sm")}>
                                    <div className="p-1 bg-background overflow-hidden rounded-t-[14px]">
                                        <div
                                            className="w-full aspect-square bg-background-secondary bg-center bg-cover rounded-[12px] cursor-pointer active:opacity-90 transition-opacity"
                                            style={{ backgroundImage: `url("${msg.imageUrl}")` }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (msg.imageUrl && onImageClick) onImageClick(msg.imageUrl);
                                            }}
                                        />
                                    </div>
                                    {msg.text && (
                                        <div className="border-t border-border p-3 bg-background rounded-b-[14px]">
                                            <p className="text-[14px] leading-relaxed text-primary/90">{msg.text}</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex flex-col">
                                    <div className={cn(
                                        "px-4 py-2.5 rounded-2xl break-words whitespace-pre-wrap text-[14px] leading-normal shadow-[0_1px_2px_rgba(0,0,0,0.05)]",
                                        isMine ? "bg-primary text-background rounded-tr-sm" : "border border-border bg-background text-primary rounded-tl-sm"
                                    )}>
                                        {msg.text}
                                    </div>
                                    {firstUrl && <LinkPreview url={firstUrl} />}
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
                            "flex flex-wrap gap-1 mt-1 z-10",
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
                                        className="bg-background border border-border rounded-full px-1.5 py-1 flex items-center justify-center shadow-sm hover:bg-background-secondary transition-colors"
                                    >
                                        <IconConfig.icon className={cn("w-3 h-3", IconConfig.color)} />
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
};
