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
        formData.append(fieldName, picked);
        return;
      }
      if (picked.file instanceof File) {
        formData.append(fieldName, picked.file);
        return;
      }
    }

    // Native mobile (Android / iOS) or web fallback
    const nativeFile = {
      uri: (picked as PickedFile).uri,
      name: (picked as PickedFile).name || 'file',
      type: (picked as PickedFile).mimeType || 'application/octet-stream',
    };
    formData.append(fieldName, nativeFile as any);
  },
};
