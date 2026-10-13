import { ref, uploadBytesResumable, getDownloadURL, StorageReference, UploadMetadata } from 'firebase/storage';
import heic2any from 'heic2any';

export interface ImageOptimizationOptions {
    maxWidthOrHeight?: number;
    maxSizeMB?: number;
    quality?: number;
}

/**
 * Optimizes an image for web and mobile upload:
 * 1. Converts HEIC/HEIF (iOS) to JPEG
 * 2. Downscales large smartphone camera photos (often 12-48MP, 5-15MB) to max 1600px
 * 3. Compresses to high quality JPEG (~200KB - 600KB)
 * 4. Drastically speeds up uploads on mobile/outdoor networks (e.g. archipelago/skärgård)
 */
export async function optimizeImageForUpload(
    file: File,
    options?: ImageOptimizationOptions,
    onStatus?: (status: string) => void
): Promise<File> {
    // If it's not an image, return original
    if (!file.type.startsWith('image/') && !file.name.toLowerCase().match(/\.(heic|heif|jpg|jpeg|png|webp)$/i)) {
        return file;
    }

    let currentFile = file;

    // 1. Handle HEIC/HEIF conversion
    const isHeic = file.type === 'image/heic' || file.type === 'image/heif' || 
                   file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif');

    if (isHeic) {
        if (onStatus) onStatus('Konverterar iPhone-bild (HEIC)...');
        try {
            const convertedBlob = await heic2any({
                blob: file,
                toType: 'image/jpeg',
                quality: options?.quality || 0.85
            }) as Blob;

            const newName = file.name.replace(/\.(heic|heif)$/i, '.jpg');
            currentFile = new File([convertedBlob], newName, { type: 'image/jpeg' });
        } catch (heicErr) {
            console.warn('HEIC conversion failed, proceeding with original file:', heicErr);
        }
    }

    // 2. Compress and downscale large photos
    // Only run compression in the browser
    if (typeof window !== 'undefined') {
        try {
            if (onStatus) onStatus('Optimerar bild för snabb uppladdning...');
            
            // Dynamic import to prevent any SSR canvas issues
            const imageCompression = (await import('browser-image-compression')).default;

            const compressionOptions = {
                maxSizeMB: options?.maxSizeMB || 0.9, // Target under ~900KB
                maxWidthOrHeight: options?.maxWidthOrHeight || 1600, // 1600px is crystal clear on mobile & desktop retina
                useWebWorker: true,
                fileType: 'image/jpeg',
                initialQuality: options?.quality || 0.85,
            };

            const compressedBlob = await imageCompression(currentFile, compressionOptions);
            const finalName = currentFile.name.replace(/\.[^/.]+$/, '.jpg');
            
            return new File([compressedBlob], finalName, { type: 'image/jpeg' });
        } catch (compressionErr) {
            console.warn('Image compression failed or skipped, using fallback file:', compressionErr);
            return currentFile;
        }
    }

    return currentFile;
}

/**
 * Uploads a file/blob to Firebase Storage with automatic retry and exponential backoff.
 * Especially important for spotty mobile connections on lakes / archipelagos.
 */
export async function uploadToStorageWithRetry(
    storageRef: StorageReference,
    blob: Blob | File | Uint8Array,
    metadata?: UploadMetadata,
    onProgress?: (progress: number) => void,
    maxRetries: number = 3
): Promise<string> {
    let lastError: any = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const downloadUrl = await new Promise<string>((resolve, reject) => {
                const uploadTask = uploadBytesResumable(storageRef, blob, metadata);

                uploadTask.on(
                    'state_changed',
                    (snapshot) => {
                        if (snapshot.totalBytes > 0 && onProgress) {
                            const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                            onProgress(pct);
                        }
                    },
                    (error) => {
                        reject(error);
                    },
                    async () => {
                        try {
                            const url = await getDownloadURL(uploadTask.snapshot.ref);
                            resolve(url);
                        } catch (err) {
                            reject(err);
                        }
                    }
                );
            });

            return downloadUrl;
        } catch (error: any) {
            lastError = error;
            console.warn(`Storage upload attempt ${attempt}/${maxRetries} failed:`, error);

            // Don't retry if permission/authorization is denied or upload was explicitly cancelled
            if (error?.code === 'storage/unauthorized' || error?.code === 'storage/canceled') {
                throw error;
            }

            if (attempt < maxRetries) {
                // Wait with backoff before next attempt
                await new Promise((r) => setTimeout(r, 1000 * attempt));
            }
        }
    }

    throw lastError;
}

/**
 * Translates Firebase Storage error codes into user-friendly Swedish messages.
 */
export function formatStorageErrorMessage(error: any): string {
    const code = error?.code || '';
    if (code === 'storage/unknown') {
        return 'Uppladdningen avbröts av en ostabil nätverksanslutning. Kontrollera din mobiltäckning och försök igen.';
    }
    if (code === 'storage/unauthorized') {
        return 'Behörighet saknas för att ladda upp. Prova att logga ut och logga in igen.';
    }
    if (code === 'storage/quota-exceeded') {
        return 'Lagringsutrymmet i molnet är för tillfället fullt. Kontakta administratören.';
    }
    if (code === 'storage/retry-limit-exceeded') {
        return 'Uppladdningen tog för lång tid pga svag nätverksuppkoppling. Försök igen när du har bättre täckning.';
    }
    if (code === 'storage/canceled') {
        return 'Uppladdningen avbröts.';
    }
    return error?.message || 'Ett fel inträffade vid uppladdning.';
}
