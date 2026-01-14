import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Heart, ThumbsUp, Smile, Frown, Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ContextMenuProps {
    x: number;
    y: number;
    onClose: () => void;
    onReply: () => void;
    onCopy: () => void;
    onNotice: () => void;
    onDelete: () => void;
    onReaction: (emoji: string) => void;
    isMine: boolean;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
    x, y, onClose, onReply, onCopy, onNotice, onDelete, onReaction, isMine
}) => {
    const menuRef = useRef<HTMLDivElement>(null);
    const [style, setStyle] = React.useState<React.CSSProperties>({
        opacity: 0,
        pointerEvents: 'none',
        position: 'fixed'
    });

    React.useLayoutEffect(() => {
        if (!menuRef.current) return;

        const menu = menuRef.current;
        const rect = menu.getBoundingClientRect();
        const winW = window.innerWidth;
        const winH = window.innerHeight;

        let top = y;
        let left = x;

        // Bottom Edge Detection: If menu goes below screen, flip it up
        if (y + rect.height > winH - 20) { // 20px padding
            top = y - rect.height;
        }

        // Right Edge Detection: If menu goes past right edge, shift left
        if (x + rect.width > winW - 20) {
            left = winW - rect.width - 20;
        }

        // Ensure it doesn't go off the top or left
        if (top < 20) top = 20;
        if (left < 20) left = 20;

        setStyle({
            top,
            left,
            opacity: 1,
            pointerEvents: 'auto'
        });

        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        const handleScroll = () => onClose();

        document.addEventListener('mousedown', handleClickOutside);
        window.addEventListener('scroll', handleScroll, { capture: true }); // Close on scroll

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('scroll', handleScroll, { capture: true });
        };
    }, [x, y, onClose]); // Recalculate if coordinates change

    // Portal to render on top of everything
    return createPortal(
        <div
            ref={menuRef}
            className="fixed z-[9999] bg-background/90 backdrop-blur-md border border-border rounded-xl shadow-2xl p-2 min-w-[200px] transition-opacity duration-200"
            style={style}
        >
            {/* Emoji Reactions */}
            <div className="flex items-center justify-between gap-1 mb-2 bg-secondary/30 p-1.5 rounded-lg">
                {[
                    { id: 'heart', icon: Heart, color: 'text-red-400' },
                    { id: 'thumb', icon: ThumbsUp, color: 'text-primary' },
                    { id: 'smile', icon: Smile, color: 'text-orange-400' },
                    { id: 'sad', icon: Frown, color: 'text-blue-400' },
                    { id: 'wow', icon: Sparkles, color: 'text-purple-400' },
                ].map((emoji) => (
                    <button
                        key={emoji.id}
                        onClick={(e) => {
                            e.stopPropagation();
                            onReaction(emoji.id);
                            onClose();
                        }}
                        className={cn("p-1.5 rounded-full hover:bg-background transition-colors", emoji.color)}
                    >
                        <emoji.icon className="w-5 h-5 fill-current opacity-80" />
                    </button>
                ))}
            </div>

            <div className="flex flex-col gap-1">
                <button
                    onClick={onReply}
                    className="flex items-center gap-3 px-3 py-2 text-[14px] text-primary hover:bg-secondary/50 rounded-lg transition-colors text-left"
                >
                    <span className="material-symbols-outlined text-[18px]">reply</span>
                    답장
                </button>
                <button
                    onClick={onCopy}
                    className="flex items-center gap-3 px-3 py-2 text-[14px] text-primary hover:bg-secondary/50 rounded-lg transition-colors text-left"
                >
                    <span className="material-symbols-outlined text-[18px]">content_copy</span>
                    복사
                </button>
                <button
                    onClick={onNotice}
                    className="flex items-center gap-3 px-3 py-2 text-[14px] text-primary hover:bg-secondary/50 rounded-lg transition-colors text-left"
                >
                    <span className="material-symbols-outlined text-[18px]">campaign</span>
                    공지
                </button>
                {isMine && (
                    <>
                        <div className="h-[1px] bg-border my-1" />
                        <button
                            onClick={onDelete}
                            className="flex items-center gap-3 px-3 py-2 text-[14px] text-red-500 hover:bg-red-500/10 rounded-lg transition-colors text-left"
                        >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                            삭제
                        </button>
                    </>
                )}
            </div>
        </div>,
        document.body
    );
};
