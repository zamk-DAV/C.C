import React, { useState, useEffect, useRef } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { uploadProfileImage } from '../../services/storage';
import { motion, AnimatePresence } from 'framer-motion';
import type { UserData } from '../../types';

interface ProfileEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    userData: UserData;        // The data to display (My data OR Partner data)
    isPartner?: boolean;       // TRUE if viewing partner
    myUid?: string;           // Required if isPartner=true (to save nickname to MY doc)
    initialNickname?: string; // My existing nickname for partner
}

export const ProfileEditModal: React.FC<ProfileEditModalProps> = ({
    isOpen,
    onClose,
    userData,
    isPartner = false,
    myUid,
    initialNickname = ''
}) => {
    // Standard User Fields
    const [name, setName] = useState(userData.name || '');
    const [statusMessage, setStatusMessage] = useState(userData.statusMessage || '');
    const [emailProp, setEmailProp] = useState(userData.emailProp || '');
    const [hobbies, setHobbies] = useState(userData.hobbies || '');
    const [mbti, setMbti] = useState(userData.mbti || '');
    const [birthDate, setBirthDate] = useState(userData.birthDate || '');

    // Nickname State (Only used when isPartner is true)
    const [nickname, setNickname] = useState(initialNickname);

    // Image State
    const [profileImage, setProfileImage] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(userData.photoURL);

    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setName(userData.name || '');
            setStatusMessage(userData.statusMessage || '');
            setEmailProp(userData.emailProp || '');
            setHobbies(userData.hobbies || '');
            setMbti(userData.mbti || '');
            setBirthDate(userData.birthDate || '');
            setPreviewUrl(userData.photoURL);

            // If viewing partner, start with the nickname I previously set
            setNickname(initialNickname || '');

            setProfileImage(null);
        }
    }, [isOpen, userData, initialNickname, isPartner]);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (isPartner) return; // Cannot change partner's image
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
            if (isPartner) {
                // --- PARTNER MODE: Only Save Nickname to USER'S doc ---
                if (!myUid) {
                    console.error("Missing myUid for saving nickname");
                    return;
                }
                const myUserRef = doc(db, 'users', myUid);
                await updateDoc(myUserRef, {
                    partnerNickname: nickname
                });
                // alert("애칭이 설정되었습니다."); // Optional feedback
            } else {
                // --- MY PROFILE MODE: Save All Profile Data ---
                let photoURL = userData.photoURL;

                if (profileImage) {
                    photoURL = await uploadProfileImage(profileImage, userData.uid);
                }

                const userRef = doc(db, 'users', userData.uid);
                await updateDoc(userRef, {
                    name,
                    statusMessage,
                    emailProp,
                    hobbies,
                    mbti,
                    birthDate,
                    photoURL
                });
            }

            onClose();
        } catch (error) {
            console.error("Failed to update profile:", error);
            alert(isPartner ? "애칭 저장 실패" : "프로필 업데이트에 실패했습니다.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="bg-background w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border border-border relative z-10"
                    >
                        <div className="p-8 flex flex-col items-center gap-6">
                            <h2 className="text-xl font-bold text-primary tracking-tight">
                                {isPartner ? '상대방 프로필' : '프로필 편집'}
                            </h2>

                            {/* Image Area */}
                            <div
                                className={`relative group ${isPartner ? '' : 'cursor-pointer animate-none'}`}
                                onClick={() => !isPartner && fileInputRef.current?.click()}
                            >
                                <div
                                    className="w-28 h-28 rounded-full bg-background-secondary bg-cover bg-center border-4 border-border shadow-inner flex items-center justify-center overflow-hidden"
                                    style={{ backgroundImage: previewUrl ? `url(${previewUrl})` : undefined }}
                                >
                                    {!previewUrl && <span className="text-text-secondary material-symbols-outlined text-5xl opacity-30">person</span>}
                                </div>

                                {/* Edit Icon Overlay (Only for self) */}
                                {!isPartner && (
                                    <div className="absolute inset-0 bg-primary/20 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all backdrop-blur-[2px]">
                                        <div className="bg-background/90 p-2 rounded-full shadow-lg">
                                            <span className="material-symbols-outlined text-primary text-xl">camera_alt</span>
                                        </div>
                                    </div>
                                )}

                                {!isPartner && (
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleImageChange}
                                    />
                                )}
                            </div>

                            {/* Form Fields - with staggered-like spacing */}
                            <div className="w-full space-y-5">

                                {/* --- NICKNAME FIELD (Only visible when viewing partner) --- */}
                                {isPartner && (
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-primary/60 uppercase tracking-widest pl-1 flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[14px]">edit_square</span>
                                            내 화면에 표시될 이름 (애칭)
                                        </label>
                                        <input
                                            type="text"
                                            value={nickname}
                                            onChange={(e) => setNickname(e.target.value)}
                                            className="w-full bg-primary/5 rounded-2xl px-5 py-3.5 text-primary outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold placeholder:text-text-secondary/30 border border-primary/10 text-base"
                                            placeholder={name}
                                        />
                                        <p className="text-[10px] text-text-secondary pl-1 opacity-60">
                                            * 이 이름은 나에게만 보입니다.
                                        </p>
                                    </div>
                                )}

                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-text-secondary/60 uppercase tracking-widest pl-1">이름</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full bg-background-secondary/50 rounded-2xl px-5 py-3.5 text-primary outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium placeholder:text-text-secondary/20 disabled:opacity-50 disabled:cursor-not-allowed border border-transparent focus:border-border text-base"
                                        placeholder="이름을 입력하세요"
                                        disabled={isPartner}
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-text-secondary/60 uppercase tracking-widest pl-1">상태 메시지</label>
                                    <input
                                        type="text"
                                        value={statusMessage}
                                        onChange={(e) => setStatusMessage(e.target.value)}
                                        className="w-full bg-background-secondary/50 rounded-2xl px-5 py-3.5 text-primary outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium placeholder:text-text-secondary/20 disabled:opacity-50 disabled:cursor-not-allowed border border-transparent focus:border-border text-base"
                                        placeholder="상태 메시지 없음"
                                        disabled={isPartner}
                                    />
                                </div>

                                {/* Extended Fields Container */}
                                <div className="pt-2 space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-text-secondary/60 uppercase tracking-widest pl-1">연락처</label>
                                        <input
                                            type="text"
                                            value={emailProp}
                                            onChange={(e) => setEmailProp(e.target.value)}
                                            className="w-full bg-background-secondary/30 rounded-2xl px-5 py-3 text-sm text-primary outline-none focus:ring-1 focus:ring-primary/20 transition-all font-medium placeholder:text-text-secondary/20 disabled:opacity-50 border border-transparent"
                                            placeholder="연락처 정보 없음"
                                            disabled={isPartner}
                                        />
                                    </div>

                                    <div className="flex gap-4">
                                        <div className="space-y-1.5 flex-1">
                                            <label className="text-[11px] font-bold text-text-secondary/60 uppercase tracking-widest pl-1">MBTI</label>
                                            <input
                                                type="text"
                                                value={mbti}
                                                onChange={(e) => setMbti(e.target.value)}
                                                className="w-full bg-background-secondary/30 rounded-2xl px-5 py-3 text-sm text-primary outline-none focus:ring-1 focus:ring-primary/20 transition-all font-medium placeholder:text-text-secondary/20 uppercase disabled:opacity-50 border border-transparent"
                                                placeholder="MBTI"
                                                maxLength={4}
                                                disabled={isPartner}
                                            />
                                        </div>
                                        <div className="space-y-1.5 flex-1">
                                            <label className="text-[11px] font-bold text-text-secondary/60 uppercase tracking-widest pl-1">생일</label>
                                            <input
                                                type="date"
                                                value={birthDate}
                                                onChange={(e) => setBirthDate(e.target.value)}
                                                className="w-full bg-background-secondary/30 rounded-2xl px-5 py-3 text-sm text-primary outline-none focus:ring-1 focus:ring-primary/20 transition-all font-medium disabled:opacity-50 border border-transparent"
                                                disabled={isPartner}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-text-secondary/60 uppercase tracking-widest pl-1">취미</label>
                                        <textarea
                                            value={hobbies}
                                            onChange={(e) => setHobbies(e.target.value)}
                                            className="w-full bg-background-secondary/30 rounded-2xl px-5 py-3 text-sm text-primary outline-none focus:ring-1 focus:ring-primary/20 transition-all font-medium placeholder:text-text-secondary/20 resize-none h-24 disabled:opacity-50 border border-transparent"
                                            placeholder="취미 정보 없음"
                                            disabled={isPartner}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-4 w-full mt-4">
                                <button
                                    onClick={onClose}
                                    className="flex-1 py-4 rounded-2xl bg-background-secondary text-primary font-bold hover:bg-border transition-all active:scale-[0.98]"
                                    disabled={isLoading}
                                >
                                    {isPartner ? '닫기' : '취소'}
                                </button>

                                {(!isPartner || (isPartner && nickname !== initialNickname)) && (
                                    <button
                                        onClick={handleSave}
                                        className="flex-1 py-4 rounded-2xl bg-primary text-background font-bold hover:opacity-90 transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                                        disabled={isLoading}
                                    >
                                        {isLoading && <span className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin"></span>}
                                        저장
                                    </button>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
