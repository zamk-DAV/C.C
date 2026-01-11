import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface ContextMenuProps {
    x: number;
    y: number;
    onClose: () => void;
    onReply: () => void;
    onCopy: () => void;
    onNotice: () => void;
    onDelete: () => void;
    isMine: boolean;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
    x, y, onClose, onReply, onCopy, onNotice, onDelete, isMine
}) => {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    // Portal to render on top of everything
    return createPortal(
        <div
            className="fixed inset-0 z-[9999]"
            onClick={onClose}
        >
            <div
                ref={menuRef}
                className="absolute bg-background/90 backdrop-blur-md border border-border rounded-xl shadow-2xl p-1.5 min-w-[160px] animate-in fade-in zoom-in-95 duration-200"
                style={{
                    top: y,
                    left: x,
                    transform: 'translate(-10%, -10%)'
                }}
            >
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
            </div>
        </div>,
        document.body
    );
};
