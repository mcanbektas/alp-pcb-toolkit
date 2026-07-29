// Sayı ayrıştırma ve biçimlendirme.
// Ondalık ayracı olarak hem nokta hem virgül kabul edilir (0.25 == 0,25).
// Binlik ayırıcı yorumlanmaz: "1.000" bin mi yoksa 1.0 mı olduğu belirsiz
// olduğundan sessizce 1 döndürmek yerine geçersiz sayılır.

export const NUM_ERR_EMPTY = 'empty'
export const NUM_ERR_THOUSANDS = 'thousands'
export const NUM_ERR_INVALID = 'invalid'

// Belirsiz kalıp: tek ayırıcı, ardından tam üç basamak, tam kısım 1–3 basamaklı
// ve sıfırla başlamıyor. "1.000" ve "250,000" girer; "0.250" ve "1000.000" girmez.
const THOUSANDS_SHAPE = /^-?[1-9]\d{0,2}[.,]\d{3}$/
const NUMBER_SHAPE = /^-?(\d+\.?\d*|\.\d+)(e-?\d+)?$/i

// Ayrıştırma sonucunu nedeniyle birlikte döner: { value, error }
export function parseNumResult(s) {
  if (typeof s === 'number') return { value: s, error: null }
  if (s === null || s === undefined) return { value: NaN, error: NUM_ERR_EMPTY }
  const t = String(s).trim()
  if (t === '') return { value: NaN, error: NUM_ERR_EMPTY }
  // Birden fazla ayırıcı ("1.000.000") ya da belirsiz üçlü grup → binlik ayırıcı
  const sepCount = (t.match(/[.,]/g) || []).length
  if (sepCount > 1 || THOUSANDS_SHAPE.test(t)) {
    return { value: NaN, error: NUM_ERR_THOUSANDS }
  }
  const d = t.replace(',', '.')
  if (!NUMBER_SHAPE.test(d)) return { value: NaN, error: NUM_ERR_INVALID }
  return { value: parseFloat(d), error: null }
}

export function parseNum(s) {
  return parseNumResult(s).value
}

// Anlamlı basamağa göre biçimlendirir; ara değerlerde asla kullanılmaz,
// yalnızca ekrana yazarken çağrılır.
export function fmt(x, sig = 4) {
  if (!Number.isFinite(x)) return '—'
  if (x === 0) return '0'
  const a = Math.abs(x)
  if (a >= 1e7 || a < 1e-4) return x.toExponential(3)
  let s = x.toPrecision(sig)
  if (s.includes('e')) return s
  if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '')
  return s
}

// Mühendislik gösterimi: değeri 1–1000 aralığına getirip SI ön ekiyle yazar.
// Yalnızca ekrana yazarken çağrılır; ara değerler asla bundan geçmez.
const SI_PREFIXES = [
  { e: 9, p: 'G' }, { e: 6, p: 'M' }, { e: 3, p: 'k' }, { e: 0, p: '' },
  { e: -3, p: 'm' }, { e: -6, p: 'µ' }, { e: -9, p: 'n' }, { e: -12, p: 'p' },
]

export function fmtEng(x, unit = '', sig = 4) {
  if (!Number.isFinite(x)) return '—'
  if (x === 0) return `0${unit ? ` ${unit}` : ''}`
  const a = Math.abs(x)
  const step = SI_PREFIXES.find((s) => a >= Math.pow(10, s.e)) ?? SI_PREFIXES[SI_PREFIXES.length - 1]
  const scaled = x / Math.pow(10, step.e)
  return `${fmt(scaled, sig)} ${step.p}${unit}`.trimEnd()
}

export const fmtRes = (x, sig) => fmtEng(x, 'Ω', sig)
export const fmtAmp = (x, sig) => fmtEng(x, 'A', sig)
export const fmtPow = (x, sig) => fmtEng(x, 'W', sig)

// Yüzde değerinin SAYI kısmı — işaret her zaman yazılır, sapmanın yönü okunabilsin.
// Yüzde işaretini burası yazmaz: işaretin yeri dile göre değişir (tr: %5, en: 5%)
// ve tek yetkili yer `commonText(lang).pct`. Burası saf katman, dil bilmez; işaret
// burada da yazılsaydı aynı sayfada "%12.3" ile "12.3 %" yan yana görünürdü.
// Çağıran daima `pct(fmtPct(x))` yazar.
export function fmtPct(x, sig = 3) {
  if (!Number.isFinite(x)) return '—'
  const s = fmt(Math.abs(x), sig)
  return `${x < 0 ? '−' : '+'}${s}`
}

// Ölçekli birim gösterimleri
export function fmtOhm(r) {
  if (!Number.isFinite(r)) return '—'
  if (Math.abs(r) < 1) return `${fmt(r * 1000)} mΩ`
  return `${fmt(r)} Ω`
}

export function fmtVolt(v) {
  if (!Number.isFinite(v)) return '—'
  if (Math.abs(v) < 1) return `${fmt(v * 1000)} mV`
  return `${fmt(v)} V`
}

export function fmtWatt(p) {
  if (!Number.isFinite(p)) return '—'
  if (Math.abs(p) < 1) return `${fmt(p * 1000)} mW`
  return `${fmt(p)} W`
}
