// Via stub ve backdrill hesaplayıcısı ekranının hesap modeli (REV2 §5).
//
// Saf: React ve DOM bilmez, gösterim biçimi üretmez. Form nesnesini alır,
// SI'ye çevirir, lib/viaStub.js motorunu çağırır, sonucu ve hata kodunu
// döner. Kullanıcıya gösterilecek metin text.js içindedir.
//
// Bu araçta da (ReturnPathStitchingVia'daki gibi) analiz/sentez ayrımı yok —
// motor tek çağrıda hem nominal stub değerlendirmesini hem opsiyonel backdrill
// sonucunu hem de opsiyonel hedef-rezonans önerisini döner.

import { fieldsFor, readForm, when } from '../../../lib/fields'
import { LENGTH, FREQUENCY, TIME } from '../../../lib/units'
import {
  viaStubPlan, quarterWaveResonance,
  VS_ERR_INVALID, VS_ERR_RESIDUAL_NEGATIVE, VS_ERR_EXCEEDS_BOARD, VS_ERR_TARGET_UNREACHABLE,
  KT_CLASS_LOW, KT_CLASS_CONSIDER, KT_CLASS_VERIFY,
} from '../../../lib/viaStub'
import { logspace } from '../../../lib/sweep'

export {
  VS_ERR_INVALID, VS_ERR_RESIDUAL_NEGATIVE, VS_ERR_EXCEEDS_BOARD, VS_ERR_TARGET_UNREACHABLE,
  KT_CLASS_LOW, KT_CLASS_CONSIDER, KT_CLASS_VERIFY,
}

// lib/ katmanı hata kodunu döner, text.js koda çevirir (CLAUDE.md mimari
// kuralı) — bu yüzden burada ayrı bir REASON_* takma adı icat edilmez, tek
// yerel kod eksik/ayrıştırılamayan girdi içindir.
export const REASON_INCOMPLETE = 'incomplete'

export const SWEEP_STUB = 'stub'
export const SWEEP_REMOVED = 'removed'
export const SWEEP_PARAMS = [SWEEP_STUB, SWEEP_REMOVED]

// Birimsiz εr için SingleEnded/ReturnPath ile aynı desen.
const PLAIN = { '': 1 }

export const INITIAL_FORM = {
  // Varsayılanlar REV2 §5.11 referans testiyle birebir örtüşür: stub = 5.6 −
  // 0.6 = 5 mm, εr = 4 → rezonans ≈ 7.495 GHz.
  viaTotal: '5.6', viaTotalu: 'mm',
  used: '0.6', usedu: 'mm',
  epsR: '4',
  safety: '0.1', safetyu: 'mm',

  tr: '', tru: 'ns',
  fMax: '', fMaxu: 'MHz',

  hasBackdrill: false,
  removed: '', removedu: 'mm',
  depthTol: '0.05', depthTolu: 'mm',
  // Bir through-hole via tanım gereği kartın tamamını deldiği için varsayılan
  // kart kalınlığı `viaTotal` ile TUTARLI seçildi — aksi hâlde (ör. 1.6 mm)
  // varsayılan 5 mm stub senaryosuyla çelişir ve backdrill açılır açılmaz
  // "kart kalınlığını aşıyor" hatası verirdi.
  boardThickness: '5.6', boardThicknessu: 'mm',

  hasTarget: false,
  fTarget: '', fTargetu: 'GHz',
  fabricationTol: '0.1', fabricationTolu: 'mm',
}

// Etiketler `labels` ile çağıran taraftan gelir (geçerli dilde, text.js'ten);
// `lib/` bunları bilmez. Etiket verilmezse alan anahtarı gösterilir.
export function formFields(f, labels = {}) {
  const L = (key) => labels[key] ?? key
  return fieldsFor([
    [
      { key: 'viaTotal', label: L('viaTotal'), unitKey: 'viaTotalu', table: LENGTH, min: 0 },
      { key: 'used', label: L('used'), unitKey: 'usedu', table: LENGTH, min: 0, allowZero: true },
      { key: 'epsR', label: L('epsR'), unit: '', table: PLAIN, min: 1 },
      {
        key: 'safety', label: L('safety'), unitKey: 'safetyu', table: LENGTH,
        min: 0, optional: true, allowZero: true,
      },
    ],
    [
      { key: 'tr', label: L('tr'), unitKey: 'tru', table: TIME, min: 0, optional: true },
      { key: 'fMax', label: L('fMax'), unitKey: 'fMaxu', table: FREQUENCY, min: 0, optional: true },
    ],
    when(f.hasBackdrill, [
      { key: 'removed', label: L('removed'), unitKey: 'removedu', table: LENGTH, min: 0, allowZero: true },
      {
        key: 'depthTol', label: L('depthTol'), unitKey: 'depthTolu', table: LENGTH,
        min: 0, optional: true, allowZero: true,
      },
      { key: 'boardThickness', label: L('boardThickness'), unitKey: 'boardThicknessu', table: LENGTH, min: 0, optional: true },
    ]),
    when(f.hasTarget, [
      { key: 'fTarget', label: L('fTarget'), unitKey: 'fTargetu', table: FREQUENCY, min: 0 },
      {
        key: 'fabricationTol', label: L('fabricationTol'), unitKey: 'fabricationTolu', table: LENGTH,
        min: 0, optional: true, allowZero: true,
      },
    ]),
  ])
}

export function compute(f, labels = {}) {
  const read = readForm(f, formFields(f, labels))
  if (read.ambiguous.length) return { ok: false, ambiguous: read.ambiguous }
  if (!read.ok) return { ok: false, reason: REASON_INCOMPLETE, invalid: read.invalid }

  const v = read.values

  const plan = viaStubPlan({
    viaTotal: v.viaTotal,
    used: v.used,
    epsR: v.epsR,
    safety: v.safety ?? 0,
    tr: v.tr ?? null,
    fMax: v.fMax ?? null,
    removed: f.hasBackdrill ? (v.removed ?? null) : null,
    depthTol: f.hasBackdrill ? (v.depthTol ?? 0) : 0,
    boardThickness: f.hasBackdrill ? (v.boardThickness ?? null) : null,
    fTarget: f.hasTarget ? (v.fTarget ?? null) : null,
    fabricationTol: f.hasTarget ? (v.fabricationTol ?? 0) : 0,
    harmonicCount: 3,
  })
  if (plan.error) return { ok: false, reason: plan.error }

  return {
    ok: true,
    hasBackdrill: f.hasBackdrill,
    hasTarget: f.hasTarget,
    epsR: v.epsR,
    // Motor `fMax`'ı geri döndürmez, yalnız türetilmiş `margin`'i döner;
    // yorum metninde ham değeri tekrar göstermek için burada taşınır.
    fMax: v.fMax ?? null,
    // Backdrill sweep'inin x eksenini (kaldırılan derinlik), şematiğin ve
    // raporun etiketlerini kurmak için ham girdiler — motor bunları geri
    // döndürmez, yalnız türetilmiş bloğu döner.
    usedInput: v.used,
    removedInput: f.hasBackdrill ? (v.removed ?? null) : null,
    ...plan,
  }
}

// Stub uzunluğu ↔ rezonans ilişkisi f = c/(4·l·√εr) — ters orantılı, log-log
// eksende düz çizgi. Aralık mevcut stub'ın 1/10'undan 4 katına kadar (en az
// 0.05–5 mm) seçilir ki eğri her zaman görünür kalsın.
function stubRange(current) {
  const lo = Math.min(Math.max(current / 10, 0.02e-3), 0.05e-3)
  const hi = Math.max(current * 4, 5e-3)
  const { values } = logspace(lo, hi, 120)
  return values ?? []
}

// Grafik: iki taranan parametre. `removed` sweep'i yalnızca backdrill
// uygulanmışsa (residual bloğu varsa) veri döner — ReturnPathStitchingVia'daki
// kondansatör sweep'iyle aynı "opsiyonel girdi yoksa null" deseni.
export function buildSweep(r, param) {
  if (!r.ok) return null

  if (param === SWEEP_REMOVED) {
    if (!r.residual) return null
    const n = 100
    const maxRemoved = r.stub * 0.98
    const rows = []
    for (let i = 0; i <= n; i++) {
      const removed = (maxRemoved * i) / n
      rows.push({ x: removed, y: quarterWaveResonance({ stub: r.stub - removed, epsR: r.epsR }) })
    }
    return {
      param,
      rows,
      points: rows.map((p) => [p.x, p.y]),
      // İşaretçi ancak gerçek bir rezonans varsa konur: stub tamamen
      // kalktığında `resonanceNominal` null gelir ve `y: null` bir işaretçi
      // grafiğe çizilemez.
      marker: (r.removedInput != null && r.residual.resonanceNominal != null)
        ? { x: r.removedInput, y: r.residual.resonanceNominal }
        : null,
    }
  }

  const rows = stubRange(r.stub).map((l) => ({ x: l, y: quarterWaveResonance({ stub: l, epsR: r.epsR }) }))
  return {
    param: SWEEP_STUB,
    rows,
    points: rows.map((p) => [p.x, p.y]),
    marker: { x: r.stub, y: r.resonance },
  }
}
