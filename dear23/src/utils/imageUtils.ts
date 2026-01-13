
/**
 * Compresses an image file using HTML Canvas.
 * Max width: 1280px
 * Quality: 0.7 (JPEG)
 */
export const compressImage = (file: File): Promise<{ base64: string; name: string; type: string; size: number }> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Resize logic: Max width 1280px
                const MAX_WIDTH = 1280;
                if (width > MAX_WIDTH) {
                    height = Math.round((height * MAX_WIDTH) / width);
                    width = MAX_WIDTH;
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Canvas context not available'));
                    return;
                }

                ctx.drawImage(img, 0, 0, width, height);

                // Compress to JPEG with 0.7 quality
                const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);

                // Calculate approximate size
                const stringLength = compressedBase64.length - 'data:image/jpeg;base64,'.length;
                const sizeInBytes = 4 * Math.ceil(stringLength / 3) * 0.5624896334383812;

                resolve({
                    base64: compressedBase64,
                    name: file.name.replace(/\.[^/.]+$/, "") + ".jpg", // Force jpg extension
                    type: 'image/jpeg',
                    size: Math.round(sizeInBytes)
                });
            };
            img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
    });
};
