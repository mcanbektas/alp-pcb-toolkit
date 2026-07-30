// Rapor yükü sözleşmesi — docs/uyelik-ve-rapor-plani.md §5.1.
//
// Sunucu 25 aracın hiçbirini tanımaz; bu modül tarayıcı tarafında biçimlenmiş
// (zaten metne çevrilmiş) yükü kurar ve doğrular. Saf: React, DOM, ağ bilmez.
// Her araç kendi bölümünü `src/pages/tools/<Ad>/report.js` içindeki
// `buildReportSection()` ile üretir; burada yalnızca bölümler bir araya gelir.

export const REPORT_SCHEMA_VERSION = 1

export const REPORT_ERR_MISSING_PREPARED_BY = 'missing-prepared-by'
export const REPORT_ERR_NO_SECTIONS = 'no-sections'

// `field.js`'teki hata sözleşmesiyle aynı biçim: kod tek başına yetmiyorsa
// yapısal `detail`, asla kurulmuş cümle.
// `labels`: belgenin çerçeve metni (`reportText.js` → `reportLabels(lang)`).
// Yükün parçasıdır çünkü sunucu hiçbir kullanıcı metni tanımaz — dizgici
// başlıkları da buradan okur, kendi sözlüğünü taşımaz.
export function buildReportPayload({ title, preparedBy, company, date, sections, labels }) {
  if (!preparedBy || !preparedBy.trim()) {
    return { ok: false, error: REPORT_ERR_MISSING_PREPARED_BY }
  }
  if (!Array.isArray(sections) || sections.length === 0) {
    return { ok: false, error: REPORT_ERR_NO_SECTIONS }
  }

  return {
    ok: true,
    payload: {
      schemaVersion: REPORT_SCHEMA_VERSION,
      title,
      preparedBy: preparedBy.trim(),
      company: company?.trim() || null,
      date,
      labels,
      sections: sections.map(normalizeSection),
    },
  }
}

function normalizeSection(section) {
  return {
    toolName: section.toolName,
    mode: section.mode ?? null,
    inputs: (section.inputs ?? []).map(normalizeField),
    formula: section.formula ?? [],
    results: (section.results ?? []).map(normalizeField),
    notes: section.notes ?? [],
    schematicSvg: section.schematicSvg ?? null,
    schematicCaption: section.schematicCaption ?? null,
    chart: section.chart
      ? {
        title: section.chart.title ?? null,
        svg: section.chart.svg ?? null,
        table: section.chart.table ?? null,
      }
      : null,
  }
}

// num.js'in fmtOhm/fmtVolt/fmtWatt/fmtEng gibi fonksiyonları "sayı birim"
// biçiminde TEK dize döner (dinamik SI öneki seçimiyle — 39.7 mΩ, 1.2 kΩ…).
// Excel'de gerçek sayı hücresi istiyorsak (§5.4) bunu ayırmamız gerekir.
// Biçim sabittir (num.js kaynağı kontrollü, kullanıcı girdisi değil), o
// yüzden son boşluktan bölmek güvenlidir. Sonsuz olmayan değerde num.js
// uzun tire ("—") döner; onun birimi yoktur.
export function splitFormatted(formatted) {
  if (formatted === '—') return { value: '—', unit: null }
  const i = formatted.lastIndexOf(' ')
  if (i === -1) return { value: formatted, unit: null }
  return { value: formatted.slice(0, i), unit: formatted.slice(i + 1) }
}

function normalizeField(field) {
  return {
    label: field.label,
    value: field.value,
    unit: field.unit ?? null,
    emphasis: field.emphasis ?? false,
  }
}
