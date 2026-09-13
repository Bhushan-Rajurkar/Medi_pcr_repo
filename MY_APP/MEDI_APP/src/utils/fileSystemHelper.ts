/**
 * Safe FileSystem bridge for Expo across SDK versions.
 * In Expo SDK 54+, async methods like writeAsStringAsync, downloadAsync,
 * and readAsStringAsync are exported via 'expo-file-system/legacy'.
 */

let cachedFs: any = null;

export const getFileSystem = (): any => {
  if (cachedFs) return cachedFs;
  try {
    // Expo SDK 54+ legacy export
    cachedFs = require('expo-file-system/legacy');
    return cachedFs;
  } catch {
    try {
      cachedFs = require('expo-file-system');
      return cachedFs;
    } catch (err) {
      console.warn('[fileSystemHelper] Neither expo-file-system/legacy nor expo-file-system could be loaded:', err);
      return null;
    }
  }
};

/**
 * Returns a local writable directory path (with trailing slash)
 */
export const getSafeDirectory = (): string => {
  const fs = getFileSystem();
  return (fs?.cacheDirectory || fs?.documentDirectory || '');
};

/**
 * Writes UTF-8 text content to a local file
 */
export const writeTextFileAsync = async (fileUri: string, content: string): Promise<void> => {
  const fs = getFileSystem();
  if (!fs?.writeAsStringAsync) {
    throw new Error('FileSystem.writeAsStringAsync is not available on this platform.');
  }
  const encoding = fs.EncodingType?.UTF8 || 'utf8';
  await fs.writeAsStringAsync(fileUri, content, { encoding });
};

/**
 * Writes Base64 encoded data to a local file
 */
export const writeBase64FileAsync = async (fileUri: string, base64Data: string): Promise<void> => {
  const fs = getFileSystem();
  if (!fs?.writeAsStringAsync) {
    throw new Error('FileSystem.writeAsStringAsync is not available on this platform.');
  }
  const encoding = fs.EncodingType?.Base64 || 'base64';
  await fs.writeAsStringAsync(fileUri, base64Data, { encoding });
};

/**
 * Downloads a remote URL to a local destination file URI
 */
export const downloadFileAsync = async (remoteUrl: string, fileUri: string): Promise<any> => {
  const fs = getFileSystem();
  if (fs?.downloadAsync) {
    return await fs.downloadAsync(remoteUrl, fileUri);
  }
  // Fallback using fetch
  const response = await fetch(remoteUrl);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const result = reader.result as string;
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        await writeBase64FileAsync(fileUri, base64);
        resolve({ uri: fileUri, status: 200 });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 * Reads local file as Base64 string
 */
export const readFileAsBase64Async = async (fileUri: string): Promise<string> => {
  const fs = getFileSystem();
  if (fs?.readAsStringAsync) {
    const encoding = fs.EncodingType?.Base64 || 'base64';
    return await fs.readAsStringAsync(fileUri, { encoding });
  }
  throw new Error('FileSystem.readAsStringAsync is not available on this platform.');
};
