import { Platform } from 'react-native';
import { StructuredDietPlanResult, aiDietService } from './aiDietService';
import { fileService, MedicalFile } from './fileService';
import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';

export interface SavedDietPlan {
  id: string;
  title: string;
  category: 'GAIN DIET' | 'LOSS DIET' | 'MODERATE DIET';
  savedAt: string;
  plan: StructuredDietPlanResult;
  cloudFileId?: number;
  cloudUrl?: string;
}

const STORAGE_KEY = 'medi_saved_diet_plans_v1';
const FILE_NAME = 'saved_diet_plans.json';

export const dietStorageService = {
  /**
   * Retrieves all saved diet plans from storage
   */
  async getSavedPlans(): Promise<SavedDietPlan[]> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          const raw = window.localStorage.getItem(STORAGE_KEY);
          if (raw) return JSON.parse(raw);
        }
        return [];
      } else {
        // Native mobile using Paths.document
        const file = new File(Paths.document, FILE_NAME);
        if (file.exists) {
          const text = await file.text();
          if (text) return JSON.parse(text);
        }
        return [];
      }
    } catch (err) {
      console.warn('[dietStorageService] Error loading saved plans:', err);
      return [];
    }
  },

  /**
   * Saves a diet plan into persistent local history
   */
  async savePlan(plan: StructuredDietPlanResult, customTitle?: string): Promise<SavedDietPlan> {
    const plans = await this.getSavedPlans();
    const cleanCategory = plan.category || 'MODERATE DIET';
    const title = customTitle || `7-Day ${cleanCategory} Plan (${new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })})`;

    const newRecord: SavedDietPlan = {
      id: `diet_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title,
      category: cleanCategory,
      savedAt: new Date().toISOString(),
      plan,
    };

    // Prepend to top
    const updated = [newRecord, ...plans];
    await this.persistPlans(updated);
    return newRecord;
  },

  /**
   * Deletes a saved diet plan by ID
   */
  async deletePlan(id: string): Promise<void> {
    const plans = await this.getSavedPlans();
    const updated = plans.filter((p) => p.id !== id);
    await this.persistPlans(updated);
  },

  /**
   * Uploads the generated 7-Day Diet Plan PDF to Cloud Storage (Cloudinary + backend Medical Records)
   */
  async uploadPlanToCloud(plan: StructuredDietPlanResult, customTitle?: string): Promise<MedicalFile> {
    const cleanCategory = (plan.category || 'Plan').replace(/\s+/g, '_');
    const fileName = `Medi_AI_Diet_Plan_${cleanCategory}_${Date.now()}.pdf`;
    const html = aiDietService.generatePlanPdfHtml(plan);

    // 1. Generate PDF with base64 data
    const printResult = await Print.printToFileAsync({ html, base64: true });
    let uploadable: any;

    if (Platform.OS === 'web') {
      // Convert base64 to Blob on Web
      const byteCharacters = atob(printResult.base64 || '');
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      uploadable = new Blob([byteArray], { type: 'application/pdf' });
      (uploadable as any).name = fileName;
    } else {
      // Native PickedFile structure
      uploadable = {
        uri: printResult.uri,
        name: fileName,
        mimeType: 'application/pdf',
        size: 10000,
        base64: printResult.base64,
      };
    }

    const reportTitle = customTitle || `7-Day ${plan.category} Plan (${new Date().toLocaleDateString()})`;
    const uploadedFile = await fileService.uploadFile(uploadable, reportTitle);

    // If matching local plan exists, link cloud URL
    try {
      const plans = await this.getSavedPlans();
      const updated = plans.map((p) => {
        if (p.plan.category === plan.category && !p.cloudUrl) {
          return { ...p, cloudFileId: uploadedFile.id, cloudUrl: uploadedFile.url };
        }
        return p;
      });
      await this.persistPlans(updated);
    } catch {
      // Non-blocking
    }

    return uploadedFile;
  },

  async persistPlans(plans: SavedDietPlan[]): Promise<void> {
    const json = JSON.stringify(plans);
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY, json);
      }
    } else {
      const file = new File(Paths.document, FILE_NAME);
      if (!file.exists) file.create();
      file.write(json);
    }
  },
};
