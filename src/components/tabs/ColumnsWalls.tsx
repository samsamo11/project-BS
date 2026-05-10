'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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
  Columns3,
  Plus,
  Trash2,
  Save,
  Edit3,
  CheckCircle,
  XCircle,
  ShieldCheck,
  AlertTriangle,
  Gauge,
  Ruler,
} from 'lucide-react';
import { checkColumnStress } from '@/lib/calculations';
import { useProjectStore } from '@/stores';

// ======== Types ========

interface ColumnWallEntry {
  id: string;
  elementType: 'عمود' | 'جدار';
  columnType: 'وسطي' | 'طرفي' | 'ركني' | '';
  floor: string;
  name: string;
  sectionWidth: string;
  sectionDepth: string;
  totalLoad: string;
  notes: string;
}

interface ColumnsWallsProps {
  data: Record<string, unknown>;
  onSave: (data: Record<string, unknown>) => void;
}

// ======== Constants ========

const ELEMENT_TYPES = ['عمود', 'جدار'] as const;
const COLUMN_TYPE_OPTIONS = ['وسطي', 'طرفي', 'ركني'] as const;

// ======== Helpers ========

const createEntry = (): ColumnWallEntry => ({
  id: crypto.randomUUID(),
  elementType: 'عمود',
  columnType: '',
  floor: '',
  name: '',
  sectionWidth: '',
  sectionDepth: '',
  totalLoad: '',
  notes: '',
});

function restoreEntry(raw: Record<string, unknown>): ColumnWallEntry {
  const elementTypes = ['عمود', 'جدار'];
  const columnTypes = ['وسطي', 'طرفي', 'ركني', ''];
  return {
    id: (raw.id as string) || crypto.randomUUID(),
    elementType: elementTypes.includes(raw.elementType as string)
      ? (raw.elementType as 'عمود' | 'جدار')
      : 'عمود',
    columnType: columnTypes.includes(raw.columnType as string)
      ? (raw.columnType as ColumnWallEntry['columnType'])
      : '',
    floor: (raw.floor as string) || '',
    name: (raw.name as string) || '',
    sectionWidth: String(raw.sectionWidth ?? ''),
    sectionDepth: String(raw.sectionDepth ?? ''),
    totalLoad: String(raw.totalLoad ?? ''),
    notes: (raw.notes as string) || '',
  };
}

// ======== Main Component ========

export default function ColumnsWalls({ data, onSave }: ColumnsWallsProps) {
  // Read f'c from structural report (hammer test)
  const structuralReport = useProjectStore((s) => s.projectData.structural_report);
  const fcFromReport = useMemo(() => {
    const sr = structuralReport as Record<string, unknown> | undefined;
    if (!sr) return 0;
    const hammerTest = sr.hammerTest as Record<string, unknown> | undefined;
    if (!hammerTest) return 0;
    return Number(hammerTest.fc) || 0;
  }, [structuralReport]);

  // ---- State ----
  const [isEditing, setIsEditing] = useState(true);

  const [entries, setEntries] = useState<ColumnWallEntry[]>(() => {
    if (Array.isArray(data.entries)) {
      return (data.entries as Record<string, unknown>[]).map(restoreEntry);
    }
    // Legacy support: old format stored under 'columns'
    if (Array.isArray(data.columns)) {
      return (data.columns as Record<string, unknown>[]).map(restoreEntry);
    }
    return [createEntry()];
  });

  // Sync state when data prop changes (project switch)
  const [prevData, setPrevData] = useState(data);
  if (prevData !== data) {
    setPrevData(data);
    if (Array.isArray(data.entries)) {
      setEntries((data.entries as Record<string, unknown>[]).map(restoreEntry));
    } else if (Array.isArray(data.columns)) {
      setEntries((data.columns as Record<string, unknown>[]).map(restoreEntry));
    }
  }

  // ---- Entry Actions ----
  const addEntry = useCallback(() => {
    setEntries((prev) => [...prev, createEntry()]);
  }, []);

  const removeEntry = useCallback((id: string) => {
    setEntries((prev) => (prev.length > 1 ? prev.filter((e) => e.id !== id) : prev));
  }, []);

  const updateEntry = useCallback(
    (id: string, field: keyof ColumnWallEntry, value: string) => {
      setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)));
    },
    [],
  );

  // ---- Computed Results ----
  const results = useMemo(() => {
    return entries.map((entry) => {
      const width = parseFloat(entry.sectionWidth) || 0;
      const depth = parseFloat(entry.sectionDepth) || 0;
      const load = parseFloat(entry.totalLoad) || 0;

      if (width <= 0 || depth <= 0 || load <= 0 || fcFromReport <= 0) {
        return { actualStress: 0, allowableStress: 0, safe: false, hasResult: false };
      }

      const check = checkColumnStress({
        load,
        width,
        depth,
        fc: fcFromReport,
      });

      return {
        actualStress: check.actual,
        allowableStress: check.allowable,
        safe: check.safe,
        hasResult: true,
      };
    });
  }, [entries, fcFromReport]);

  const safeCount = results.filter((r) => r.safe).length;
  const unsafeCount = results.filter((r) => r.hasResult && !r.safe).length;

  // ---- Save ----
  const handleSave = useCallback(() => {
    const payload = {
      entries: entries.map((e) => ({
        id: e.id,
        elementType: e.elementType,
        columnType: e.columnType,
        floor: e.floor,
        name: e.name,
        sectionWidth: e.sectionWidth,
        sectionDepth: e.sectionDepth,
        totalLoad: e.totalLoad,
        notes: e.notes,
      })),
    };
    onSave(payload);
    setIsEditing(false);
  }, [entries, onSave]);

  const handleEdit = useCallback(() => {
    setIsEditing(true);
  }, []);

  // ---- Render ----
  return (
    <div className="space-y-6">
      {/* ═══════ Section 1: تقييم الأعمدة والجدران ═══════ */}
      <Card className="border-emerald-200/50 shadow-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white pb-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-3 text-lg">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Columns3 className="h-5 w-5" />
              </div>
              <span>تقييم الأعمدة والجدران</span>
              <span className="text-xs font-normal opacity-80">وفقاً للكود السوري 2024</span>
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
          {/* f'c from structural report info */}
          {fcFromReport > 0 && (
            <div className="mb-5 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/50 bg-gradient-to-r from-emerald-50/80 to-teal-50/80 dark:from-emerald-950/20 dark:to-teal-950/20">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-sm text-foreground/90">
                  المقاومة الاسطوانية f&apos;c ={' '}
                  <span className="font-bold text-emerald-700 dark:text-emerald-400" dir="ltr">
                    {fcFromReport} كغ/سم²
                  </span>{' '}
                  (من تقرير تجربة المطرقة)
                </span>
              </div>
            </div>
          )}
          {fcFromReport <= 0 && (
            <div className="mb-5 p-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span className="text-sm text-amber-700 dark:text-amber-300">
                  لم يتم العثور على قيمة f&apos;c في تقرير تجربة المطرقة. يرجى إدخال البيانات في التقرير الإنشائي أولاً.
                </span>
              </div>
            </div>
          )}

          {/* Entries */}
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
                      {entry.elementType === 'عمود' ? 'عمود' : 'جدار'} #{index + 1}
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

                  {/* Fields Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Element Type */}
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">نوع العنصر</Label>
                      <Select
                        value={entry.elementType}
                        onValueChange={(val) => {
                          updateEntry(entry.id, 'elementType', val);
                          // Reset column type when switching to جدار
                          if (val === 'جدار') {
                            updateEntry(entry.id, 'columnType', '');
                          }
                        }}
                        disabled={!isEditing}
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ELEMENT_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Column Type (only for عمود) */}
                    {entry.elementType === 'عمود' && (
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">نوع العمود</Label>
                        <Select
                          value={entry.columnType}
                          onValueChange={(val) => updateEntry(entry.id, 'columnType', val)}
                          disabled={!isEditing}
                        >
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue placeholder="اختر نوع العمود" />
                          </SelectTrigger>
                          <SelectContent>
                            {COLUMN_TYPE_OPTIONS.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Floor */}
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">الطابق</Label>
                      <Input
                        value={entry.floor}
                        onChange={(e) => updateEntry(entry.id, 'floor', e.target.value)}
                        placeholder="ط1"
                        className="h-9 text-sm"
                        disabled={!isEditing}
                      />
                    </div>

                    {/* Name */}
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        اسم {entry.elementType === 'عمود' ? 'العمود' : 'الجدار'}
                      </Label>
                      <Input
                        value={entry.name}
                        onChange={(e) => updateEntry(entry.id, 'name', e.target.value)}
                        placeholder={entry.elementType === 'عمود' ? 'C1' : 'W1'}
                        className="h-9 text-sm"
                        disabled={!isEditing}
                      />
                    </div>

                    {/* Section Width */}
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">عرض المقطع (سم)</Label>
                      <Input
                        type="number"
                        value={entry.sectionWidth}
                        onChange={(e) => updateEntry(entry.id, 'sectionWidth', e.target.value)}
                        placeholder="0"
                        className="h-9 text-sm"
                        dir="ltr"
                        disabled={!isEditing}
                      />
                    </div>

                    {/* Section Depth */}
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">طول المقطع (سم)</Label>
                      <Input
                        type="number"
                        value={entry.sectionDepth}
                        onChange={(e) => updateEntry(entry.id, 'sectionDepth', e.target.value)}
                        placeholder="0"
                        className="h-9 text-sm"
                        dir="ltr"
                        disabled={!isEditing}
                      />
                    </div>

                    {/* Total Load */}
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">الحمولة الاستثمارية الكلية (طن)</Label>
                      <Input
                        type="number"
                        value={entry.totalLoad}
                        onChange={(e) => updateEntry(entry.id, 'totalLoad', e.target.value)}
                        placeholder="0"
                        className="h-9 text-sm"
                        dir="ltr"
                        disabled={!isEditing}
                      />
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
              إضافة عنصر جديد
            </Button>
          )}
        </CardContent>
      </Card>

      {/* ═══════ Section 2: النتائج — Results (Accordion) ═══════ */}
      {entries.some((_, i) => results[i]?.hasResult) && (
        <Card className="border-emerald-200/50 shadow-sm overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white pb-4">
            <CardTitle className="flex items-center gap-3 text-lg">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <span>نتائج فحص إجهاد الضغط</span>
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

                const entryName = entry.name || `${entry.elementType} #${index + 1}`;
                const subtitleParts = [
                  entry.elementType === 'عمود' && entry.columnType ? entry.columnType : '',
                  entry.floor ? `الطابق: ${entry.floor}` : '',
                ].filter(Boolean);
                const subtitle = subtitleParts.join(' — ');

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
                          {subtitle && (
                            <span className="text-xs text-muted-foreground block">{subtitle}</span>
                          )}
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-3 pb-3">
                      <div className="space-y-3">
                        {/* Actual Stress */}
                        <div className="flex items-center justify-between p-3 rounded-lg bg-background border">
                          <div className="flex items-center gap-2">
                            <Gauge className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">الإجهاد الفعلي</span>
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
                            <span className="text-sm text-muted-foreground">الإجهاد المسموح (0.3 × f&apos;c)</span>
                          </div>
                          <span
                            className="text-sm font-bold px-3 py-1 rounded-md bg-muted"
                            dir="ltr"
                          >
                            {result.allowableStress.toFixed(2)} كغ/سم²
                          </span>
                        </div>

                        {/* Section Dimensions */}
                        <div className="flex items-center justify-between p-3 rounded-lg bg-background border">
                          <div className="flex items-center gap-2">
                            <Ruler className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">أبعاد المقطع</span>
                          </div>
                          <span className="text-sm font-medium px-3 py-1 rounded-md bg-muted" dir="ltr">
                            {parseFloat(entry.sectionWidth) || 0} × {parseFloat(entry.sectionDepth) || 0} سم
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
                          <span className="text-lg">{result.safe ? '✅' : '❌'}</span>
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
                              {((result.actualStress / result.allowableStress) * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                result.safe ? 'bg-emerald-500' : 'bg-red-500'
                              }`}
                              style={{
                                width: `${Math.min((result.actualStress / result.allowableStress) * 100, 100)}%`,
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

      {/* ═══════ Bottom Buttons ═══════ */}
      <div className="flex justify-end gap-3">
        {!isEditing ? (
          <Button
            onClick={handleEdit}
            variant="outline"
            className="border-emerald-300 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 px-8"
          >
            <Edit3 className="h-4 w-4 me-2" />
            تعديل
          </Button>
        ) : (
          <Button
            onClick={handleSave}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md hover:shadow-lg transition-all duration-200 px-8"
          >
            <Save className="h-4 w-4 me-2" />
            حفظ
          </Button>
        )}
      </div>
    </div>
  );
}
