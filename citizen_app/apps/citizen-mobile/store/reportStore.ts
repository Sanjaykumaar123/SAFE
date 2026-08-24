/**
 * In-progress hazard report draft — carries state across the multi-screen
 * report flow (camera -> preview -> analyze -> result -> form -> success)
 * so no data has to be re-entered or passed through fragile route params.
 */
import { create } from 'zustand';

import type { HazardTypeType } from '@/constants/hazardType';
import type { SeverityType } from '@/constants/severity';
import type { AIAnalysisResult } from '@/types';

interface CapturedMedia {
  uri: string;
  type: 'image' | 'video';
  width?: number;
  height?: number;
}

interface DraftLocation {
  latitude: number;
  longitude: number;
  locationText: string;
  isManuallyAdjusted: boolean;
}

interface ReportDraftState {
  media: CapturedMedia | null;
  location: DraftLocation | null;
  capturedAt: string | null;
  aiResult: AIAnalysisResult | null;
  aiError: string | null;
  hazardType: HazardTypeType;
  severity: SeverityType;
  description: string;

  setMedia: (media: CapturedMedia) => void;
  setLocation: (location: DraftLocation) => void;
  setCapturedAt: (iso: string) => void;
  setAiResult: (result: AIAnalysisResult | null) => void;
  setAiError: (message: string | null) => void;
  setHazardType: (type: HazardTypeType) => void;
  setSeverity: (severity: SeverityType) => void;
  setDescription: (description: string) => void;
  reset: () => void;
}

const initialState = {
  media: null,
  location: null,
  capturedAt: null,
  aiResult: null,
  aiError: null,
  hazardType: 'POTHOLE' as HazardTypeType,
  severity: 'MEDIUM' as SeverityType,
  description: '',
};

export const useReportStore = create<ReportDraftState>((set) => ({
  ...initialState,
  setMedia: (media) => set({ media }),
  setLocation: (location) => set({ location }),
  setCapturedAt: (capturedAt) => set({ capturedAt }),
  setAiResult: (aiResult) =>
    set((state) => ({
      aiResult,
      // Pre-fill the form fields from the AI result so "confirm" is a
      // one-tap path, while still leaving them editable (section 21/22).
      hazardType: aiResult?.hazardType ?? state.hazardType,
      severity: aiResult?.severity ?? state.severity,
    })),
  setAiError: (aiError) => set({ aiError }),
  setHazardType: (hazardType) => set({ hazardType }),
  setSeverity: (severity) => set({ severity }),
  setDescription: (description) => set({ description }),
  reset: () => set(initialState),
}));
