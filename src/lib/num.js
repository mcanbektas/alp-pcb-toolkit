// Sayı ayrıştırma ve biçimlendirme.
// Ondalık ayracı olarak hem nokta hem virgül kabul edilir (0.25 == 0,25).

export function parseNum(s) {
  if (typeof s === 'number') return s
  if (s === null || s === undefined) return NaN
  const t = String(s).trim().replace(',', '.')
  if (t === '') return NaN
  if (!/^-?(\d+\.?\d*|\.\d+)(e-?\d+)?$/i.test(t)) return NaN
  return parseFloat(t)
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
