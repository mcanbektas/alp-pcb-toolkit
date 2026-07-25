import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import NumberField from '../../components/NumberField'
import SelectField from '../../components/SelectField'
import Segmented from '../../components/Segmented'
import { parseNum, fmt, fmtOhm, fmtVolt, fmtWatt } from '../../lib/num'
import {
  OZ_TABLE, MIL, MIL2_TO_MM2,
  areaForCurrent_mil2, currentForArea, kCoeff,
  rhoAt, traceResistance, validityWarnings,
} from '../../lib/traceCalc'

const LEN_TO_M = { mm: 1e-3, cm: 1e-2, mil: 25.4e-6, inch: 0.0254 }
const W_TO_MM = { mm: 1, mil: MIL }

function copperUm(f) {
  if (f.oz === 'custom') return parseNum(f.tCustom)
  return OZ_TABLE.find((o) => o.key === f.oz)?.um ?? NaN
}

// Belirli bir genişlik (mm) için tüm elektriksel sonuçları üretir
function electricals(W_mm, t_um, L_m, I, Ta, dT, Vs) {
  const W_m = W_mm * 1e-3
  const t_m = t_um * 1e-6
  const A_m2 = W_m * t_m
  const Tavg = Ta + dT / 2
  const Tmax = Ta + dT
  const R20 = traceResistance(L_m, W_m, t_m, 20)
  const Ravg = traceResistance(L_m, W_m, t_m, Tavg)
  const Rmax = traceResistance(L_m, W_m, t_m, Tmax)
  const VdropAvg = I * Ravg
  const VdropMax = I * Rmax
  const Ploss = I * I * Ravg
  const J = I / A_m2 / 1e6 // A/mm²
  const pctAvg = Number.isFinite(Vs) && Vs > 0 ? (100 * VdropAvg) / Vs : null
  const pctMax = Number.isFinite(Vs) && Vs > 0 ? (100 * VdropMax) / Vs : null
  return { A_mm2: A_m2 * 1e6, Tavg, Tmax, R20, Ravg, Rmax, VdropAvg, VdropMax, Ploss, J, pctAvg, pctMax }
}

function compute(mode, f) {
  const Iraw = parseNum(f.I)
  const I = f.Iu === 'mA' ? Iraw / 1000 : Iraw
  const dT = parseNum(f.dT)
  const Ta = parseNum(f.Ta)
  const t_um = copperUm(f)
  const L_m = parseNum(f.L) * (LEN_TO_M[f.Lu] ?? NaN)
  const Vs = parseNum(f.Vs) // opsiyonel

  if (![I, dT, Ta, t_um, L_m].every(Number.isFinite) || I <= 0 || dT <= 0 || t_um <= 0 || L_m <= 0) {
    return { invalid: true }
  }

  const warnings = validityWarnings(I, dT)
  const t_mil = t_um / 25.4
  const out = { I, dT, Ta, t_um, t_mil, L_m, warnings, k: kCoeff(f.layer) }

  const tolOn = f.tol
  const wTol = tolOn ? parseNum(f.wTol) / 100 : 0
  const tTol = tolOn ? parseNum(f.tTol) / 100 : 0
  const tolValid = tolOn && Number.isFinite(wTol) && Number.isFinite(tTol) && wTol >= 0 && tTol >= 0

  if (mode === 'syn') {
    const M = parseNum(f.margin)
    if (!Number.isFinite(M) || M < 0) return { invalid: true }

    const A_mil2 = areaForCurrent_mil2(I, dT, f.layer)
    const Wmin_mil = A_mil2 / t_mil
    const Wmin_mm = Wmin_mil * MIL
    const Wrec_mm = Wmin_mm * (1 + M / 100)

    const e = electricals(Wrec_mm, t_um, L_m, I, Ta, dT, Vs)

    let tol = null
    if (tolValid) {
      // Worst-case: en dar genişlik + en ince bakır → en düşük kapasite
      const Wwc_mm = Wrec_mm * (1 - wTol)
      const twc_um = t_um * (1 - tTol)
      const Awc_mil2 = (Wwc_mm / MIL) * (twc_um / 25.4)
      const ImaxWc = currentForArea(Awc_mil2, dT, f.layer)
      tol = { Wwc_mm, twc_um, ImaxWc, sufficient: ImaxWc >= I }
    }

    return { ...out, mode, A_mil2, A_mm2: A_mil2 * MIL2_TO_MM2, Wmin_mm, Wmin_mil, Wrec_mm, M, e, tol }
  }

  // Analiz modu
  const W_mm = parseNum(f.W) * (W_TO_MM[f.Wu] ?? NaN)
  if (!Number.isFinite(W_mm) || W_mm <= 0) return { invalid: true }

  const A_mil2 = (W_mm / MIL) * t_mil
  const Imax = currentForArea(A_mil2, dT, f.layer)
  const util = I / Imax
  const e = electricals(W_mm, t_um, L_m, I, Ta, dT, Vs)

  let tol = null
  if (tolValid) {
    const AminMil2 = ((W_mm * (1 - wTol)) / MIL) * ((t_um * (1 - tTol)) / 25.4)
    const AmaxMil2 = ((W_mm * (1 + wTol)) / MIL) * ((t_um * (1 + tTol)) / 25.4)
    const Wmin_m = W_mm * (1 - wTol) * 1e-3
    const Wmax_m = W_mm * (1 + wTol) * 1e-3
    const tmin_m = t_um * (1 - tTol) * 1e-6
    const tmax_m = t_um * (1 + tTol) * 1e-6
    tol = {
      ImaxMin: currentForArea(AminMil2, dT, f.layer),
      ImaxMax: currentForArea(AmaxMil2, dT, f.layer),
      R20Max: traceResistance(L_m, Wmin_m, tmin_m, 20), // en dar/ince → en yüksek direnç
      R20Min: traceResistance(L_m, Wmax_m, tmax_m, 20),
    }
  }

  return { ...out, mode, W_mm, A_mil2, A_mm2: A_mil2 * MIL2_TO_MM2, Imax, util, e, tol }
}

export default function TraceWidth() {
  const [mode, setMode] = useState('syn')
  const [f, setF] = useState({
    I: '1', Iu: 'A',
    dT: '10', Ta: '25',
    layer: 'external',
    oz: '1', tCustom: '35',
    L: '50', Lu: 'mm',
    W: '0.5', Wu: 'mm',
    Vs: '',
    margin: '20',
    tol: false, wTol: '10', tTol: '10',
  })
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }))
  const r = useMemo(() => compute(mode, f), [mode, f])

  const status = useMemo(() => {
    if (r.invalid) return null
    if (r.mode === 'syn') {
      if (r.tol && !r.tol.sufficient) {
        return { cls: 'warn', text: 'Tolerans sonrası worst-case kapasite hedef akımın altında — marjı artırın' }
      }
      return { cls: 'ok', text: 'Hesaplandı' }
    }
    if (r.util > 1) return { cls: 'danger', text: `Yetersiz — akım, kapasitenin %${fmt(r.util * 100, 3)}'i` }
    if (r.util > 0.8) return { cls: 'warn', text: `Sınıra yakın — kapasitenin %${fmt(r.util * 100, 3)}'i kullanılıyor` }
    return { cls: 'ok', text: `Güvenli — kapasitenin %${fmt(r.util * 100, 3)}'i kullanılıyor` }
  }, [r])

  return (
    <>
      <div className="tool-header">
        <h1>Trace Width &amp; Current Capacity</h1>
        <p>
          Akımdan gerekli yol genişliğini (sentez) ya da mevcut genişliğin akım kapasitesini (analiz)
          hesaplar; direnç, gerilim düşümü, güç kaybı ve akım yoğunluğunu birlikte verir.
        </p>
      </div>

      <div className="tool-grid">
        {/* ---------- Sol: Girdiler ---------- */}
        <section className="panel">
          <h2>Girdiler</h2>

          <Segmented
            value={mode}
            onChange={setMode}
            options={[
              { value: 'syn', label: 'Sentez — genişlik bul' },
              { value: 'ana', label: 'Analiz — kapasite bul' },
            ]}
          />

          <NumberField
            label="Akım (I)"
            value={f.I} onChange={set('I')}
            units={['A', 'mA']} unit={f.Iu} onUnit={set('Iu')}
          />

          {mode === 'ana' && (
            <NumberField
              label="Yol genişliği (W)"
              value={f.W} onChange={set('W')}
              units={['mm', 'mil']} unit={f.Wu} onUnit={set('Wu')}
            />
          )}

          <NumberField
            label="İzin verilen sıcaklık artışı (ΔT)"
            value={f.dT} onChange={set('dT')}
            units={['°C']} unit="°C" onUnit={() => {}}
            hint="Tipik geçerlilik aralığı: 10–100 °C"
          />

          <NumberField
            label="Ortam sıcaklığı (Tₐ)"
            value={f.Ta} onChange={set('Ta')}
            units={['°C']} unit="°C" onUnit={() => {}}
          />

          <SelectField
            label="Katman"
            value={f.layer} onChange={set('layer')}
            options={[
              { value: 'external', label: 'Dış katman' },
              { value: 'internal', label: 'İç katman' },
            ]}
          />

          <SelectField
            label="Bakır kalınlığı"
            value={f.oz} onChange={set('oz')}
            options={OZ_TABLE.map((o) => ({ value: o.key, label: o.label }))}
          />

          {f.oz === 'custom' && (
            <NumberField
              label="Özel bakır kalınlığı"
              value={f.tCustom} onChange={set('tCustom')}
              units={['µm']} unit="µm" onUnit={() => {}}
            />
          )}

          <NumberField
            label="Yol uzunluğu (L)"
            value={f.L} onChange={set('L')}
            units={['mm', 'cm', 'mil', 'inch']} unit={f.Lu} onUnit={set('Lu')}
            hint="Direnç, gerilim düşümü ve güç kaybı için"
          />

          <NumberField
            label="Besleme gerilimi (opsiyonel)"
            value={f.Vs} onChange={set('Vs')}
            units={['V']} unit="V" onUnit={() => {}}
            hint="Girilirse yüzdesel gerilim düşümü gösterilir"
            placeholder="örn. 3.3"
          />

          {mode === 'syn' && (
            <NumberField
              label="Güvenlik marjı (M)"
              value={f.margin} onChange={set('margin')}
              units={['%']} unit="%" onUnit={() => {}}
              hint="Önerilen üretim genişliği = minimum × (1 + M)"
            />
          )}

          <label className="check-row">
            <input type="checkbox" checked={f.tol} onChange={(e) => set('tol')(e.target.checked)} />
            Tolerans analizi (worst-case)
          </label>

          {f.tol && (
            <>
              <NumberField
                label="Genişlik toleransı (±)"
                value={f.wTol} onChange={set('wTol')}
                units={['%']} unit="%" onUnit={() => {}}
              />
              <NumberField
                label="Bakır kalınlığı toleransı (±)"
                value={f.tTol} onChange={set('tTol')}
                units={['%']} unit="%" onUnit={() => {}}
              />
            </>
          )}
        </section>

        {/* ---------- Orta: Ana sonuç ---------- */}
        <section className="panel">
          <h2>Sonuç</h2>

          {r.invalid ? (
            <p className="empty-note">
              Tüm zorunlu alanlara pozitif sayısal değer girin. Ondalık için nokta veya virgül
              kullanabilirsiniz (0.25 = 0,25).
            </p>
          ) : (
            <>
              {r.mode === 'syn' ? (
                <div className="big-result">
                  <div className="label">Önerilen üretim genişliği (marj dahil, %{fmt(r.M, 3)})</div>
                  <div className="value">{fmt(r.Wrec_mm)} mm</div>
                  <div className="alt">
                    = {fmt(r.Wrec_mm / MIL)} mil &nbsp;·&nbsp; minimum: {fmt(r.Wmin_mm)} mm ({fmt(r.Wmin_mil)} mil)
                  </div>
                </div>
              ) : (
                <div className="big-result">
                  <div className="label">Maksimum sürekli akım (ΔT = {fmt(r.dT, 3)} °C için)</div>
                  <div className="value">{fmt(r.Imax)} A</div>
                  <div className="alt">W = {fmt(r.W_mm)} mm ({fmt(r.W_mm / MIL)} mil)</div>
                </div>
              )}

              {status && <span className={`status ${status.cls}`}>{status.text}</span>}

              <table className="result-table">
                <tbody>
                  <tr>
                    <td>Bakır kesit alanı</td>
                    <td>{fmt(r.A_mm2)} mm² <span className="sub">({fmt(r.A_mil2)} mil²)</span></td>
                  </tr>
                  <tr>
                    <td>Direnç @ 20 °C</td>
                    <td>{fmtOhm(r.e.R20)}</td>
                  </tr>
                  <tr>
                    <td>Direnç @ ortalama sıcaklık ({fmt(r.e.Tavg, 3)} °C)</td>
                    <td>{fmtOhm(r.e.Ravg)}</td>
                  </tr>
                  <tr>
                    <td>Direnç @ maksimum sıcaklık ({fmt(r.e.Tmax, 3)} °C)</td>
                    <td>{fmtOhm(r.e.Rmax)}</td>
                  </tr>
                  <tr>
                    <td>Gerilim düşümü (ortalama)</td>
                    <td>
                      {fmtVolt(r.e.VdropAvg)}
                      {r.e.pctAvg !== null && <span className="sub"> (%{fmt(r.e.pctAvg, 3)})</span>}
                    </td>
                  </tr>
                  <tr>
                    <td>Gerilim düşümü (worst-case)</td>
                    <td>
                      {fmtVolt(r.e.VdropMax)}
                      {r.e.pctMax !== null && <span className="sub"> (%{fmt(r.e.pctMax, 3)})</span>}
                    </td>
                  </tr>
                  <tr>
                    <td>Güç kaybı</td>
                    <td>{fmtWatt(r.e.Ploss)}</td>
                  </tr>
                  <tr>
                    <td>Akım yoğunluğu</td>
                    <td>{fmt(r.e.J)} A/mm²</td>
                  </tr>
                  <tr>
                    <td>Tahmini maksimum hat sıcaklığı</td>
                    <td>{fmt(r.e.Tmax, 3)} °C</td>
                  </tr>
                </tbody>
              </table>

              {r.tol && r.mode === 'syn' && (
                <>
                  <h2 style={{ marginTop: 20 }}>Tolerans — worst-case</h2>
                  <table className="result-table">
                    <tbody>
                      <tr>
                        <td>En dar üretilmiş genişlik</td>
                        <td>{fmt(r.tol.Wwc_mm)} mm</td>
                      </tr>
                      <tr>
                        <td>En ince bakır</td>
                        <td>{fmt(r.tol.twc_um)} µm</td>
                      </tr>
                      <tr>
                        <td>Worst-case akım kapasitesi</td>
                        <td>
                          {fmt(r.tol.ImaxWc)} A{' '}
                          <span className="sub">{r.tol.sufficient ? '≥ hedef akım ✓' : '< hedef akım ✗'}</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </>
              )}

              {r.tol && r.mode === 'ana' && (
                <>
                  <h2 style={{ marginTop: 20 }}>Tolerans — min / nominal / maks</h2>
                  <table className="result-table">
                    <tbody>
                      <tr className="mini-head">
                        <td></td>
                        <td>min · nom · maks</td>
                      </tr>
                      <tr>
                        <td>Akım kapasitesi</td>
                        <td>{fmt(r.tol.ImaxMin)} · {fmt(r.Imax)} · {fmt(r.tol.ImaxMax)} A</td>
                      </tr>
                      <tr>
                        <td>Direnç @ 20 °C</td>
                        <td>{fmtOhm(r.tol.R20Min)} · {fmtOhm(r.e.R20)} · {fmtOhm(r.tol.R20Max)}</td>
                      </tr>
                    </tbody>
                  </table>
                </>
              )}
            </>
          )}
        </section>

        {/* ---------- Sağ: Teknik detay ---------- */}
        <section className="panel panel-detail">
          <h2>Teknik detay</h2>

          <pre className="formula">{`I = k · ΔT^0.44 · A^0.725
    A: mil²   I: A   ΔT: °C
    k(dış) = 0.048   k(iç) = 0.024

R(T) = ρ₂₀·[1 + α(T − 20)] · L / (W·t)
    ρ₂₀ = 1.724×10⁻⁸ Ω·m
    α = 0.00393 /°C`}</pre>

          {!r.invalid && (
            <ul className="detail-list">
              <li>Yöntem: klasik ampirik iletken ısınma denklemi + sıcaklık düzeltmeli DC direnç modeli.</li>
              <li>Kullanılan katsayı: k = {r.k} ({f.layer === 'external' ? 'dış' : 'iç'} katman).</li>
              <li>Bakır kalınlığı: {fmt(r.t_um)} µm = {fmt(r.t_mil)} mil.</li>
              <li>Özdirenç @ T<sub>avg</sub>: {fmt(rhoAt(r.e.Tavg) * 1e8)} ×10⁻⁸ Ω·m.</li>
              <li>Ara değerlerde yuvarlama yapılmaz; yalnızca gösterim yuvarlanır.</li>
            </ul>
          )}

          <h2>Geçerlilik ve varsayımlar</h2>
          <ul className="detail-list">
            {!r.invalid && r.warnings.map((w, i) => (
              <li key={i} className="w">{w}</li>
            ))}
            <li>Yaklaşık geçerlilik: I ≤ ~35 A, ΔT 10–100 °C, tekil düz hat.</li>
            <li>Bitişik sıcak hatlar, bakır düzlemler, hava akışı ve kart kalınlığı modelde yoktur.</li>
            <li>İç katman katsayısı konservatiftir; gerçek kapasite kart yapısına göre değişir.</li>
            <li>Sonuçlar yaklaşıktır — kritik tasarımlarda üretici verisi ve ölçümle doğrulayın.</li>
          </ul>
        </section>
      </div>

      <Link className="backlink" to="/kategori/akim-guc-bakir">← PCB Akım, Güç ve Bakır</Link>
    </>
  )
}
