
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';

/**
 * 프로필 이미지를 Firebase Storage에 업로드하고 다운로드 URL을 반환합니다.
 * @param file 업로드할 파일 객체
 * @param uid 사용자 UID
 * @returns 업로드된 이미지의 다운로드 URL
 */
export const uploadProfileImage = async (file: File, uid: string): Promise<string> => {
    try {
        // 이미지 확장자 추출 (기본값 jpg)
        const extension = file.name.split('.').pop() || 'jpg';
        const storageRef = ref(storage, `profile_images/${uid}/${Date.now()}.${extension}`);

        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);

        return downloadURL;
    } catch (error) {
        console.error("Error uploading profile image:", error);
        throw error;
    }
};
