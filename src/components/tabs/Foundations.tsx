'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Layers,
  Plus,
  Trash2,
  Save,
  Edit3,
  CheckCircle,
  XCircle,
  ShieldCheck,
  AlertTriangle,
  Home,
  Ruler,
  Gauge,
} from 'lucide-react';
import { FOUNDATION_TYPES } from '@/lib/constants';
import { checkSoilStress } from '@/lib/calculations';
import { useProjectStore } from '@/stores';

// ======== Types ========
type FoundationType = (typeof FOUNDATION_TYPES)[number];

interface FoundationEntry {
  id: string;
  name: string;
  type: FoundationType;
  foundationDepth: string;
  length: string;
  width: string;
  height: string;
  totalLoad: string;
  notes: string;
}

interface FoundationsProps {
  data: Record<string, unknown>;
  onSave: (data: Record<string, unknown>) => void;
}

// ======== Helpers ========
const createEntry = (): FoundationEntry => ({
  id: crypto.randomUUID(),
  name: '',
  type: 'منفردة',
  foundationDepth: '',
  length: '',
  width: '',
  height: '',
  totalLoad: '',
  notes: '',
});

function restoreEntry(raw: Record<string, unknown>): FoundationEntry {
  return {
    id: (raw.id as string) || crypto.randomUUID(),
    name: (raw.name as string) || '',
    type: (FOUNDATION_TYPES as readonly string[]).includes(raw.type as string)
      ? (raw.type as FoundationType)
      : 'منفردة',
    foundationDepth: (raw.foundationDepth as string) || String(raw.foundationDepth ?? ''),
    length: (raw.length as string) || '',
    width: (raw.width as string) || '',
    height: (raw.height as string) || '',
    totalLoad: (raw.totalLoad as string) || '',
    notes: (raw.notes as string) || '',
  };
}

// ======== Component ========
export default function Foundations({ data, onSave }: FoundationsProps) {
  // Access structural report for auto-filling allowable bearing
  const structuralReport = useProjectStore((s) => s.projectData.structural_report);
  const soilAllowable = useMemo(() => {
    const sr = structuralReport as Record<string, unknown> | undefined;
    if (!sr) return 0;
    const soilReport = sr.soilReport as Record<string, unknown> | undefined;
    if (!soilReport) return 0;
    return Number(soilReport.allowableBearing) || 0;
  }, [structuralReport]);

  // ---- State ----
  const [isEditing, setIsEditing] = useState(true);

  const [hasBasement, setHasBasement] = useState<boolean>(
    Boolean(data.hasBasement)
  );
  const [basementDescription, setBasementDescription] = useState<string>(
    (data.basementDescription as string) || ''
  );

  const [allowableSoilStress, setAllowableSoilStress] = useState<string>(() => {
    // If user previously saved a value, use it; otherwise auto-fill from structural report
    const saved = data.allowableSoilStress;
    if (saved !== undefined && saved !== null && saved !== '') {
      return String(saved);
    }
    return soilAllowable > 0 ? String(soilAllowable) : '';
  });

  const [entries, setEntries] = useState<FoundationEntry[]>(() => {
    if (Array.isArray(data.foundations)) {
      return (data.foundations as Record<string, unknown>[]).map(restoreEntry);
    }
    // Legacy support: old format stored entries under 'entries' key
    if (Array.isArray(data.entries)) {
      return (data.entries as Record<string, unknown>[]).map(restoreEntry);
    }
    return [createEntry()];
  });

  // Sync state when data prop changes (project switch)
  const [prevData, setPrevData] = useState(data);
  if (prevData !== data) {
    setPrevData(data);
    setHasBasement(Boolean(data.hasBasement));
    setBasementDescription((data.basementDescription as string) || '');
    const saved = data.allowableSoilStress;
    if (saved !== undefined && saved !== null && saved !== '') {
      setAllowableSoilStress(String(saved));
    } else {
      setAllowableSoilStress(soilAllowable > 0 ? String(soilAllowable) : '');
    }
    if (Array.isArray(data.foundations)) {
      setEntries((data.foundations as Record<string, unknown>[]).map(restoreEntry));
    } else if (Array.isArray(data.entries)) {
      setEntries((data.entries as Record<string, unknown>[]).map(restoreEntry));
    }
  }

  // ---- Entry Actions ----
  const addEntry = useCallback(() => {
    setEntries((prev) => [...prev, createEntry()]);
  }, []);

  const removeEntry = useCallback((id: string) => {
    setEntries((prev) => (prev.length > 1 ? prev.filter((e) => e.id !== id) : prev));
  }, []);

  const updateEntry = useCallback((id: string, field: keyof FoundationEntry, value: string) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: value } : e))
    );
  }, []);

  // ---- Computed Results ----
  const allowable = parseFloat(allowableSoilStress) || 0;

  const results = useMemo(() => {
    return entries.map((entry) => {
      const length = parseFloat(entry.length) || 0;
      const width = parseFloat(entry.width) || 0;
      const load = parseFloat(entry.totalLoad) || 0;

      if (length <= 0 || width <= 0 || load <= 0 || allowable <= 0) {
        return { actualStress: 0, safe: false, hasResult: false };
      }

      const check = checkSoilStress({
        load,
        length,
        width,
        allowableStress: allowable,
      });

      return {
        actualStress: check.actual,
        safe: check.safe,
        hasResult: true,
      };
    });
  }, [entries, allowable]);

  const safeCount = results.filter((r) => r.safe).length;
  const unsafeCount = results.filter((r) => r.hasResult && !r.safe).length;

  // ---- Save ----
  const handleSave = useCallback(() => {
    const payload = {
      hasBasement,
      basementDescription,
      foundations: entries.map((e) => ({
        id: e.id,
        name: e.name,
        type: e.type,
        foundationDepth: e.foundationDepth,
        length: e.length,
        width: e.width,
        height: e.height,
        totalLoad: e.totalLoad,
        notes: e.notes,
      })),
      allowableSoilStress: allowableSoilStress,
    };
    onSave(payload);
    setIsEditing(false);
  }, [hasBasement, basementDescription, entries, allowableSoilStress, onSave]);

  const handleEdit = useCallback(() => {
    setIsEditing(true);
  }, []);

  return (
    <div className="space-y-6">
      {/* ============================================ */}
      {/* Section 1: معلومات عامة — General Info      */}
      {/* ============================================ */}
      <Card className="border-emerald-200/50 shadow-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white pb-4">
          <CardTitle className="flex items-center gap-3 text-lg">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Layers className="h-5 w-5" />
            </div>
            <span>تقييم الأساسات</span>
            <span className="text-xs font-normal opacity-80 me-auto">
              وفقاً للكود السوري 2024
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {/* Basement Toggle */}
          <div className="flex items-center justify-between rounded-xl border border-emerald-100 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20 p-4">
            <div className="flex items-center gap-3">
              <Home className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <div>
                <Label className="text-sm font-medium text-foreground/90">
                  يوجد قبو / ملجأ
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  تحديد ما إذا كان المبنى يحتوي على قبو أو ملجأ
                </p>
              </div>
            </div>
            <Switch
              checked={hasBasement}
              onCheckedChange={(checked) => {
                setHasBasement(checked);
                if (!checked) setBasementDescription('');
              }}
              disabled={!isEditing}
              className="data-[state=checked]:bg-emerald-600"
            />
          </div>

          {/* Basement Description — conditional */}
          {hasBasement && (
            <div className="mt-4 space-y-2 animate-in fade-in-0 slide-in-from-top-2 duration-200">
              <Label className="text-sm font-medium text-foreground/80">
                وصف القبو / الملجأ
              </Label>
              <Textarea
                value={basementDescription}
                onChange={(e) => setBasementDescription(e.target.value)}
                placeholder="أدخل وصف القبو أو الملجأ (الارتفاع، الاستخدام، الملاحظات)..."
                className="min-h-[80px] text-sm resize-y"
                rows={3}
                disabled={!isEditing}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* ============================================ */}
      {/* Section 2 & 3 & 4: بيانات الأساس            */}
      {/* ============================================ */}
      <Card className="border-emerald-200/50 shadow-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-teal-500 to-emerald-500 text-white pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3 text-lg">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Ruler className="h-5 w-5" />
              </div>
              <span>بيانات الأساسات</span>
            </CardTitle>
            <div className="flex items-center gap-2">
              {safeCount > 0 && (
                <span className="text-xs bg-emerald-400/30 px-2.5 py-1 rounded-full text-white font-medium">
                  آمن: {safeCount}
                </span>
              )}
              {unsafeCount > 0 && (
                <span className="text-xs bg-red-400/30 px-2.5 py-1 rounded-full text-white font-medium">
                  غير آمن: {unsafeCount}
                </span>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {/* ---- Soil Allowable Stress ---- */}
          <div className="mb-6 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/50 bg-gradient-to-r from-emerald-50/80 to-teal-50/80 dark:from-emerald-950/20 dark:to-teal-950/20">
            <div className="flex items-center gap-2 mb-2">
              <Gauge className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <Label className="text-sm font-semibold text-foreground/90">
                إجهاد التربة المسموح به
              </Label>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              {soilAllowable > 0
                ? `يتم التعبئة تلقائياً من تقرير التربة (${soilAllowable} كغ/سم²). يمكنك تعديل القيمة يدوياً.`
                : 'لم يتم العثور على بيانات إجهاد التربة في تقرير الإنشاءات. أدخل القيمة يدوياً.'}
            </p>
            <div className="max-w-xs">
              <Input
                type="number"
                value={allowableSoilStress}
                onChange={(e) => setAllowableSoilStress(e.target.value)}
                placeholder="مثال: 2.5"
                className="h-10 text-sm font-medium"
                dir="ltr"
                disabled={!isEditing}
              />
              <span className="text-[11px] text-muted-foreground mt-1 block">
                الوحدة: كغ/سم²
              </span>
            </div>
          </div>

          {/* ---- Foundation Entries ---- */}
          <div className="space-y-4">
            {entries.map((entry, index) => {
              const result = results[index];
              return (
                <div
                  key={entry.id}
                  className={`p-4 rounded-xl border transition-all duration-200 ${
                    result.hasResult
                      ? result.safe
                        ? 'border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20'
                        : 'border-red-200 bg-red-50/50 dark:bg-red-950/20'
                      : 'border-border bg-card'
                  }`}
                >
                  {/* Entry Header */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-1 rounded-md">
                      أساس #{index + 1}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:bg-destructive/10"
                      onClick={() => removeEntry(entry.id)}
                      disabled={entries.length <= 1 || !isEditing}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {/* Grid — Mobile-first responsive */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Name */}
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        اسم / رقم الأساس
                      </Label>
                      <Input
                        value={entry.name}
                        onChange={(e) => updateEntry(entry.id, 'name', e.target.value)}
                        placeholder={`F${index + 1}`}
                        className="h-9 text-sm"
                        disabled={!isEditing}
                      />
                    </div>

                    {/* Type */}
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        نوع الأساس
                      </Label>
                      <Select
                        value={entry.type}
                        onValueChange={(val) => updateEntry(entry.id, 'type', val)}
                        disabled={!isEditing}
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FOUNDATION_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Depth */}
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        عمق التأسيس
                      </Label>
                      <Input
                        type="number"
                        value={entry.foundationDepth}
                        onChange={(e) =>
                          updateEntry(entry.id, 'foundationDepth', e.target.value)
                        }
                        placeholder="0"
                        className="h-9 text-sm"
                        dir="ltr"
                        disabled={!isEditing}
                      />
                    </div>

                    {/* Height (optional) */}
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        الارتفاع <span className="text-[10px]">(اختياري)</span>
                      </Label>
                      <Input
                        type="number"
                        value={entry.height}
                        onChange={(e) => updateEntry(entry.id, 'height', e.target.value)}
                        placeholder="0"
                        className="h-9 text-sm"
                        dir="ltr"
                        disabled={!isEditing}
                      />
                    </div>

                    {/* Length */}
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        الطول (cm)
                      </Label>
                      <Input
                        type="number"
                        value={entry.length}
                        onChange={(e) => updateEntry(entry.id, 'length', e.target.value)}
                        placeholder="0"
                        className="h-9 text-sm"
                        dir="ltr"
                        disabled={!isEditing}
                      />
                    </div>

                    {/* Width */}
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        العرض (cm)
                      </Label>
                      <Input
                        type="number"
                        value={entry.width}
                        onChange={(e) => updateEntry(entry.id, 'width', e.target.value)}
                        placeholder="0"
                        className="h-9 text-sm"
                        dir="ltr"
                        disabled={!isEditing}
                      />
                    </div>

                    {/* Total Load */}
                    <div className="space-y-1 sm:col-span-2 lg:col-span-1">
                      <Label className="text-xs text-muted-foreground">
                        الحمولة الاستثمارية الكلية (طن)
                      </Label>
                      <Input
                        type="number"
                        value={entry.totalLoad}
                        onChange={(e) => updateEntry(entry.id, 'totalLoad', e.target.value)}
                        placeholder="0"
                        className="h-9 text-sm"
                        dir="ltr"
                        disabled={!isEditing}
                      />
                      <span className="text-[10px] text-muted-foreground">
                        الحمولة الميتة + الحمولة الحية
                      </span>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="mt-3 space-y-1">
                    <Label className="text-xs text-muted-foreground">ملاحظات</Label>
                    <Textarea
                      value={entry.notes}
                      onChange={(e) => updateEntry(entry.id, 'notes', e.target.value)}
                      placeholder="ملاحظات إضافية..."
                      className="min-h-[50px] text-sm resize-y"
                      rows={1}
                      disabled={!isEditing}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add Entry Button */}
          {isEditing && (
            <Button
              variant="outline"
              className="w-full mt-4 border-dashed border-2 border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:border-solid"
              onClick={addEntry}
            >
              <Plus className="h-4 w-4 me-2" />
              إضافة أساس جديد
            </Button>
          )}
        </CardContent>
      </Card>

      {/* ============================================ */}
      {/* Section 5: النتائج — Results (Accordion)     */}
      {/* ============================================ */}
      {entries.some((_, i) => results[i]?.hasResult) && (
        <Card className="border-emerald-200/50 shadow-sm overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white pb-4">
            <CardTitle className="flex items-center gap-3 text-lg">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <span>نتائج فحص إجهاد التربة</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {/* Summary Bar */}
            <div className="flex flex-wrap items-center gap-3 mb-5">
              {safeCount > 0 && (
                <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-3 py-1.5 rounded-lg">
                  <CheckCircle className="h-4 w-4" />
                  <span>{safeCount} آمن</span>
                </div>
              )}
              {unsafeCount > 0 && (
                <div className="flex items-center gap-1.5 text-sm font-medium text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-3 py-1.5 rounded-lg">
                  <XCircle className="h-4 w-4" />
                  <span>{unsafeCount} غير آمن</span>
                </div>
              )}
            </div>

            {/* Accordion Results */}
            <Accordion type="multiple" className="w-full space-y-2">
              {entries.map((entry, index) => {
                const result = results[index];
                if (!result?.hasResult) return null;

                const entryName = entry.name || `أساس #${index + 1}`;

                return (
                  <AccordionItem
                    key={entry.id}
                    value={entry.id}
                    className={`rounded-xl border-2 px-1 transition-colors ${
                      result.safe
                        ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/10'
                        : 'border-red-200 dark:border-red-800 bg-red-50/30 dark:bg-red-950/10'
                    }`}
                  >
                    <AccordionTrigger className="px-3 py-3 hover:no-underline">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                            result.safe
                              ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400'
                              : 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400'
                          }`}
                        >
                          {result.safe ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : (
                            <XCircle className="h-4 w-4" />
                          )}
                        </div>
                        <div className="text-start">
                          <span className="text-sm font-semibold">{entryName}</span>
                          <span className="text-xs text-muted-foreground block">
                            {entry.type}
                            {entry.foundationDepth ? ` — عمق: ${entry.foundationDepth} م` : ''}
                          </span>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-3 pb-3">
                      <div className="space-y-3">
                        {/* Actual Stress */}
                        <div className="flex items-center justify-between p-3 rounded-lg bg-background border">
                          <div className="flex items-center gap-2">
                            <Gauge className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              الإجهاد الفعلي
                            </span>
                          </div>
                          <span
                            className={`text-sm font-bold px-3 py-1 rounded-md ${
                              result.safe
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                                : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                            }`}
                            dir="ltr"
                          >
                            {result.actualStress.toFixed(2)} كغ/سم²
                          </span>
                        </div>

                        {/* Allowable Stress */}
                        <div className="flex items-center justify-between p-3 rounded-lg bg-background border">
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              الإجهاد المسموح
                            </span>
                          </div>
                          <span
                            className="text-sm font-bold px-3 py-1 rounded-md bg-muted"
                            dir="ltr"
                          >
                            {allowable.toFixed(2)} كغ/سم²
                          </span>
                        </div>

                        {/* Status */}
                        <div
                          className={`flex items-center justify-between p-3 rounded-lg border-2 ${
                            result.safe
                              ? 'bg-emerald-100/50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                              : 'bg-red-100/50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {result.safe ? (
                              <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                            )}
                            <span className="text-sm font-bold">
                              {result.safe ? 'آمن (محقق)' : 'غير آمن (غير محقق)'}
                            </span>
                          </div>
                          <span className="text-lg">
                            {result.safe ? '✅' : '❌'}
                          </span>
                        </div>

                        {/* Usage Ratio */}
                        <div className="p-3 rounded-lg bg-muted/50">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-muted-foreground">نسبة الإجهاد المستخدم</span>
                            <span
                              className={`text-xs font-bold ${
                                result.safe ? 'text-emerald-600' : 'text-red-600'
                              }`}
                              dir="ltr"
                            >
                              {((result.actualStress / allowable) * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                result.safe
                                  ? 'bg-emerald-500'
                                  : 'bg-red-500'
                              }`}
                              style={{
                                width: `${Math.min((result.actualStress / allowable) * 100, 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </CardContent>
        </Card>
      )}

      {/* ============================================ */}
      {/* Bottom Buttons                                */}
      {/* ============================================ */}
      <div className="flex justify-end gap-3">
        {!isEditing ? (
          <Button
            onClick={handleEdit}
            variant="outline"
            className="border-emerald-300 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 px-8"
          >
            <Edit3 className="h-4 w-4 me-2" />
            تعديل البيانات
          </Button>
        ) : (
          <Button
            onClick={handleSave}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md hover:shadow-lg transition-all duration-200 px-8"
          >
            <Save className="h-4 w-4 me-2" />
            حفظ البيانات
          </Button>
        )}
      </div>
    </div>
  );
}
