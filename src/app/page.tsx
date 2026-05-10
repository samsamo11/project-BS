'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, useProjectStore, useUIStore, waitForAuthHydration } from '@/stores';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import Image from 'next/image';
import {
  Building2,
  Columns3,
  Layers,
  ClipboardCheck,
  Settings,
  FileOutput,
  Info,
  Plus,
  Trash2,
  Edit3,
  LogOut,
  Shield,
  Menu,
  X,
  Database,
  DraftingCompass,
  PlugZap,
  Pipette,
  FileSpreadsheet,
  FileDown,
  AppWindow,
  ChevronDown,
  RefreshCw,
  Download,
  FolderOpen,
} from 'lucide-react';
import { toast } from 'sonner';

import BuildingInfo from '@/components/tabs/BuildingInfo';
import ArchitecturalReport from '@/components/tabs/ArchitecturalReport';
import StructuralReport from '@/components/tabs/StructuralReport';
import Foundations from '@/components/tabs/Foundations';
import ColumnsWalls from '@/components/tabs/ColumnsWalls';
import BeamSlab from '@/components/tabs/BeamSlab';
import ElectricalReport from '@/components/tabs/ElectricalReport';
import PlumbingReport from '@/components/tabs/PlumbingReport';
import TechnicalNotes from '@/components/tabs/TechnicalNotes';
import FinalReport from '@/components/tabs/FinalReport';
import GenerateReports from '@/components/tabs/GenerateReports';
import SettingsPanel from '@/components/tabs/SettingsPanel';
import AboutPanel from '@/components/tabs/AboutPanel';

export default function HomePage() {
  const router = useRouter();
  const { t, isRTL } = useTranslation();
  const { user, isAuthenticated, clearAuth } = useAuthStore();
  const { activeTab, setActiveTab, sidebarOpen, setSidebarOpen } = useUIStore();
  const {
    projects,
    setProjects,
    currentProjectId,
    setCurrentProjectId,
    projectData,
    updateProjectData,
    isLoading,
    setLoading,
  } = useProjectStore();

  const [mounted, setMounted] = useState(false);
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [editProjectId, setEditProjectId] = useState<string | null>(null);
  const [editProjectName, setEditProjectName] = useState('');
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null);
  const [showProjectsPanel, setShowProjectsPanel] = useState(false);
  const [accordionOpen, setAccordionOpen] = useState(true);

  // Wait for zustand persist rehydration before reading auth state.
  // This prevents a race condition where isAuthenticated defaults to false
  // and redirects to /login before localStorage values are loaded.
  useEffect(() => {
    let cancelled = false;
    waitForAuthHydration().then(() => {
      if (!cancelled) setMounted(true);
    });
    return () => { cancelled = true; };
  }, []);

  // Validate session with the server on mount.
  // This catches cases where localStorage says isAuthenticated=true
  // but the JWT cookie has expired or been invalidated.
  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    // Server-side validation: verify the cookie is still valid
    fetch('/api/auth/me?_t=' + Date.now(), { credentials: 'include' }).then((res) => {
      if (res.status === 401) {
        clearAuth();
        router.push('/login');
      }
    }).catch(() => {
      // Network error — keep existing state, will retry on next API call
    });
  }, [mounted, isAuthenticated, clearAuth, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchProjects();
    }
  }, [isAuthenticated]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/projects?_t=' + Date.now(), { credentials: 'include' });
      if (res.status === 401) {
        clearAuth();
        router.push('/login');
        return;
      }
      const data = await res.json();
      setProjects(data);

      // Set current project
      const current = data.find((p: { is_current: boolean }) => p.is_current);
      if (current) {
        setCurrentProjectId(current.id);
        loadProjectData(current.id);
      }
    } catch {
      toast.error('فشل جلب المشاريع');
    } finally {
      setLoading(false);
    }
  };

  const loadProjectData = async (projectId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      if (res.ok) {
        const data = await res.json();
        Object.keys(data).forEach((key) => {
          if (key !== 'id' && key !== 'user_id' && key !== 'name' && key !== 'is_current' && key !== 'created_at' && key !== 'updated_at') {
            updateProjectData(key as keyof typeof projectData, data[key] || {});
          }
        });
      }
    } catch {
      // silent fail — data is in local state
    }
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newProjectName.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error);
        return;
      }
      toast.success('تم إنشاء المشروع بنجاح');
      setShowNewProject(false);
      setNewProjectName('');
      fetchProjects();
    } catch {
      toast.error('فشل إنشاء المشروع');
    }
  };

  const handleSelectProject = async (projectId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_current: true }),
      });
      if (res.ok) {
        setCurrentProjectId(projectId);
        loadProjectData(projectId);
        // Optimistic update: reflect is_current in local project list
        setProjects(
          (useProjectStore.getState().projects || []).map((p) => ({
            ...p,
            is_current: p.id === projectId,
          }))
        );
      }
    } catch {
      // silent — project still switches in local state
    } finally {
      setShowProjectsPanel(false);
    }
  };

  const handleRenameProject = async () => {
    if (!editProjectName.trim() || !editProjectId) return;
    try {
      const res = await fetch(`/api/projects/${editProjectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editProjectName.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error);
        return;
      }
      toast.success('تم تعديل اسم المشروع');
      setEditProjectId(null);
      fetchProjects();
    } catch {
      toast.error('فشل تعديل المشروع');
    }
  };

  const handleDeleteProject = async () => {
    if (!deleteProjectId) return;
    try {
      const res = await fetch(`/api/projects/${deleteProjectId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error);
        return;
      }
      toast.success('تم حذف المشروع');
      setDeleteProjectId(null);
      fetchProjects();
    } catch {
      toast.error('فشل حذف المشروع');
    }
  };

  const handleSaveLocally = () => {
    const currentProject = projects.find((p: { id: string }) => p.id === currentProjectId);
    const data = {
      project: currentProject,
      projectData: projectData,
      savedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentProject?.name || 'project'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('تم الحفظ محلياً بنجاح');
  };

  const handleSaveToDB = async () => {
    if (!currentProjectId) {
      toast.error('لا يوجد مشروع محدد');
      return;
    }
    try {
      const res = await fetch(`/api/projects/${currentProjectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData),
      });
      if (res.ok) {
        toast.success('تم الحفظ في قاعدة البيانات بنجاح');
      } else {
        toast.error('فشل الحفظ في قاعدة البيانات');
      }
    } catch {
      toast.error('فشل الحفظ في قاعدة البيانات');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // silent
    }
    clearAuth();
    // Full reload to ensure cookie is cleared and SW cache is bypassed
    window.location.href = '/login';
  };

  // Auto-save project data
  const saveCurrentTab = useCallback(
    async (section: string, data: Record<string, unknown>) => {
      if (!currentProjectId || user?.role === 'admin') return;
      try {
        await fetch(`/api/projects/${currentProjectId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [section]: data }),
        });
      } catch {
        // silent fail — data is preserved in local state
      }
    },
    [currentProjectId, user?.role]
  );

  if (!mounted || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  const tabs = [
    { id: 'buildingData', label: t.buildingData, icon: Database },
    { id: 'architecturalReport', label: t.architecturalReport, icon: DraftingCompass },
    { id: 'structuralReport', label: t.structuralReport, icon: Building2 },
    { id: 'foundations', label: t.foundations, icon: Layers },
    { id: 'columnsWalls', label: t.columnsWalls, icon: Columns3 },
    { id: 'beamSlab', label: t.beamSlab, icon: Layers },
    { id: 'electricalReport', label: t.electricalReport, icon: PlugZap },
    { id: 'plumbingReport', label: t.plumbingReport, icon: Pipette },
    { id: 'technicalObservations', label: t.technicalObservations, icon: ClipboardCheck },
    { id: 'finalReport', label: t.finalReport, icon: FileSpreadsheet },
    { id: 'pdfExport', label: t.pdfExport, icon: FileDown },
    { id: 'settings', label: t.settings, icon: Settings },
    { id: 'about', label: t.about, icon: AppWindow },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'buildingData':
        return <BuildingInfo data={projectData.building_data} onSave={(d) => { updateProjectData('building_data', d); saveCurrentTab('building_data', d); }} />;
      case 'architecturalReport':
        return <ArchitecturalReport data={projectData.architectural_report} onSave={(d) => { updateProjectData('architectural_report', d); saveCurrentTab('architectural_report', d); }} />;
      case 'structuralReport':
        return <StructuralReport data={projectData.structural_report} onSave={(d) => { updateProjectData('structural_report', d); saveCurrentTab('structural_report', d); }} />;
      case 'foundations':
        return <Foundations data={projectData.foundations} onSave={(d) => { updateProjectData('foundations', d); saveCurrentTab('foundations', d); }} />;
      case 'columnsWalls':
        return <ColumnsWalls data={projectData.columns_walls} onSave={(d) => { updateProjectData('columns_walls', d); saveCurrentTab('columns_walls', d); }} />;
      case 'beamSlab':
        return <BeamSlab data={projectData.beam_slab} onSave={(d) => { updateProjectData('beam_slab', d); saveCurrentTab('beam_slab', d); }} />;
      case 'electricalReport':
        return <ElectricalReport data={projectData.electrical} onSave={(d) => { updateProjectData('electrical', d); saveCurrentTab('electrical', d); }} />;
      case 'plumbingReport':
        return <PlumbingReport data={projectData.plumbing} onSave={(d) => { updateProjectData('plumbing', d); saveCurrentTab('plumbing', d); }} />;
      case 'technicalObservations':
        return <TechnicalNotes data={projectData.technical_notes} onSave={(d) => { updateProjectData('technical_notes', d); saveCurrentTab('technical_notes', d); }} />;
      case 'finalReport':
        return <FinalReport data={projectData.final_report} onSave={(d) => { updateProjectData('final_report', d); saveCurrentTab('final_report', d); }} />;
      case 'pdfExport':
        return <GenerateReports projectData={projectData as unknown as Record<string, unknown>} />;
      case 'settings':
        return <SettingsPanel />;
      case 'about':
        return <AboutPanel />;
      default:
        return <BuildingInfo data={projectData.building_data} onSave={(d) => { updateProjectData('building_data', d); saveCurrentTab('building_data', d); }} />;
    }
  };

  const currentProject = projects.find((p: { id: string }) => p.id === currentProjectId);

  // Reusable project management section
  const renderProjectManagement = (onAfterSelect?: () => void) => (
    <div className="p-3 border-b">
      {/* Section Title */}
      <div className="flex items-center gap-2 mb-2">
        <Database className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
        <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">إدارة المشاريع</span>
      </div>

      {/* Action Buttons Grid */}
      <div className="grid grid-cols-2 gap-1.5 mb-2.5">
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-[10px] gap-1 leading-tight"
          onClick={handleSaveLocally}
          disabled={!currentProjectId}
        >
          <Download className="w-3.5 h-3.5 shrink-0" />
          <span>حفظ محلي</span>
        </Button>
        <Button
          size="sm"
          className="h-8 text-[10px] gap-1 leading-tight bg-emerald-600 hover:bg-emerald-700 text-white"
          onClick={handleSaveToDB}
          disabled={!currentProjectId}
        >
          <Database className="w-3.5 h-3.5 shrink-0" />
          <span>حفظ في قاعدة البيانات</span>
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-[10px] gap-1 leading-tight"
          onClick={() => setShowNewProject(true)}
        >
          <Plus className="w-3.5 h-3.5 shrink-0" />
          <span>مشروع جديد</span>
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-[10px] gap-1 leading-tight"
          onClick={fetchProjects}
        >
          <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${isLoading ? 'animate-spin' : ''}`} />
          <span>تحديث البيانات</span>
        </Button>
      </div>

      {/* Accordion Toggle */}
      <button
        onClick={() => setAccordionOpen(!accordionOpen)}
        className="flex items-center justify-between w-full py-1.5 px-2 rounded-md hover:bg-accent transition-all duration-200"
      >
        <span className="text-xs font-medium text-muted-foreground">{t.projects}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${
            accordionOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Accordion Content - Animated */}
      <div
        className={`grid transition-all duration-200 ease-in-out ${
          accordionOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
        style={{ transitionProperty: 'grid-template-rows, opacity' }}
      >
        <div className="overflow-hidden min-h-0">
          <div className="pt-1">
            <ScrollArea className="max-h-60">
              {projects.map((p: { id: string; name: string; is_current: boolean }) => (
                <div
                  key={p.id}
                  className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-sm transition-all duration-150 mb-0.5 group ${
                    p.id === currentProjectId
                      ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800'
                      : 'hover:bg-accent'
                  }`}
                >
                  {/* Load/Select Button */}
                  <button
                    className="flex items-center gap-2 flex-1 min-w-0 rounded-sm"
                    onClick={() => {
                      handleSelectProject(p.id);
                      onAfterSelect?.();
                    }}
                    title="📂 تحميل المشروع"
                  >
                    <FolderOpen
                      className={`w-3.5 h-3.5 shrink-0 ${
                        p.id === currentProjectId
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-muted-foreground'
                      }`}
                    />
                    <span className="truncate text-xs">{p.name}</span>
                    {p.is_current && (
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    )}
                  </button>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      className="p-1 rounded hover:bg-accent/80 text-muted-foreground hover:text-foreground transition-all duration-150"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditProjectId(p.id);
                        setEditProjectName(p.name);
                      }}
                      title="✏️ تعديل"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                    <button
                      className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-600 dark:hover:text-red-400 transition-all duration-150"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteProjectId(p.id);
                      }}
                      title="🗑️ حذف"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
              {projects.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-3">{t.noProjects}</p>
              )}
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <header className="no-print sticky top-0 z-50 bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg">
        <div className="flex items-center justify-between px-3 py-2 sm:px-4 sm:py-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20 lg:hidden"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </Button>
            <Image
              src="/logo-header.png"
              alt="B.S"
              width={28}
              height={28}
              className="rounded shrink-0"
            />
            <div>
              <h1 className="text-sm sm:text-lg font-bold leading-tight">B.S Evaluation</h1>
              <p className="text-[10px] sm:text-xs opacity-80 leading-tight hidden sm:block">{t.appSubtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            {/* Project selector (mobile) */}
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 text-xs sm:text-sm"
              onClick={() => setShowProjectsPanel(true)}
            >
              <Building2 className="w-4 h-4 ms-1 sm:me-2 sm:ms-0" />
              <span className="hidden sm:inline max-w-[150px] truncate">
                {currentProject?.name || t.projects}
              </span>
              <span className="sm:hidden">...</span>
            </Button>

            {user?.role === 'admin' && (
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20"
                onClick={() => router.push('/admin')}
              >
                <Shield className="w-4 h-4 ms-1" />
                <span className="hidden sm:inline">{t.userManagement}</span>
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Desktop */}
        <aside className="no-print hidden lg:flex w-64 flex-col border-e bg-card border-sidebar-border overflow-y-auto shrink-0">
          {/* Project Management Accordion */}
          {renderProjectManagement()}

          <Separator />

          {/* Tab Navigation */}
          <ScrollArea className="flex-1 py-2 px-2">
            <nav className="space-y-0.5">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
                      isActive
                        ? 'bg-gradient-to-r from-emerald-500/15 to-teal-500/15 text-emerald-700 dark:text-emerald-400 font-medium shadow-sm'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : ''}`} />
                    <span className="truncate">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </ScrollArea>

          {/* User Info */}
          <div className="p-3 border-t">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white text-xs font-bold">
                {user?.fullName?.charAt(0) || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.fullName}</p>
                <p className="text-xs text-muted-foreground truncate">@{user?.username}</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div
            className="no-print fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <aside
              className="w-72 h-full bg-card border-e overflow-y-auto shadow-xl"
              dir={isRTL ? 'rtl' : 'ltr'}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Project Management Accordion */}
              {renderProjectManagement(() => setSidebarOpen(false))}

              <Separator />

              {/* Tab Navigation */}
              <ScrollArea className="flex-1 py-2 px-2 max-h-[calc(100vh-200px)]">
                <nav className="space-y-0.5">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => { setActiveTab(tab.id); setSidebarOpen(false); }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
                          activeTab === tab.id
                            ? 'bg-gradient-to-r from-emerald-500/15 to-teal-500/15 text-emerald-700 dark:text-emerald-400 font-medium'
                            : 'text-muted-foreground hover:bg-accent'
                        }`}
                      >
                        <Icon className={`w-4 h-4 shrink-0 ${activeTab === tab.id ? 'text-emerald-600 dark:text-emerald-400' : ''}`} />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </ScrollArea>
            </aside>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          {/* Mobile Scrollable Tab Bar */}
          <div className="no-print lg:hidden sticky top-0 z-30 bg-card/95 backdrop-blur border-b">
            <div className="overflow-x-auto scroll-smooth snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
              <div className="flex gap-1 p-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`snap-start flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-all duration-200 ${
                        isActive
                          ? 'bg-emerald-600 text-white shadow-md'
                          : 'bg-muted/60 text-muted-foreground hover:bg-accent hover:text-foreground'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="p-3 sm:p-4 md:p-6 max-w-7xl mx-auto" id="report-content">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-emerald-500 border-t-transparent" />
              </div>
            ) : (
              renderTabContent()
            )}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Nav - UNCHANGED */}
      <nav className="no-print lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border px-2 py-1 flex justify-around safe-area-bottom">
        <button onClick={() => setShowProjectsPanel(true)} className="flex flex-col items-center gap-0.5 py-1 px-2 text-muted-foreground">
          <Building2 className="w-5 h-5" />
          <span className="text-[10px]">{t.projects}</span>
        </button>
        <button onClick={() => setActiveTab('pdfExport')} className="flex flex-col items-center gap-0.5 py-1 px-2 text-muted-foreground">
          <FileOutput className="w-5 h-5" />
          <span className="text-[10px]">{t.pdfExport}</span>
        </button>
        <button onClick={() => setActiveTab('settings')} className="flex flex-col items-center gap-0.5 py-1 px-2 text-muted-foreground">
          <Settings className="w-5 h-5" />
          <span className="text-[10px]">{t.settings}</span>
        </button>
        <button onClick={() => setActiveTab('about')} className="flex flex-col items-center gap-0.5 py-1 px-2 text-muted-foreground">
          <Info className="w-5 h-5" />
          <span className="text-[10px]">{t.about}</span>
        </button>
      </nav>

      {/* New Project Dialog */}
      <Dialog open={showNewProject} onOpenChange={setShowNewProject}>
        <DialogContent dir={isRTL ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle>{t.newProject}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>{t.projectName}</Label>
              <Input
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder={t.projectName}
                className="mt-1"
                onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewProject(false)}>
              {t.cancel}
            </Button>
            <Button onClick={handleCreateProject} disabled={!newProjectName.trim()}>
              {t.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Project Dialog */}
      <Dialog open={!!editProjectId} onOpenChange={() => setEditProjectId(null)}>
        <DialogContent dir={isRTL ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle>{t.edit}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>{t.projectName}</Label>
              <Input
                value={editProjectName}
                onChange={(e) => setEditProjectName(e.target.value)}
                className="mt-1"
                onKeyDown={(e) => e.key === 'Enter' && handleRenameProject()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditProjectId(null)}>
              {t.cancel}
            </Button>
            <Button onClick={handleRenameProject} disabled={!editProjectName.trim()}>
              {t.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteProjectId} onOpenChange={() => setDeleteProjectId(null)}>
        <AlertDialogContent dir={isRTL ? 'rtl' : 'ltr'}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.confirmDelete}</AlertDialogTitle>
            <AlertDialogDescription>{t.confirm}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProject} className="bg-destructive text-white">
              {t.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Projects Panel (Mobile) - with Project Management */}
      <Dialog open={showProjectsPanel} onOpenChange={setShowProjectsPanel}>
        <DialogContent dir={isRTL ? 'rtl' : 'ltr'} className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              {t.projects}
            </DialogTitle>
          </DialogHeader>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <Button
              size="sm"
              variant="outline"
              className="h-9 text-xs gap-1.5"
              onClick={handleSaveLocally}
              disabled={!currentProjectId}
            >
              <Download className="w-4 h-4 shrink-0" />
              <span>حفظ محلي</span>
            </Button>
            <Button
              size="sm"
              className="h-9 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleSaveToDB}
              disabled={!currentProjectId}
            >
              <Database className="w-4 h-4 shrink-0" />
              <span>حفظ في قاعدة البيانات</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-9 text-xs gap-1.5"
              onClick={() => { setShowProjectsPanel(false); setShowNewProject(true); }}
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>مشروع جديد</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-9 text-xs gap-1.5"
              onClick={fetchProjects}
            >
              <RefreshCw className={`w-4 h-4 shrink-0 ${isLoading ? 'animate-spin' : ''}`} />
              <span>تحديث البيانات</span>
            </Button>
          </div>

          <Separator className="mb-2" />

          {/* Project List with Accordion */}
          <div className="max-h-72 overflow-y-auto">
            <button
              onClick={() => setAccordionOpen(!accordionOpen)}
              className="flex items-center justify-between w-full py-2 px-3 rounded-md hover:bg-accent transition-all duration-200 mb-1"
            >
              <span className="text-sm font-medium text-muted-foreground">المشاريع المحفوظة ({projects.length})</span>
              <ChevronDown
                className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${
                  accordionOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            <div
              className={`grid transition-all duration-200 ease-in-out ${
                accordionOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
              }`}
              style={{ transitionProperty: 'grid-template-rows, opacity' }}
            >
              <div className="overflow-hidden min-h-0">
                <div className="space-y-1.5">
                  {projects.map((p: { id: string; name: string; is_current: boolean }) => (
                    <div
                      key={p.id}
                      className={`flex items-center justify-between p-3 rounded-lg transition-all duration-150 ${
                        p.id === currentProjectId
                          ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800'
                          : 'hover:bg-accent border border-transparent'
                      }`}
                    >
                      <button
                        className="flex items-center gap-2 flex-1 min-w-0"
                        onClick={() => handleSelectProject(p.id)}
                        title="📂 تحميل المشروع"
                      >
                        <FolderOpen
                          className={`w-4 h-4 shrink-0 ${
                            p.id === currentProjectId
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-muted-foreground'
                          }`}
                        />
                        <span className="truncate text-sm">{p.name}</span>
                        {p.is_current && (
                          <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                        )}
                      </button>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditProjectId(p.id);
                            setEditProjectName(p.name);
                            setShowProjectsPanel(false);
                          }}
                          title="✏️ تعديل"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteProjectId(p.id);
                            setShowProjectsPanel(false);
                          }}
                          title="🗑️ حذف"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {projects.length === 0 && (
                    <p className="text-center text-muted-foreground py-4 text-sm">{t.noProjects}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bottom padding for mobile nav */}
      <div className="h-16 lg:hidden" />
    </div>
  );
}
