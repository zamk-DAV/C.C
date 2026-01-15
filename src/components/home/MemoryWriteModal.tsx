import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { addAppItem, uploadImage } from '../../services/firestore';
import { useAuth } from '../../context/AuthContext';
import { compressImage } from '../../utils/imageUtils';
import { useMemoryData } from '../../context/DataContext';

interface MemoryWriteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const MemoryWriteModal: React.FC<MemoryWriteModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const { user, userData, coupleData } = useAuth();
    const { addOptimisticItem, removeOptimisticItem } = useMemoryData();
    const [content, setContent] = useState('');
    const [images, setImages] = useState<{ base64: string, type: string, size: number, name: string, url?: string }[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setContent('');
            setImages([]);
        }
    }, [isOpen]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            setIsLoading(true);

            try {
                const compressedImages = await Promise.all(
                    files.map(file => compressImage(file))
                );

                setImages(prev => [...prev, ...compressedImages]);
            } catch (error) {
                console.error("Image compression failed:", error);
                alert("이미지 처리 중 오류가 발생했습니다.");
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleRemoveImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (!content && images.length === 0) return;
        if (!user || !coupleData) {
            alert('로그인이 필요하거나 커플 연결이 되어있지 않습니다.');
            return;
        }

        const tempId = crypto.randomUUID();
        const optimisticItem: any = {
            id: tempId,
            title: '추억',
            content: content,
            date: format(new Date(), 'yyyy-MM-dd'),
            images: images.map(img => img.url || img.base64),
            authorId: user.uid,
            author: userData?.name || user?.displayName || '나',
            type: 'Memory',
            createdAt: new Date(),
            isOptimisticUpdate: true
        };

        // 1. Optimistic Add
        addOptimisticItem('memories', optimisticItem);

        // 2. Close UI Immediately
        onSuccess();
        onClose();
        setContent(''); // Reset for next time immediately
        setImages([]);

        // 3. Background Upload & Save
        try {
            // Upload Images
            const uploadedImageUrls: string[] = [];
            for (const img of images) {
                if (img.url) {
                    uploadedImageUrls.push(img.url);
                } else if (img.base64.startsWith('data:')) {
                    try {
                        const res = await fetch(img.base64);
                        const blob = await res.blob();
                        const fileName = img.name || `image-${Date.now()}.jpg`;
                        const file = new File([blob], fileName, { type: img.type });
                        // Fixed: Use a proper path structure with coupleId and unique filename
                        // The previous code was uploading to a single 'feed_images' file, overwriting it constantly.
                        const storagePath = `couples/${coupleData.id}/feed_images/${Date.now()}_${fileName}`;

                        const downloadUrl = await uploadImage(file, storagePath);
                        uploadedImageUrls.push(downloadUrl);
                    } catch (uploadErr) {
                        console.error("Image upload failed:", uploadErr);
                    }
                }
            }

            const finalItemData = {
                ...optimisticItem,
                images: uploadedImageUrls,
                isOptimisticUpdate: false,
                createdAt: undefined // Server sets timestamp
            };
            delete finalItemData.id;
            delete finalItemData.isOptimisticUpdate;

            await addAppItem(coupleData.id, 'memories', finalItemData, tempId);

            // 4. Cleanup Optimistic
            removeOptimisticItem('memories', tempId);

        } catch (error) {
            console.error("Memory save failed (background):", error);
            alert('저장에 실패했습니다.');
            removeOptimisticItem('memories', tempId);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                    />

                    {/* Modal Container - Simpler, lighter design */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="relative w-full max-w-md bg-background rounded-3xl overflow-hidden flex flex-col shadow-2xl border border-border"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
                            <button
                                onClick={onClose}
                                className="text-text-secondary text-sm font-medium hover:text-primary transition-colors"
                            >
                                취소
                            </button>
                            <h2 className="text-primary text-lg font-bold tracking-tight flex items-center gap-2">
                                <span className="material-symbols-outlined text-xl">auto_awesome</span>
                                추억 남기기
                            </h2>
                            <button
                                onClick={handleSubmit}
                                disabled={isLoading || (!content && images.length === 0)}
                                className="bg-primary text-background px-5 py-2 rounded-full text-sm font-bold hover:opacity-90 transition-all active:scale-95 disabled:opacity-30"
                            >
                                {isLoading ? '...' : '저장'}
                            </button>
                        </div>

                        {/* Loading Overlay */}
                        <AnimatePresence>
                            {isLoading && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute inset-0 z-[100] bg-background/60 backdrop-blur-md flex flex-col items-center justify-center"
                                >
                                    <div className="w-16 h-16 border-4 border-secondary/30 border-t-primary rounded-full animate-spin" />
                                    <p className="mt-4 text-primary font-bold tracking-tight">추억을 저장하는 중...</p>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 max-h-[60vh]">
                            {/* Image Upload Section */}
                            <section>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    multiple
                                    accept="image/*"
                                    onChange={handleFileChange}
                                />

                                {images.length === 0 ? (
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="group w-full aspect-video rounded-2xl border-2 border-dashed border-secondary/40 hover:border-primary flex flex-col items-center justify-center gap-3 hover:bg-secondary/10 transition-all cursor-pointer bg-secondary/5"
                                    >
                                        <div className="w-14 h-14 rounded-full bg-secondary/20 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                                            <span className="material-symbols-outlined text-text-secondary group-hover:text-primary text-3xl transition-colors">add_photo_alternate</span>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-text-secondary group-hover:text-primary text-sm font-medium transition-colors">사진 추가하기</p>
                                            <p className="text-text-secondary/50 text-xs mt-1">여러 장 선택 가능</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {/* Image Grid */}
                                        <div className="grid grid-cols-3 gap-2">
                                            {images.map((img, idx) => (
                                                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden group/item">
                                                    <img src={img.base64} alt="preview" className="w-full h-full object-cover" />
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleRemoveImage(idx); }}
                                                        className="absolute top-1.5 right-1.5 bg-black/60 text-white rounded-full p-1 opacity-100 sm:opacity-0 group-hover/item:opacity-100 transition-opacity hover:bg-red-500"
                                                    >
                                                        <span className="material-symbols-outlined text-xs">close</span>
                                                    </button>
                                                </div>
                                            ))}
                                            {/* Add More Button */}
                                            <div
                                                onClick={() => fileInputRef.current?.click()}
                                                className="aspect-square rounded-xl border-2 border-dashed border-secondary/30 hover:border-primary flex items-center justify-center cursor-pointer hover:bg-secondary/10 transition-all"
                                            >
                                                <span className="material-symbols-outlined text-text-secondary text-2xl">add</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </section>

                            {/* Text Input */}
                            <section>
                                <textarea
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    className="w-full bg-secondary/10 border border-secondary/20 focus:border-primary rounded-2xl p-4 text-base leading-relaxed text-primary placeholder-text-secondary/40 focus:ring-0 min-h-[120px] resize-none outline-none transition-all"
                                    placeholder="이 순간을 기록해보세요..."
                                />
                            </section>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default MemoryWriteModal;
