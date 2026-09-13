import { File, Paths } from 'expo-file-system';

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
    const binaryString = atob(base64Data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    file.write(bytes);
    return file.uri;
  } catch (err) {
    console.warn('[fileSystemHelper] writeBase64FileAsync error:', err);
    throw err;
  }
};

/**
 * Downloads a remote URL to a local destination file URI using the modern File API
 */
export const downloadFileAsync = async (remoteUrl: string, fileUriOrName: string): Promise<{ uri: string }> => {
  try {
    const file = fileUriOrName.startsWith('file:')
      ? new File(fileUriOrName)
      : new File(Paths.cache, fileUriOrName);
    await File.downloadFileAsync(remoteUrl, file, { idempotent: true });
    return { uri: file.uri };
  } catch (err) {
    console.warn('[fileSystemHelper] downloadFileAsync error:', err);
    throw err;
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

