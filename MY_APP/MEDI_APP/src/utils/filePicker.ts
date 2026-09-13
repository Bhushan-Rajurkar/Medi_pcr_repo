import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

export interface PickedFile {
  uri: string;
  name: string;
  size: number;
  mimeType: string;
  base64?: string | null;
  file?: File; // Available on web
}

export const filePicker = {
  /**
   * Pick an image from gallery / photos (Prescription, Profile Picture)
   */
  async pickImage(): Promise<PickedFile | null> {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.85,
        base64: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return null;
      }

      const asset = result.assets[0];
      const name = asset.fileName || `photo_${Date.now()}.${asset.mimeType?.split('/')[1] || 'jpg'}`;
      const mimeType = asset.mimeType || 'image/jpeg';
      const size = asset.fileSize || 0;

      return {
        uri: asset.uri,
        name,
        size,
        mimeType,
        base64: asset.base64 || null,
        file: (asset as any).file instanceof File ? (asset as any).file : undefined,
      };
    } catch (err: any) {
      console.error('Image picker error:', err);
      throw new Error(err.message || 'Could not open image library');
    }
  },

  /**
   * Take a live photo with camera
   */
  async takePhoto(): Promise<PickedFile | null> {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Camera permission is required to take photos.');
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.85,
        base64: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return null;
      }

      const asset = result.assets[0];
      const name = asset.fileName || `camera_${Date.now()}.${asset.mimeType?.split('/')[1] || 'jpg'}`;
      const mimeType = asset.mimeType || 'image/jpeg';
      const size = asset.fileSize || 0;

      return {
        uri: asset.uri,
        name,
        size,
        mimeType,
        base64: asset.base64 || null,
        file: (asset as any).file instanceof File ? (asset as any).file : undefined,
      };
    } catch (err: any) {
      console.error('Camera error:', err);
      throw new Error(err.message || 'Could not launch camera');
    }
  },

  /**
   * Pick any medical document (PDF, PNG, JPG, DOCX, TXT, CSV)
   */
  async pickDocument(): Promise<PickedFile | null> {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'image/*',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain',
          'text/csv',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          '*/*',
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return null;
      }

      const asset = result.assets[0];
      const name = asset.name || `document_${Date.now()}`;
      const mimeType = asset.mimeType || 'application/octet-stream';
      const size = asset.size || 0;

      return {
        uri: asset.uri,
        name,
        size,
        mimeType,
        file: asset.file instanceof File ? asset.file : undefined,
      };
    } catch (err: any) {
      console.error('Document picker error:', err);
      throw new Error(err.message || 'Could not pick document');
    }
  },

  /**
   * Helper to append a picked file to FormData cleanly across Web, Android, and iOS
   */
  appendFile(formData: FormData, fieldName: string, picked: PickedFile | File) {
    if (Platform.OS === 'web') {
      if (picked instanceof File) {
        formData.append(fieldName, picked, picked.name);
        return;
      }
      if (picked && (picked as PickedFile).file instanceof File) {
        formData.append(fieldName, (picked as PickedFile).file!, (picked as PickedFile).name);
        return;
      }

      // If on Web and picked is a PickedFile with uri or base64
      if (typeof window !== 'undefined') {
        const pickedFile = picked as PickedFile;
        // If we have a base64 string
        if (pickedFile.base64) {
          try {
            const byteCharacters = atob(pickedFile.base64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: pickedFile.mimeType || 'application/octet-stream' });
            formData.append(fieldName, blob, pickedFile.name || 'file');
            return;
          } catch (e) {
            console.warn('Base64 decode failed for web formData:', e);
          }
        }

        // Try synchronous or native File object fallback if possible
        const blob = new Blob([], { type: pickedFile.mimeType || 'application/octet-stream' });
        const fallbackFile = new File([blob], pickedFile.name || 'file', {
          type: pickedFile.mimeType || 'application/octet-stream',
        });
        formData.append(fieldName, fallbackFile, pickedFile.name || 'file');
        return;
      }
    }

    // Native mobile (Android / iOS): React Native requires { uri, name, type }
    // In Expo SDK 52+, Expo's convertFormDataAsync also checks for 'bytes' in entry
    const pickedFile = picked as PickedFile;
    const nativeFile: any = {
      uri: pickedFile.uri,
      name: pickedFile.name || 'file',
      type: pickedFile.mimeType || 'application/octet-stream',
      bytes: async () => {
        try {
          const FileSystem = require('expo-file-system');
          const base64 = await FileSystem.readAsStringAsync(pickedFile.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          const binaryString = atob(base64);
          const len = binaryString.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          return bytes;
        } catch (e) {
          try {
            const resp = await fetch(pickedFile.uri);
            const arrayBuffer = await resp.arrayBuffer();
            return new Uint8Array(arrayBuffer);
          } catch (err) {
            console.warn('Could not read bytes for file part:', err);
            return new Uint8Array(0);
          }
        }
      },
    };
    formData.append(fieldName, nativeFile as any);
  },
};
