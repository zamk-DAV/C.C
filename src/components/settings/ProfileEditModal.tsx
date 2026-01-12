import React, { useState, useRef, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { UserData } from '../../types';
import { uploadProfileImage } from '../../services/storage';

interface ProfileEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    userData: UserData;
}

export const ProfileEditModal: React.FC<ProfileEditModalProps> = ({ isOpen, onClose, userData }) => {
    const [name, setName] = useState(userData.name || '');
    const [statusMessage, setStatusMessage] = useState(userData.statusMessage || '');
    const [profileImage, setProfileImage] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(userData.photoURL);
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setName(userData.name || '');
            setStatusMessage(userData.statusMessage || '');
            setPreviewUrl(userData.photoURL);
            setProfileImage(null);
        }
    }, [isOpen, userData]);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setProfileImage(file);
            const objectUrl = URL.createObjectURL(file);
            setPreviewUrl(objectUrl);
        }
    };

    const handleSave = async () => {
        setIsLoading(true);
        try {
            let photoURL = userData.photoURL;

            // 1. Upload Image if changed
            if (profileImage) {
                photoURL = await uploadProfileImage(profileImage, userData.uid);
            }

            // 2. Update Firestore
            const userRef = doc(db, 'users', userData.uid);
            await updateDoc(userRef, {
                name,
                statusMessage,
                photoURL
            });

            onClose();
        } catch (error) {
            console.error("Failed to update profile:", error);
            alert("프로필 업데이트에 실패했습니다.");
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-background w-full max-w-sm rounded-2xl shadow-xl overflow-hidden border border-border animate-in zoom-in-95 duration-200">
                <div className="p-6 flex flex-col items-center gap-6">
                    <h2 className="text-xl font-bold text-primary">프로필 편집</h2>

                    {/* Image Upload */}
                    <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                        <div
                            className="w-24 h-24 rounded-full bg-secondary bg-cover bg-center border-2 border-border"
                            style={{ backgroundImage: previewUrl ? `url(${previewUrl})` : undefined }}
                        >
                            {!previewUrl && <span className="flex items-center justify-center h-full text-text-secondary material-symbols-outlined text-4xl">person</span>}
                        </div>
                        <div className="absolute inset-0 bg-black/30 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="material-symbols-outlined text-white">camera_alt</span>
                        </div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handleImageChange}
                        />
                    </div>

                    {/* Form Fields */}
                    <div className="w-full space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-text-secondary pl-1">이름</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-secondary/30 rounded-xl px-4 py-3 text-primary outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium placeholder:text-text-secondary/50"
                                placeholder="이름을 입력하세요"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-text-secondary pl-1">상태 메시지</label>
                            <input
                                type="text"
                                value={statusMessage}
                                onChange={(e) => setStatusMessage(e.target.value)}
                                className="w-full bg-secondary/30 rounded-xl px-4 py-3 text-primary outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium placeholder:text-text-secondary/50"
                                placeholder="상태 메시지를 입력하세요"
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 w-full mt-2">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 rounded-xl bg-secondary text-primary font-bold hover:bg-secondary/80 transition-colors"
                            disabled={isLoading}
                        >
                            취소
                        </button>
                        <button
                            onClick={handleSave}
                            className="flex-1 py-3 rounded-xl bg-primary text-background font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                            disabled={isLoading}
                        >
                            {isLoading && <span className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin"></span>}
                            저장
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
