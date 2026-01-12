import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createDiaryEntry } from '../../lib/notion';
import { useAuth } from '../../context/AuthContext';

interface FeedWriteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    type?: 'Diary' | 'Memory'; // New prop
}

const FeedWriteModal: React.FC<FeedWriteModalProps> = ({ isOpen, onClose, onSuccess, type = 'Diary' }) => {
    const { user, userData } = useAuth();
    const [content, setContent] = useState('');
    const [images, setImages] = useState<{ base64: string, type: string, size: number, name: string }[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);

            files.forEach(file => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setImages(prev => [...prev, {
                        base64: reader.result as string,
                        type: file.type, // MIME type
                        size: file.size,
                        name: file.name
                    }]);
                };
                reader.readAsDataURL(file);
            });
        }
    };

    const handleRemoveImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (!content && images.length === 0) return;

        setIsLoading(true);
        try {
            // Updated call signature
            await createDiaryEntry(content, images, type, {
                mood: "평온",
                sender: userData?.name || user?.displayName || "나"
            });
            setContent('');
            setImages([]);
            onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            alert('Failed to upload feed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                    />
                    <motion.div
                        initial={{ opacity: 0, y: 100, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 100, scale: 0.95 }}
                        className="fixed inset-x-4 bottom-24 z-50 bg-background dark:bg-[#1C1C1E] rounded-[24px] shadow-2xl overflow-hidden max-w-lg mx-auto"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
                            <h3 className="text-lg font-bold font-display text-text-main dark:text-white">New Memory</h3>
                            <button onClick={onClose} className="p-1 rounded-full hover:bg-secondary/50 transition-colors">
                                <span className="material-symbols-outlined text-text-secondary">close</span>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-5">
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="What's on your mind today?"
                                className="w-full h-32 bg-transparent text-text-main dark:text-gray-100 placeholder-text-secondary/50 resize-none outline-none text-base"
                            />

                            {/* Image Previews */}
                            {images.length > 0 && (
                                <div className="flex gap-3 overflow-x-auto py-3 scrollbar-hide">
                                    {images.map((img, idx) => (
                                        <div key={idx} className="relative flex-shrink-0 size-20 rounded-xl overflow-hidden shadow-sm group">
                                            <img src={img.base64} alt="preview" className="w-full h-full object-cover" />
                                            <button
                                                onClick={() => handleRemoveImage(idx)}
                                                className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <span className="material-symbols-outlined text-[14px]">close</span>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex items-center justify-between mt-4 md:mt-6">
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex items-center gap-2 text-text-secondary hover:text-primary transition-colors px-2 py-1"
                                >
                                    <span className="material-symbols-outlined text-2xl">image</span>
                                    <span className="text-sm font-medium">Add Photo</span>
                                </button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    multiple
                                    accept="image/*"
                                    onChange={handleFileChange}
                                />

                                <button
                                    onClick={handleSubmit}
                                    disabled={isLoading || (!content && images.length === 0)}
                                    className={`px-5 py-2 rounded-full font-bold text-sm transition-all ${isLoading
                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                        : 'bg-text-main dark:bg-white text-white dark:text-black hover:scale-105 active:scale-95 shadow-md'
                                        }`}
                                >
                                    {isLoading ? 'Posting...' : 'Post'}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default FeedWriteModal;
