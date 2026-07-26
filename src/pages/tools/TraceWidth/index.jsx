import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import NumberField from '../../../components/NumberField'
import SelectField from '../../../components/SelectField'
import Segmented from '../../../components/Segmented'
import LineChart, { ChartLegend, ChartDataTable, toneClass } from '../../../components/LineChart'
import useToolForm from '../../../hooks/useToolForm'
import { fmt, fmtEng, fmtOhm, fmtVolt, fmtWatt, THOUSANDS_MESSAGE } from '../../../lib/num'
import { OZ_TABLE, rhoAt } from '../../../lib/traceCalc'
import { LENGTH } from '../../../lib/units'
import TraceSchematic from './schematic'
import {
  INITIAL_FORM, MODE_ANALYSIS, MODE_SYNTHESIS, compute, buildSweep,
} from './model'
import { reasonText, METHOD_NOTE, CHART_CAPTION, LAYER_LABEL } from './text'

// Gösterim dönüşümleri — hesaplar SI'de yapılır, yalnızca ekranda çevrilir
const mm = (m) => m / LENGTH.mm
const mil = (m) => m / LENGTH.mil
const axisMm = (v) => fmt(v, 3)

export default function TraceWidth() {
  const [mode, setMode] = useState(MODE_SYNTHESIS)
  const { f, set } = useToolForm(INITIAL_FORM)

  const r = useMemo(() => compute(mode, f), [mode, f])
  const s = useMemo(() => buildSweep(r), [r])

  const status = useMemo(() => {
    if (!r.ok) return null
    if (r.mode === MODE_SYNTHESIS) {
      if (r.tol && !r.tol.sufficient) {
        return { cls: 'warn', text: 'Tolerans sonrası worst-case kapasite hedef akımın altında — marjı artırın' }
      }
      return { cls: 'ok', text: 'Tüm kontroller geçti' }
    }
    const pct = fmt(r.util * 100, 3)
    if (r.util > 1) return { cls: 'danger', text: `Yetersiz — akım, kapasitenin %${pct}'i` }
    if (r.util > 0.8) return { cls: 'warn', text: `Sınıra yakın — kapasitenin %${pct}'i kullanılıyor` }
    return { cls: 'ok', text: `Güvenli — kapasitenin %${pct}'i kullanılıyor` }
  }, [r])

  const otherLayer = r.ok ? (r.layer === 'external' ? 'internal' : 'external') : 'internal'
  const chartSeries = s
    ? [
        { key: 'now', name: `${LAYER_LABEL[r.layer]} katman`, tone: toneClass(0), points: s.points },
        { key: 'other', name: `${LAYER_LABEL[otherLayer]} katman`, tone: toneClass(1), points: s.otherPoints },
      ]
    : []

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

          <TraceSchematic r={r} />

          <Segmented
            value={mode}
            onChange={setMode}
            options={[
              { value: MODE_SYNTHESIS, label: 'Sentez — genişlik bul' },
              { value: MODE_ANALYSIS, label: 'Analiz — kapasite bul' },
            ]}
          />

          <NumberField
            label="Akım (I)"
            value={f.I} onChange={set('I')}
            units={['A', 'mA']} unit={f.Iu} onUnit={set('Iu')}
          />

          {mode === MODE_ANALYSIS && (
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

          {mode === MODE_SYNTHESIS && (
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

          {!r.ok ? (
            r.ambiguous ? (
              <p className="empty-note warn">
                {THOUSANDS_MESSAGE} Etkilenen alan: {r.ambiguous.join(', ')}.
              </p>
            ) : (
              <p className="empty-note">{reasonText(r.reason)}</p>
            )
          ) : (
            <>
              {r.mode === MODE_SYNTHESIS ? (
                <div className="big-result">
                  <div className="label">Önerilen üretim genişliği (marj dahil, %{fmt(r.M * 100, 3)})</div>
                  <div className="value">{fmt(mm(r.Wrec_m))} mm</div>
                  <div className="alt">
                    = {fmt(mil(r.Wrec_m))} mil &nbsp;·&nbsp; minimum: {fmt(mm(r.Wmin_m))} mm
                  </div>
                </div>
              ) : (
                <div className="big-result">
                  <div className="label">Maksimum sürekli akım (ΔT = {fmt(r.dT, 3)} °C için)</div>
                  <div className="value">{fmt(r.Imax)} A</div>
                  <div className="alt">W = {fmt(mm(r.W_m))} mm ({fmt(mil(r.W_m))} mil)</div>
                </div>
              )}

              {status && <span className={`status ${status.cls}`}>{status.text}</span>}

              <p className="method-note">{METHOD_NOTE}</p>

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
                    <td>Birim uzunluk başına kayıp</td>
                    <td>{fmtEng(r.e.PperLength, 'W/m', 3)}</td>
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

              {r.tol && r.mode === MODE_SYNTHESIS && (
                <>
                  <h2 className="section">Tolerans — worst-case</h2>
                  <table className="result-table">
                    <tbody>
                      <tr>
                        <td>En dar üretilmiş genişlik</td>
                        <td>{fmt(mm(r.tol.Wwc_m))} mm</td>
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

              {r.tol && r.mode === MODE_ANALYSIS && (
                <>
                  <h2 className="section">Tolerans — min · nominal · maks</h2>
                  <table className="result-table">
                    <tbody>
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

          {r.ok && (
            <ul className="detail-list">
              <li>Yöntem: klasik ampirik iletken ısınma denklemi + sıcaklık düzeltmeli DC direnç modeli.</li>
              <li>Kullanılan katsayı: k = {r.k} ({LAYER_LABEL[r.layer]} katman).</li>
              <li>Bakır kalınlığı: {fmt(r.t_um)} µm = {fmt(r.t_mil)} mil.</li>
              <li>Özdirenç @ T<sub>avg</sub>: {fmt(rhoAt(r.e.Tavg) * 1e8)} ×10⁻⁸ Ω·m.</li>
              <li>Ara değerlerde yuvarlama yapılmaz; yalnızca gösterim yuvarlanır.</li>
            </ul>
          )}

          <h2 className="section">Geçerlilik ve varsayımlar</h2>
          <ul className="detail-list">
            {r.ok && r.warnings.map((w) => <li key={w} className="w">{w}</li>)}
            <li>Yaklaşık geçerlilik: I ≤ ~35 A, ΔT 10–100 °C, tekil düz hat.</li>
            <li>Bitişik sıcak hatlar, bakır düzlemler, hava akışı ve kart kalınlığı modelde yoktur.</li>
            <li>İç katman katsayısı konservatiftir; gerçek kapasite kart yapısına göre değişir.</li>
            <li>Kesit dikdörtgen kabul edilir; aşındırmadan gelen trapez kesit modelde yoktur.</li>
            <li>Sonuçlar yaklaşıktır — kritik tasarımlarda üretici verisi ve ölçümle doğrulayın.</li>
          </ul>
        </section>
      </div>

      {/* ---------- Alt: Parametrik grafik ---------- */}
      <section className="panel panel-chart">
        <div className="chart-head">
          <h2>Parametrik grafik</h2>
        </div>

        {s ? (
          <>
            <ChartLegend
              items={[
                { label: `${LAYER_LABEL[r.layer]} katman`, tone: toneClass(0), kind: 'line' },
                { label: `${LAYER_LABEL[otherLayer]} katman`, tone: toneClass(1), kind: 'line' },
                { label: `hedef akım ${fmt(r.I, 3)} A`, tone: 'tone-muted', kind: 'line' },
              ]}
            />

            <LineChart
              xScale="log"
              xLabel="Yol genişliği W (mm)"
              yLabel="Kapasite (A)"
              series={chartSeries}
              refLines={[{ key: 'target', y: s.target, label: `hedef ${fmt(r.I, 3)} A` }]}
              marker={{ ...s.marker, label: 'çalışma noktası' }}
              formatX={axisMm}
              formatY={(v) => fmt(v, 3)}
              caption={CHART_CAPTION}
            />

            <ChartDataTable
              xLabel="Yol genişliği W (mm)"
              series={chartSeries}
              every={5}
              formatX={(v) => `${fmt(v, 3)} mm`}
              formatY={(v) => `${fmt(v, 3)} A`}
            />
          </>
        ) : (
          <p className="empty-note">Grafik için geçerli girdi gerekli.</p>
        )}
      </section>

      <Link className="backlink" to="/kategori/akim-guc-bakir">← PCB Akım, Güç ve Bakır</Link>
    </>
  )
}
