import React, { useState } from 'react';

interface DesktopMessageItemProps {
    children: React.ReactNode;
    isMine: boolean;
    onReply?: () => void;
    onReaction?: () => void;
    onContextMenu?: (e: React.MouseEvent) => void;
}

export const DesktopMessageItem: React.FC<DesktopMessageItemProps> = ({
    children,
    isMine,
    onReply,
    onReaction,
    onContextMenu,
}) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div
            className="relative group w-full flex flex-col"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onContextMenu={onContextMenu}
        >
            <div className={`flex items-end gap-2 w-full ${isMine ? 'justify-end' : 'justify-start'}`}>

                {/* Buttons for Partner (Left side of message if partner, Right side if mine... wait)
            If I am sender (Right), buttons should be on the Left of the bubble?
            If Partner (Left), buttons on Right?
            Let's follow standard: Buttons appear near bubbles.
        */}

                {/* Partner Message: [Message] [Buttons] */}
                {!isMine && (
                    <>
                        <div className="relative z-10">{children}</div>
                        <div className={`transition-opacity duration-200 flex items-center gap-1 z-20 ${isHovered ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                            <button
                                onClick={onReply}
                                className="p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-zinc-800 text-neutral-400 hover:text-primary transition-colors cursor-pointer"
                                title="답장"
                            >
                                <span className="material-symbols-outlined text-[18px]">reply</span>
                            </button>
                            <button
                                onClick={onReaction}
                                className="p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-zinc-800 text-neutral-400 hover:text-red-500 transition-colors cursor-pointer"
                                title="좋아요"
                            >
                                <span className="material-symbols-outlined text-[18px]">favorite</span>
                            </button>
                        </div>
                    </>
                )}

                {/* My Message: [Buttons] [Message] */}
                {isMine && (
                        <div className={`transition-opacity duration-200 flex items-center gap-1 z-20 ${isHovered ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                            <button
                                onClick={onReply}
                                className="p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-zinc-800 text-neutral-400 hover:text-primary transition-colors cursor-pointer"
                                title="답장"
                            >
                                <span className="material-symbols-outlined text-[18px]">reply</span>
                            </button>
                            <button
                                onClick={onReaction}
                                className="p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-zinc-800 text-neutral-400 hover:text-red-500 transition-colors cursor-pointer"
                                title="좋아요"
                            >
                                <span className="material-symbols-outlined text-[18px]">favorite</span>
                            </button>
                        </div>
                        <div className="relative z-10">{children}</div>
                    </>
                )}
        </div>
        </div >
    );
};
