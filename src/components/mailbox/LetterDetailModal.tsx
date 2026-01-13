import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Postcard } from '../../types';

interface LetterDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    letter: Postcard | null;
    isFromMe: boolean;
}

export const LetterDetailModal: React.FC<LetterDetailModalProps> = ({
    isOpen,
    onClose,
    letter,
    isFromMe
}) => {
    if (!letter) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/80 z-50"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="fixed inset-4 z-50 bg-background rounded-sm shadow-2xl overflow-hidden max-w-lg mx-auto flex flex-col my-auto max-h-[80vh]"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-8 py-6 border-b border-border">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold tracking-[0.2em] text-text-secondary uppercase">
                                    {letter.date}
                                </span>
                                <h3 className="text-xl font-bold text-primary italic mt-1">
                                    {isFromMe ? `To. Partner` : `From. ${letter.senderName}`}
                                </h3>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 border border-primary rounded-full hover:bg-secondary transition-colors"
                            >
                                <span className="material-symbols-outlined text-primary text-[18px]">close</span>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 p-8 overflow-y-auto">
                            <p className="font-serif text-lg leading-loose text-primary whitespace-pre-wrap">
                                {letter.content}
                            </p>
                        </div>

                        {/* Footer */}
                        <div className="px-8 py-6 border-t border-border bg-secondary/20">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-text-secondary">
                                    <span className="material-symbols-outlined text-[16px]">
                                        {letter.isRead ? 'visibility' : 'visibility_off'}
                                    </span>
                                    <span className="text-xs">
                                        {letter.isRead ? '읽음' : '읽지 않음'}
                                    </span>
                                </div>

                                <button
                                    onClick={onClose}
                                    className="flex items-center gap-2 text-primary font-bold text-sm hover:opacity-70 transition-opacity"
                                >
                                    <span className="border-b border-primary pb-0.5">닫기</span>
                                    <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
