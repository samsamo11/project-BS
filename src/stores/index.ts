import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Language } from '@/lib/translations';

// ======== Store Versioning ========
// Increment this when store schema changes to trigger migration
const AUTH_STORE_VERSION = 1;
const SETTINGS_STORE_VERSION = 1;

// ======== Auth Store ========
interface AuthState {
  isAuthenticated: boolean;
  user: {
    id: string;
    username: string;
    fullName: string;
    role: 'admin' | 'user';
  } | null;
  setAuth: (user: { id: string; username: string; fullName: string; role: 'admin' | 'user' }) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,
      setAuth: (user) => set({ isAuthenticated: true, user }),
      clearAuth: () => set({ isAuthenticated: false, user: null }),
    }),
    {
      name: 'bs-auth',
      version: AUTH_STORE_VERSION,
      storage: createJSONStorage(() => {
        if (typeof window !== 'undefined') return localStorage;
        return {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        };
      }),
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
      }),
      // Migration: if version changes, reset the store
      migrate: (persisted, version) => {
        if (version !== AUTH_STORE_VERSION) {
          return { isAuthenticated: false, user: null };
        }
        return persisted as AuthState;
      },
    }
  )
);

// ======== Settings Store ========
interface SettingsState {
  language: Language;
  units: {
    dimension: string;
    area: string;
    load: string;
    stress: string;
    density: string;
  };
  setLanguage: (lang: Language) => void;
  setUnits: (units: SettingsState['units']) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      language: 'ar',
      units: {
        dimension: 'cm',
        area: 'm\u00B2',
        load: 'ton',
        stress: 'kg/cm\u00B2',
        density: 'kg/m\u00B3',
      },
      setLanguage: (language) => set({ language }),
      setUnits: (units) => set({ units }),
    }),
    {
      name: 'bs-evaluation-settings',
      version: SETTINGS_STORE_VERSION,
      storage: createJSONStorage(() => {
        if (typeof window !== 'undefined') return localStorage;
        return {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        };
      }),
      migrate: (persisted, version) => {
        if (version !== SETTINGS_STORE_VERSION) {
          return {
            language: 'ar' as Language,
            units: {
              dimension: 'cm',
              area: 'm\u00B2',
              load: 'ton',
              stress: 'kg/cm\u00B2',
              density: 'kg/m\u00B3',
            },
          };
        }
        return persisted as SettingsState;
      },
    }
  )
);

// ======== Project Store (NOT persisted — syncs from Supabase) ========
interface ProjectData {
  building_data: Record<string, unknown>;
  architectural_report: Record<string, unknown>;
  structural_report: Record<string, unknown>;
  foundations: Record<string, unknown>;
  columns_walls: Record<string, unknown>;
  beam_slab: Record<string, unknown>;
  electrical: Record<string, unknown>;
  plumbing: Record<string, unknown>;
  technical_notes: Record<string, unknown>;
  final_report: Record<string, unknown>;
}

interface ProjectStore {
  projects: Array<{
    id: string;
    user_id: string;
    name: string;
    is_current: boolean;
    created_at: string;
    updated_at: string;
  }>;
  currentProjectId: string | null;
  projectData: ProjectData;
  isLoading: boolean;
  setProjects: (projects: ProjectStore['projects']) => void;
  setCurrentProjectId: (id: string | null) => void;
  updateProjectData: (section: keyof ProjectData, data: Record<string, unknown>) => void;
  setLoading: (loading: boolean) => void;
  resetProjectData: () => void;
}

const defaultProjectData: ProjectData = {
  building_data: {},
  architectural_report: {},
  structural_report: {},
  foundations: {},
  columns_walls: {},
  beam_slab: {},
  electrical: {},
  plumbing: {},
  technical_notes: {},
  final_report: {},
};

export const useProjectStore = create<ProjectStore>()((set) => ({
  projects: [],
  currentProjectId: null,
  projectData: { ...defaultProjectData },
  isLoading: false,
  setProjects: (projects) => set({ projects }),
  setCurrentProjectId: (id) => set({ currentProjectId: id, projectData: { ...defaultProjectData } }),
  updateProjectData: (section, data) =>
    set((state) => ({
      projectData: { ...state.projectData, [section]: { ...state.projectData[section], ...data } },
    })),
  setLoading: (isLoading) => set({ isLoading }),
  resetProjectData: () => set({ projectData: { ...defaultProjectData } }),
}));

// ======== UI Store (NOT persisted — ephemeral UI state) ========
interface UIState {
  activeTab: string;
  sidebarOpen: boolean;
  setActiveTab: (tab: string) => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>()((set) => ({
  activeTab: 'buildingData',
  sidebarOpen: false,
  setActiveTab: (activeTab) => set({ activeTab }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
}));
