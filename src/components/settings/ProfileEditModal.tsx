import React, { useState, useRef, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { UserData } from '../../types';
import { uploadProfileImage } from '../../services/storage';

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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-background w-full max-w-sm rounded-2xl shadow-xl overflow-hidden border border-border animate-in zoom-in-95 duration-200">
                <div className="p-6 flex flex-col items-center gap-6">
                    <h2 className="text-xl font-bold text-primary">
                        {isPartner ? '상대방 프로필' : '프로필 편집'}
                    </h2>

                    {/* Image Area */}
                    <div
                        className={`relative group ${isPartner ? '' : 'cursor-pointer'}`}
                        onClick={() => !isPartner && fileInputRef.current?.click()}
                    >
                        <div
                            className="w-24 h-24 rounded-full bg-secondary bg-cover bg-center border-2 border-border"
                            style={{ backgroundImage: previewUrl ? `url(${previewUrl})` : undefined }}
                        >
                            {!previewUrl && <span className="flex items-center justify-center h-full text-text-secondary material-symbols-outlined text-4xl">person</span>}
                        </div>

                        {/* Edit Icon Overlay (Only for self) */}
                        {!isPartner && (
                            <div className="absolute inset-0 bg-black/30 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="material-symbols-outlined text-white">camera_alt</span>
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

                    {/* Form Fields */}
                    <div className="w-full space-y-4">

                        {/* --- NICKNAME FIELD (Only visible when viewing partner) --- */}
                        {isPartner && (
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-primary pl-1 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[14px]">edit_square</span>
                                    내 화면에 표시될 이름 (애칭)
                                </label>
                                <input
                                    type="text"
                                    value={nickname}
                                    onChange={(e) => setNickname(e.target.value)}
                                    className="w-full bg-primary/5 rounded-xl px-4 py-3 text-primary outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold placeholder:text-text-secondary/50 border border-primary/20"
                                    placeholder={name} // Show real name as placeholder
                                />
                                <p className="text-[10px] text-text-secondary pl-1">
                                    * 이 이름은 나에게만 보입니다.
                                </p>
                            </div>
                        )}

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-text-secondary pl-1">이름</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-secondary/30 rounded-xl px-4 py-3 text-primary outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium placeholder:text-text-secondary/50 disabled:opacity-70 disabled:cursor-not-allowed"
                                placeholder="이름을 입력하세요"
                                disabled={isPartner} // Cannot change partner's real name via this modal
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-text-secondary pl-1">상태 메시지</label>
                            <input
                                type="text"
                                value={statusMessage}
                                onChange={(e) => setStatusMessage(e.target.value)}
                                className="w-full bg-secondary/30 rounded-xl px-4 py-3 text-primary outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium placeholder:text-text-secondary/50 disabled:opacity-70 disabled:cursor-not-allowed"
                                placeholder="상태 메시지 없음"
                                disabled={isPartner}
                            />
                        </div>

                        {/* Extended Fields */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-text-secondary pl-1">연락처</label>
                            <input
                                type="text"
                                value={emailProp}
                                onChange={(e) => setEmailProp(e.target.value)}
                                className="w-full bg-secondary/30 rounded-xl px-4 py-3 text-primary outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium placeholder:text-text-secondary/50 disabled:opacity-70 disabled:cursor-not-allowed"
                                placeholder="연락처 정보 없음"
                                disabled={isPartner}
                            />
                        </div>

                        <div className="flex gap-3">
                            <div className="space-y-1 flex-1">
                                <label className="text-xs font-bold text-text-secondary pl-1">MBTI</label>
                                <input
                                    type="text"
                                    value={mbti}
                                    onChange={(e) => setMbti(e.target.value)}
                                    className="w-full bg-secondary/30 rounded-xl px-4 py-3 text-primary outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium placeholder:text-text-secondary/50 uppercase disabled:opacity-70 disabled:cursor-not-allowed"
                                    placeholder="MBTI"
                                    maxLength={4}
                                    disabled={isPartner}
                                />
                            </div>
                            <div className="space-y-1 flex-1">
                                <label className="text-xs font-bold text-text-secondary pl-1">생일</label>
                                <input
                                    type="date"
                                    value={birthDate}
                                    onChange={(e) => setBirthDate(e.target.value)}
                                    className="w-full bg-secondary/30 rounded-xl px-4 py-3 text-primary outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium placeholder:text-text-secondary/50 disabled:opacity-70 disabled:cursor-not-allowed"
                                    disabled={isPartner}
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-text-secondary pl-1">취미</label>
                            <textarea
                                value={hobbies}
                                onChange={(e) => setHobbies(e.target.value)}
                                className="w-full bg-secondary/30 rounded-xl px-4 py-3 text-primary outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium placeholder:text-text-secondary/50 resize-none h-20 disabled:opacity-70 disabled:cursor-not-allowed"
                                placeholder="취미 정보 없음"
                                disabled={isPartner}
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
                            {isPartner ? '닫기' : '취소'}
                        </button>

                        {/* Only show SAVE if it's MY profile OR if I changed the nickname */}
                        {(!isPartner || (isPartner && nickname !== initialNickname)) && (
                            <button
                                onClick={handleSave}
                                className="flex-1 py-3 rounded-xl bg-primary text-background font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                                disabled={isLoading}
                            >
                                {isLoading && <span className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin"></span>}
                                저장
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
