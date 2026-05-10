/**
 * B.S Evaluation — Engineering Calculation Engine
 * Working Stress Design (WSD) — Syrian Arab Code 2024
 * طريقة التشغيل (الكلاسيكية) — الوحدات: كغ/سم² , طن , سم
 */

import { WSD, SLAB_ALPHA, BEAM_ALPHA } from './constants';

// ===================================================================
// أنواع النتائج
// ===================================================================
export interface CalcResult {
  safe: boolean;
  status: 'محقق' | 'غير محقق';
  statusAr: string;
}

export interface SlabThicknessResult extends CalcResult {
  hMin: number;
  hActual: number;
  formula: string;
}

export interface StressCheckResult extends CalcResult {
  actual: number;
  allowable: number;
  ratio: number;
}

export interface PunchingShearResult extends CalcResult {
  vp: number;
  actualStress: number;
  bo: number;
  formula: string;
}

export interface FlexureCheckResult extends CalcResult {
  kd: number;
  jd: number;
  fc: number;
  fs: number;
  fcAllowable: number;
  fsAllowable: number;
  n: number;
  overReinforced: boolean;
}

export interface ShearCheckResult extends CalcResult {
  v: number;
  vc: number;
  vmax: number;
  stirrupsNeeded: boolean;
}

export interface StirrupResult {
  spacing: number;
  spacingMax: number;
  useSmax: boolean;
  areaRequired: number;
  areaProvided: number;
  safe: boolean;
}

// ===================================================================
// 1. شرط السماكة — Slab & Beam Minimum Thickness
// ===================================================================

/**
 * فحص شرط السماكة للبلاطات
 */
export function checkSlabThickness(params: {
  slabType: 'oneWaySolid' | 'twoWaySolid' | 'oneWayRibbed' | 'twoWayRibbed' | 'flatSlab';
  supportCondition: string;
  span: number;        // المجاز (سم)
  hActual: number;     // السماكة المنفذة (سم)
  spanLong?: number;   // المجاز الطويل للبلاطة باتجاهين
  spanShort?: number;  // المجاز القصير للبلاطة باتجاهين
}): SlabThicknessResult {
  const { slabType, supportCondition, span, hActual, spanLong, spanShort } = params;
  let hMin: number;
  let formula: string;

  const conditionMap: Record<string, string> = {
    'بسيط': 'simple',
    'مستمر من طرف واحد': 'oneEndContinuous',
    'مستمر من طرفين': 'bothEndsContinuous',
    'كابولي حر': 'cantilever',
  };

  const condKey = conditionMap[supportCondition] || 'simple';

  if (slabType === 'oneWaySolid') {
    const alpha = SLAB_ALPHA.oneWaySolid[condKey as keyof typeof SLAB_ALPHA.oneWaySolid] || 20;
    hMin = span / alpha;
    formula = `h = L/${alpha} = ${span}/${alpha} = ${hMin.toFixed(1)} سم`;
  } else if (slabType === 'twoWaySolid') {
    if (supportCondition === 'بسيط' || supportCondition === 'simple') {
      hMin = (spanLong || span) / SLAB_ALPHA.twoWaySolid.simple;
      formula = `h = L/${SLAB_ALPHA.twoWaySolid.simple}`;
    } else {
      const lLong = spanLong || span;
      const lShort = spanShort || span;
      // محيط المكافئ / 140
      // معامل ألفا حسب الاستناد
      const alphaSimple = 20;
      const alphaCont = 28;
      const alpha = supportCondition === 'مستمرة من طرفين' ? alphaCont : alphaSimple;
      const perimeter = (alpha * lLong + alpha * lShort);
      // طريقة مبسطة: h = (α×Llong + α×Lshort) / 140
      hMin = perimeter / 140;
      formula = `h = المحيط المكافئ / 140`;
    }
  } else if (slabType === 'oneWayRibbed') {
    const alpha = SLAB_ALPHA.oneWayRibbed[condKey as keyof typeof SLAB_ALPHA.oneWayRibbed] || 20;
    hMin = span / alpha;
    formula = `h = L/${alpha} = ${span}/${alpha} = ${hMin.toFixed(1)} سم`;
  } else if (slabType === 'twoWayRibbed') {
    if (supportCondition === 'بسيط' || supportCondition === 'simple') {
      hMin = span / SLAB_ALPHA.twoWayRibbed.simple;
    } else {
      hMin = span / SLAB_ALPHA.twoWayRibbed.continuous;
    }
    formula = `h = L/α`;
  } else if (slabType === 'flatSlab') {
    // بلاطة فطرية
    if (supportCondition === 'مع تيجان' || supportCondition === 'withDropPanels') {
      hMin = span / SLAB_ALPHA.flatSlab.withDropPanels;
      formula = `h = Lmax/${SLAB_ALPHA.flatSlab.withDropPanels}`;
    } else {
      hMin = span / SLAB_ALPHA.flatSlab.withoutDropPanels;
      formula = `h = Lmax/${SLAB_ALPHA.flatSlab.withoutDropPanels}`;
    }
  } else {
    hMin = span / 20;
    formula = `h = L/20`;
  }

  const safe = hActual >= hMin;

  return {
    safe,
    status: safe ? 'محقق' : 'غير محقق',
    statusAr: safe ? 'محقق ✅' : 'غير محقق ❌',
    hMin: Math.round(hMin * 100) / 100,
    hActual,
    formula,
  };
}

/**
 * فحص شرط السماكة للجوائز الساقطة
 */
export function checkBeamThickness(params: {
  supportCondition: string;
  span: number;
  hActual: number;
}): SlabThicknessResult {
  const { supportCondition, span, hActual } = params;

  const conditionMap: Record<string, string> = {
    'بسيط': 'simple',
    'مستمر من طرف واحد': 'oneEndContinuous',
    'مستمر من طرفين': 'bothEndsContinuous',
    'كابولي حر': 'cantilever',
  };

  const condKey = conditionMap[supportCondition] || 'simple';
  const alpha = BEAM_ALPHA[condKey as keyof typeof BEAM_ALPHA] || 16;
  const hMin = span / alpha;

  const safe = hActual >= hMin;

  return {
    safe,
    status: safe ? 'محقق' : 'غير محقق',
    statusAr: safe ? 'محقق ✅' : 'غير محقق ❌',
    hMin: Math.round(hMin * 100) / 100,
    hActual,
    formula: `h = L/${alpha} = ${span}/${alpha} = ${hMin.toFixed(1)} سم`,
  };
}

// ===================================================================
// 2. فحص الإجهاد — Stress Checks (WSD)
// ===================================================================

/**
 * فحص إجهاد التربة للأساسات
 * Actual Stress = Load × 1000 / (L × W)
 */
export function checkSoilStress(params: {
  load: number;     // الحمولة (طن)
  length: number;   // الطول (سم)
  width: number;    // العرض (سم)
  allowableStress: number; // إجهاد التربة المسموح (كغ/سم²)
}): StressCheckResult {
  const { load, length, width, allowableStress } = params;
  const area = length * width;
  const actual = (load * 1000) / area; // تحويل الطن إلى كغ
  const safe = actual <= allowableStress;

  return {
    safe,
    status: safe ? 'محقق' : 'غير محقق',
    statusAr: safe ? 'آمن (محقق) ✅' : 'غير آمن (غير محقق) ❌',
    actual: Math.round(actual * 100) / 100,
    allowable: allowableStress,
    ratio: Math.round((actual / allowableStress) * 100) / 100,
  };
}

/**
 * فحص إجهاد الضغط للأعمدة — WSD
 * الإجهاد المسموح = 0.3 × f'c
 */
export function checkColumnStress(params: {
  load: number;     // الحمولة الاستثمارية (طن)
  width: number;    // عرض المقطع (سم)
  depth: number;    // طول المقطع (سم)
  fc: number;       // المقاومة الاسطوانية (كغ/سم²)
}): StressCheckResult {
  const { load, width, depth, fc } = params;
  const area = width * depth;
  const actual = (load * 1000) / area; // كغ/سم²
  const allowable = WSD.fc_allowable_axial * fc; // 0.3 × f'c
  const safe = actual <= allowable;

  return {
    safe,
    status: safe ? 'محقق' : 'غير محقق',
    statusAr: safe ? 'آمن (محقق) ✅' : 'غير آمن (غير محقق) ❌',
    actual: Math.round(actual * 100) / 100,
    allowable: Math.round(allowable * 100) / 100,
    ratio: Math.round((actual / allowable) * 100) / 100,
  };
}

// ===================================================================
// 3. فحص الانعطاف (العزم) — Flexure Check (WSD)
// ===================================================================

/**
 * فحص الانعطاف للبلاطات والجوائز — طريقة التشغيل WSD
 * n = kd / (d - kd) → n×d = kd + n×kd → kd = n×d / (n + ρ×n) → مبسط
 * fc = M × kd / (I) ≤ 0.45 f'c
 * fs = n × M × (d - kd) / (I) ≤ 0.4 fy
 */
export function checkFlexure(params: {
  moment: number;    // العزم المطبق (طن.سم)
  width: number;     // عرض المقطع (سم)
  effectiveDepth: number; // العمق الفعال d (سم)
  As: number;        // مساحة التسليح (سم²)
  fc: number;        // f'c (كغ/سم²)
  fy: number;        // fy (كغ/سم²)
  isSlab?: boolean;  // هل بلاطة (عرض = 100 سم)؟
}): FlexureCheckResult {
  const { moment, width, effectiveDepth: d, As, fc, fy, isSlab } = params;

  const n = WSD.getN(fc);
  const b = isSlab ? 100 : width; // عرض البلاطة = 100 سم
  const M = moment * 1000; // تحويل طن.سم إلى كغ.سم

  // ρ = As / (b × d)
  const rho = As / (b * d);
  // k = √(2nρ + (nρ)²) - nρ
  const nRho = n * rho;
  const k = Math.sqrt(2 * nRho + nRho * nRho) - nRho;
  const kd = k * d;
  const jd = d - kd / 3;

  // عزم القصور الذاتي I = b × (kd)³ / 3 + n × As × (d - kd)²
  const I = (b * Math.pow(kd, 3)) / 3 + n * As * Math.pow(d - kd, 2);

  // إجهادات فعلية
  const fcStress = M * kd / I; // إجهاد الخرسانة (كغ/سم²)
  const fsStress = n * M * (d - kd) / I; // إجهاد الحديد (كغ/سم²)

  // إجهادات مسموحة
  const fcAllowable = WSD.fc_allowable_flexure * fc; // 0.45 f'c
  const fsAllowable = WSD.getFsAllowable(fy); // 0.4 fy

  // فحص التسليح الزائد (over-reinforced)
  const overReinforced = k > 0.375; // n×ρ كبير جداً

  const safe = fcStress <= fcAllowable && fsStress <= fsAllowable;

  return {
    safe: !overReinforced && safe,
    status: !overReinforced && safe ? 'محقق' : 'غير محقق',
    statusAr: !overReinforced && safe ? 'محقق ✅' : 'غير محقق ❌',
    kd: Math.round(kd * 100) / 100,
    jd: Math.round(jd * 100) / 100,
    fc: Math.round(fcStress * 100) / 100,
    fs: Math.round(fsStress * 100) / 100,
    fcAllowable: Math.round(fcAllowable * 100) / 100,
    fsAllowable: Math.round(fsAllowable * 100) / 100,
    n,
    overReinforced,
  };
}

// ===================================================================
// 4. فحص القص — Shear Check (WSD)
// ===================================================================

/**
 * فحص القص — WSD
 * v = V / (b × d)
 * vc = 0.5√f'c
 * vmax = 2.5√f'c
 */
export function checkShear(params: {
  shear: number;       // قوة القص (طن)
  width: number;       // عرض المقطع b (سم)
  effectiveDepth: number; // العمق الفعال d (سم)
  fc: number;          // f'c (كغ/سم²)
}): ShearCheckResult {
  const { shear, width, effectiveDepth: d, fc } = params;

  const V = shear * 1000; // تحويل إلى كغ
  const v = V / (width * d); // إجهاد القص الفعلي (كغ/سم²)
  const vc = WSD.vc(fc); // مقاومة الخرسانة للقص
  const vmax = WSD.vmax(fc); // الإجهاد الأقصى

  const stirrupsNeeded = v > vc;
  const sectionSafe = v <= vmax;
  const safe = sectionSafe;

  return {
    safe,
    status: safe ? 'محقق' : 'غير محقق',
    statusAr: sectionSafe ? 'محقق ✅' : 'غير محقق — يحتاج إعادة تصميم المقطع ❌',
    v: Math.round(v * 100) / 100,
    vc: Math.round(vc * 100) / 100,
    vmax: Math.round(vmax * 100) / 100,
    stirrupsNeeded,
  };
}

// ===================================================================
// 5. حساب الأطواق — Stirrup Calculation (WSD)
// ===================================================================

/**
 * حساب مساحة وتباعد الأطواق
 */
export function calculateStirrups(params: {
  shear: number;           // قوة القص (طن)
  width: number;           // عرض المقطع b (سم)
  effectiveDepth: number;  // العمق الفعال d (سم)
  fc: number;              // f'c (كغ/سم²)
  fy: number;              // fy (كغ/سم²)
  stirrupDiameter: number; // قطر الأسوار (مم)
  stirrupLegs: number;     // عدد فروع الأسوار
}): StirrupResult {
  const { shear, width, effectiveDepth: d, fc, fy, stirrupDiameter, stirrupLegs } = params;

  const V = shear * 1000;
  const v = V / (width * d);
  const vc = WSD.vc(fc);
  const Vs = Math.max(V - vc * width * d, 0); // قوة القص التي يتحملها التسليح

  // مساحة التسليح المطلوبة للأطواق
  const Av_required = Vs / (WSD.getFsAllowable(fy) * d);

  // مساحة التسليح المتوفرة
  const singleBarArea = (Math.PI / 4) * Math.pow(stirrupDiameter / 10, 2); // ملم² إلى سم²
  const Av_provided = singleBarArea * stirrupLegs;

  // التباعد المطلوب
  const s = Av_provided > 0 ? (Av_provided * WSD.getFsAllowable(fy) * d) / Vs : 999;

  // التباعد الأقصى المسموح
  const smax = Math.min(d / 2, 60); // أصغر من d/2 أو 60 سم

  // استخدام التباعد الأقصى
  const useSmax = s >= smax;
  const finalSpacing = useSmax ? smax : Math.floor(s);

  // مقارنة مع التسليح الدنيا
  const minSteelRatio = 0.0015; // حد أدنى
  const minAv = minSteelRatio * width * (smax || s);

  return {
    spacing: Math.round(finalSpacing * 10) / 10,
    spacingMax: Math.round(smax * 10) / 10,
    useSmax,
    areaRequired: Math.round(Av_required * 1000) / 1000,
    areaProvided: Math.round(Av_provided * 1000) / 1000,
    safe: Av_provided >= Av_required * 0.9, // 10% تساهل
  };
}

// ===================================================================
// 6. فحص الثقب — Punching Shear Check (WSD)
// ===================================================================

/**
 * فحص الثقب للبلاطات الفطرية
 * vp = 0.5√f'c
 * v = Vu / (bo × d)
 * bo = 2(c1 + d) + 2(c2 + d) للعمود الوسطي
 */
export function checkPunchingShear(params: {
  columnWidth: number;    // عرض العمود c1 (سم)
  columnDepth: number;    // عمق العمود c2 (سم)
  slabThickness: number;  // سماكة البلاطة h (سم)
  reaction: number;       // رد فعل العمود (طن)
  fc: number;             // f'c (كغ/سم²)
  columnType?: 'center' | 'edge' | 'corner'; // نوع العمود
}): PunchingShearResult {
  const { columnWidth: c1, columnDepth: c2, slabThickness: h, reaction, fc, columnType = 'center' } = params;

  const d = h - 2.5; // العمق الفعال (سم) — تغطية 2.5 سم

  // محيط المقطع الحرج (على بعد d/2 من وجه العمود)
  let bo: number;
  if (columnType === 'center') {
    bo = 2 * (c1 + d) + 2 * (c2 + d); // محيط كامل
  } else if (columnType === 'edge') {
    bo = (c1 + d) + 2 * (c2 + d); // ثلاثة أوجه
  } else {
    bo = (c1 + d) + (c2 + d); // وجهان
  }

  const V = reaction * 1000; // تحويل إلى كغ
  const actualStress = V / (bo * d);
  const vp = WSD.vp(fc);

  const safe = actualStress <= vp;

  return {
    safe,
    status: safe ? 'محقق' : 'غير محقق',
    statusAr: safe ? 'آمن (محقق) ✅' : 'غير آمن (غير محقق) — يحتاج زيادة سماكة البلاطة أو إضافة تيجان ❌',
    vp: Math.round(vp * 100) / 100,
    actualStress: Math.round(actualStress * 100) / 100,
    bo: Math.round(bo * 100) / 100,
    formula: `v = ${Math.round(actualStress * 100) / 100} كغ/سم² ≤ vp = ${Math.round(vp * 100) / 100} كغ/سم²`,
  };
}

// ===================================================================
// 7. مساحة التسليح الدنيا — Minimum Reinforcement
// ===================================================================

/**
 * حساب نسبة ومساحة التسليح الدنيا
 * للجوائز: ρmin = max(0.25√f'c/fy, 200/fy)
 * للبلاطات: ρmin = 0.0018 (fy=420) أو 0.0020 (fy=350)
 */
export function getMinReinforcement(params: {
  fc: number;
  fy: number;
  element: 'beam' | 'slab';
  width?: number;
  effectiveDepth?: number;
}): { rhoMin: number; AsMin: number } {
  const { fc, fy, element, width = 100, effectiveDepth = 15 } = params;

  let rhoMin: number;

  if (element === 'beam') {
    rhoMin = Math.max(0.25 * Math.sqrt(fc) / fy, 200 / fy);
  } else {
    // بلاطات
    if (fy >= 420) {
      rhoMin = 0.0018;
    } else if (fy >= 350) {
      rhoMin = 0.0020;
    } else {
      rhoMin = 0.0020;
    }
  }

  const AsMin = rhoMin * width * effectiveDepth;

  return {
    rhoMin: Math.round(rhoMin * 10000) / 10000,
    AsMin: Math.round(AsMin * 100) / 100,
  };
}

/**
 * مقارنة مساحة التسليح المقدمة مع الدنيا
 */
export function compareReinforcement(params: {
  AsProvided: number;
  fc: number;
  fy: number;
  element: 'beam' | 'slab';
  width?: number;
  effectiveDepth?: number;
}): { safe: boolean; AsMin: number; AsProvided: number; ratio: number } {
  const { AsProvided, fc, fy, element, width, effectiveDepth } = params;
  const { AsMin } = getMinReinforcement({ fc, fy, element, width, effectiveDepth });

  return {
    safe: AsProvided >= AsMin,
    AsMin,
    AsProvided,
    ratio: Math.round((AsProvided / AsMin) * 100) / 100,
  };
}
