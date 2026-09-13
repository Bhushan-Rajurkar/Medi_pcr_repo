import { File, Paths } from 'expo-file-system';
import { api } from '@/services/api';

/**
 * Safe FileSystem bridge for Expo using modern File and Paths classes.
 * This completely avoids legacy methods like writeAsStringAsync and downloadAsync.
 */

/**
 * Returns a local writable directory path (with trailing slash)
 */
export const getSafeDirectory = (): string => {
  try {
    const cacheDir = Paths.cache.uri;
    return cacheDir.endsWith('/') ? cacheDir : `${cacheDir}/`;
  } catch {
    return '';
  }
};

/**
 * Writes UTF-8 text content to a local file using the modern Expo File class
 */
export const writeTextFileAsync = async (fileUriOrName: string, content: string): Promise<string> => {
  try {
    const file = fileUriOrName.startsWith('file:')
      ? new File(fileUriOrName)
      : new File(Paths.cache, fileUriOrName);
    if (!file.exists) {
      file.create();
    }
    file.write(content);
    return file.uri;
  } catch (err) {
    console.warn('[fileSystemHelper] writeTextFileAsync error:', err);
    throw err;
  }
};

const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const B64_LOOKUP = new Uint8Array(256);
for (let i = 0; i < B64_CHARS.length; i++) {
  B64_LOOKUP[B64_CHARS.charCodeAt(i)] = i;
}

export const decodeBase64ToUint8Array = (base64: string): Uint8Array => {
  if (!base64) return new Uint8Array(0);
  const clean = base64.replace(/^data:.*?;base64,/, '').replace(/[\r\n\s]/g, '');
  const len = clean.length;
  if (len === 0) return new Uint8Array(0);
  const placeHolders = clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0;
  const bytesLength = Math.max(0, Math.floor((len * 3) / 4) - placeHolders);
  const bytes = new Uint8Array(bytesLength);
  let cur = 0;
  for (let i = 0; i < len; i += 4) {
    const a = B64_LOOKUP[clean.charCodeAt(i)];
    const b = B64_LOOKUP[clean.charCodeAt(i + 1)];
    const c = B64_LOOKUP[clean.charCodeAt(i + 2)];
    const d = B64_LOOKUP[clean.charCodeAt(i + 3)];
    if (cur < bytesLength) bytes[cur++] = (a << 2) | (b >> 4);
    if (cur < bytesLength) bytes[cur++] = ((b & 15) << 4) | (c >> 2);
    if (cur < bytesLength) bytes[cur++] = ((c & 3) << 6) | (d & 63);
  }
  return bytes;
};

/**
 * Writes Base64 encoded data to a local file using the modern Expo File class
 */
export const writeBase64FileAsync = async (fileUriOrName: string, base64Data: string): Promise<string> => {
  try {
    const file = fileUriOrName.startsWith('file:')
      ? new File(fileUriOrName)
      : new File(Paths.cache, fileUriOrName);
    if (!file.exists) {
      file.create();
    }
    const bytes = decodeBase64ToUint8Array(base64Data);
    file.write(bytes);
    return file.uri;
  } catch (err) {
    console.warn('[fileSystemHelper] writeBase64FileAsync error:', err);
    throw err;
  }
};

/**
 * Downloads a remote URL to a local destination file URI using the modern File API.
 * Includes fetch fallback with custom authorization headers to prevent 401 errors.
 */
export const downloadFileAsync = async (
  remoteUrl: string,
  fileUriOrName: string,
  headers?: Record<string, string>
): Promise<{ uri: string }> => {
  try {
    const file = fileUriOrName.startsWith('file:')
      ? new File(fileUriOrName)
      : new File(Paths.cache, fileUriOrName);

    // Prepare auth headers: attach Bearer token ONLY for backend URLs, NOT for Cloudinary
    const reqHeaders: Record<string, string> = { ...(headers || {}) };
    const isCloudinary = remoteUrl.includes('cloudinary.com');
    if (!isCloudinary && !reqHeaders['Authorization']) {
      try {
        const token = api.getToken();
        if (token) {
          reqHeaders['Authorization'] = `Bearer ${token}`;
        }
      } catch {}
    }

    try {
      await File.downloadFileAsync(remoteUrl, file, { idempotent: true, headers: reqHeaders });
      return { uri: file.uri };
    } catch (downloadErr) {
      // Fallback via standard fetch
      const resp = await fetch(remoteUrl, { headers: reqHeaders });
      if (!resp.ok) {
        throw new Error(`Fetch failed with status ${resp.status}`);
      }
      const buffer = await resp.arrayBuffer();
      if (!file.exists) file.create();
      file.write(new Uint8Array(buffer));
      return { uri: file.uri };
    }
  } catch (err) {
    console.warn('[fileSystemHelper] downloadFileAsync error:', err);
    throw err;
  }
};

/**
 * Safely saves a base64 or source URI PDF into Paths.cache ensuring full read permissions
 * for expo-sharing on Android without "Not allowed to read file under given URL" errors.
 */
export const saveAndSharePdfAsync = async (
  sourceUriOrBase64: string,
  fileName: string
): Promise<string> => {
  const cleanName = fileName.replace(/\s+/g, '_');
  const targetFile = new File(Paths.cache, cleanName);
  
  if (targetFile.exists) {
    try {
      targetFile.delete();
    } catch {}
  }

  if (sourceUriOrBase64.startsWith('file:') || sourceUriOrBase64.startsWith('/')) {
    // It's a file URI from Print.printToFileAsync
    try {
      const sourceFile = new File(sourceUriOrBase64);
      await sourceFile.copy(targetFile);
      return targetFile.uri;
    } catch (copyErr) {
      console.warn('[fileSystemHelper] File copy failed, trying binary stream:', copyErr);
      const res = await fetch(sourceUriOrBase64);
      const buf = await res.arrayBuffer();
      if (!targetFile.exists) targetFile.create();
      targetFile.write(new Uint8Array(buf));
      return targetFile.uri;
    }
  } else {
    // It's a base64 string
    const bytes = decodeBase64ToUint8Array(sourceUriOrBase64);
    if (!targetFile.exists) targetFile.create();
    targetFile.write(bytes);
    return targetFile.uri;
  }
};

/**
 * Reads local file as Base64 string using the modern File API
 */
export const readFileAsBase64Async = async (fileUri: string): Promise<string> => {
  try {
    const file = new File(fileUri);
    return await file.base64();
  } catch (err) {
    console.warn('[fileSystemHelper] readFileAsBase64Async error:', err);
    throw err;
  }
};



