import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import NumberField from '../../../components/NumberField'
import SelectField from '../../../components/SelectField'
import Segmented from '../../../components/Segmented'
import LineChart, { ChartLegend, ChartDataTable, toneClass } from '../../../components/LineChart'
import useToolForm from '../../../hooks/useToolForm'
import { fmt, fmtEng, fmtRes, fmtAmp, fmtPow, fmtPct, fmtVolt, THOUSANDS_MESSAGE } from '../../../lib/num'
import { dividerRatio } from '../../../lib/divider'
import { SERIES_NAMES, errorPct } from '../../../lib/eseries'
import DividerSchematic from './schematic'
import {
  INITIAL_FORM, MODE_ANALYSIS, MODE_SYNTHESIS, SWEEP_PARAMS,
  compute, buildSweep,
} from './model'
import {
  SWEEP_LABEL, SWEEP_AXIS, SWEEP_CAPTION, REF_LABEL, reasonText, findingText,
} from './text'

const R_UNITS = ['Ω', 'kΩ', 'MΩ']
const V_UNITS = ['V', 'mV']

// Eksen tikleri dar; ön ek boşluksuz yazılır (1k, 10k, 1M)
const axisRes = (v) => fmtEng(v, '', 3).replace(' ', '')

const MARK = { ok: '✓', warn: '!', danger: '×' }
const LEVEL_RANK = { ok: 0, warn: 1, danger: 2 }

function worstLevel(findings) {
  return findings.reduce((acc, fd) => (LEVEL_RANK[fd.level] > LEVEL_RANK[acc] ? fd.level : acc), 'ok')
}

export default function VoltageDivider() {
  const [mode, setMode] = useState(MODE_ANALYSIS)
  const [sweep, setSweep] = useState('RL')
  const [pickIndex, setPickIndex] = useState(0)
  const { f, set } = useToolForm(INITIAL_FORM)

  const r = useMemo(() => compute(mode, f, pickIndex), [mode, f, pickIndex])
  const s = useMemo(() => buildSweep(r, sweep), [r, sweep])

  const status = useMemo(() => {
    if (!r.ok || r.findings.length === 0) return null
    const worst = worstLevel(r.findings)
    const count = r.findings.filter((fd) => fd.level === worst).length
    if (worst === 'ok') return { cls: 'ok', text: 'Tüm kontroller geçti' }
    if (worst === 'warn') return { cls: 'warn', text: `Sınıra yakın — ${count} uyarı` }
    return { cls: 'danger', text: `${count} kontrol sınırın dışında` }
  }, [r])

  const chartSeries = s ? [{ key: 'vout', name: 'V_out', tone: toneClass(0), points: s.points }] : []

  return (
    <>
      <div className="tool-header">
        <h1>Voltage Divider &amp; Standard Value Finder</h1>
        <p>
          Verilen dirençlerden çıkış gerilimini (analiz) ya da hedef çıkış için standart E serisi
          direnç çiftini (sentez) bulur; yükleme etkisi, tolerans penceresi, güç ve kaynak
          empedansını birlikte değerlendirir.
        </p>
      </div>

      <div className="tool-grid">
        {/* ---------- Sol: Girdiler ---------- */}
        <section className="panel">
          <h2>Girdiler</h2>

          <DividerSchematic r={r} />

          <Segmented
            value={mode}
            onChange={(v) => { setMode(v); setPickIndex(0) }}
            options={[
              { value: MODE_ANALYSIS, label: 'Analiz — çıkışı bul' },
              { value: MODE_SYNTHESIS, label: 'Sentez — çifti bul' },
            ]}
          />

          <NumberField
            label="Giriş gerilimi (Vᵢₙ)"
            value={f.Vin} onChange={set('Vin')}
            units={V_UNITS} unit={f.Vinu} onUnit={set('Vinu')}
          />

          {mode === MODE_ANALYSIS ? (
            <>
              <NumberField
                label="R1 (üst)"
                value={f.R1} onChange={set('R1')}
                units={R_UNITS} unit={f.R1u} onUnit={set('R1u')}
              />
              <NumberField
                label="R2 (alt, çıkış bu direncin üzerinden alınır)"
                value={f.R2} onChange={set('R2')}
                units={R_UNITS} unit={f.R2u} onUnit={set('R2u')}
              />
            </>
          ) : (
            <>
              <NumberField
                label="Hedef çıkış (V_out)"
                value={f.Vout} onChange={set('Vout')}
                units={V_UNITS} unit={f.Voutu} onUnit={set('Voutu')}
              />
              <SelectField
                label="E serisi"
                value={f.series} onChange={(v) => { set('series')(v); setPickIndex(0) }}
                options={SERIES_NAMES.map((x) => ({ value: x, label: x }))}
              />
              <NumberField
                label="En küçük direnç"
                value={f.rMin} onChange={set('rMin')}
                units={R_UNITS} unit={f.rMinu} onUnit={set('rMinu')}
              />
              <NumberField
                label="En büyük direnç"
                value={f.rMax} onChange={set('rMax')}
                units={R_UNITS} unit={f.rMaxu} onUnit={set('rMaxu')}
                hint="Arama bu aralıkla sınırlanır"
              />
            </>
          )}

          <NumberField
            label="Yük direnci (R_L, opsiyonel)"
            value={f.RL} onChange={set('RL')}
            units={R_UNITS} unit={f.RLu} onUnit={set('RLu')}
            hint="Boş bırakılırsa çıkış yüksüz kabul edilir"
            placeholder="örn. 100"
          />

          <NumberField
            label="Direnç güç sınırı (opsiyonel)"
            value={f.Prated} onChange={set('Prated')}
            units={['mW']} unit="mW" onUnit={() => {}}
            hint="Paket başına nominal güç, örn. 0603 için 100 mW"
            placeholder="örn. 100"
          />

          <NumberField
            label="Kabul edilebilir sapma"
            value={f.accept} onChange={set('accept')}
            units={['%']} unit="%" onUnit={() => {}}
            hint="Hedef ve tolerans kontrolleri bu sınıra göre değerlendirilir"
          />

          <label className="check-row">
            <input type="checkbox" checked={f.tol} onChange={(e) => set('tol')(e.target.checked)} />
            Tolerans analizi (worst-case)
          </label>

          {f.tol && (
            <>
              <NumberField
                label="R1 toleransı (±)"
                value={f.tolR1} onChange={set('tolR1')}
                units={['%']} unit="%" onUnit={() => {}}
              />
              <NumberField
                label="R2 toleransı (±)"
                value={f.tolR2} onChange={set('tolR2')}
                units={['%']} unit="%" onUnit={() => {}}
              />
              <NumberField
                label="Vᵢₙ toleransı (±)"
                value={f.tolVin} onChange={set('tolVin')}
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
              <div className="big-result">
                <div className="label">
                  Çıkış gerilimi {r.RL !== null ? `(${fmtRes(r.RL, 3)} yük altında)` : '(yüksüz)'}
                </div>
                <div className="value">{fmtVolt(r.Vout)}</div>
                <div className="alt">
                  R1 = {fmtRes(r.R1, 3)} &nbsp;·&nbsp; R2 = {fmtRes(r.R2, 3)}
                  {r.targetVout != null && (
                    <> &nbsp;·&nbsp; hedef {fmtVolt(r.targetVout)} ({fmtPct(errorPct(r.Vout, r.targetVout))})</>
                  )}
                </div>
              </div>

              {status && <span className={`status ${status.cls}`}>{status.text}</span>}

              <table className="result-table">
                <tbody>
                  {r.tolerance && (
                    <tr className="mini-head">
                      <td>Çıkış — min · nominal · maks</td>
                      <td>
                        {fmtVolt(r.tolerance.min)} · {fmtVolt(r.tolerance.nom)} · {fmtVolt(r.tolerance.max)}
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td>Yüksüz çıkış</td>
                    <td>{fmtVolt(r.base.Vout)}</td>
                  </tr>
                  {r.RL !== null && (
                    <>
                      <tr>
                        <td>R2 ∥ R_L</td>
                        <td>{fmtRes(r.base.loaded.R2eff)}</td>
                      </tr>
                      <tr>
                        <td>Yük akımı</td>
                        <td>{fmtAmp(r.base.loaded.IL)}</td>
                      </tr>
                    </>
                  )}
                  <tr>
                    <td>Bölücü akımı</td>
                    <td>{fmtAmp(r.RL !== null ? r.base.loaded.Idiv : r.base.Idiv)}</td>
                  </tr>
                  <tr>
                    <td>Çıkış kaynak empedansı (R1 ∥ R2)</td>
                    <td>{fmtRes(r.Zout)}</td>
                  </tr>
                  <tr>
                    <td>R1 gücü</td>
                    <td>{fmtPow(r.base.P1)}</td>
                  </tr>
                  <tr>
                    <td>R2 gücü</td>
                    <td>{fmtPow(r.base.P2)}</td>
                  </tr>
                  <tr>
                    <td>Toplam harcanan güç</td>
                    <td>{fmtPow(r.Vin * (r.RL !== null ? r.base.loaded.Idiv : r.base.Idiv))}</td>
                  </tr>
                </tbody>
              </table>

              <h2 className="section">Mühendislik yorumu</h2>
              <ul className="commentary">
                {r.findings.map((fd) => {
                  const text = findingText(fd)
                  if (!text) return null
                  return (
                    <li key={fd.code} className={fd.level}>
                      <span className="mark" aria-hidden="true">{MARK[fd.level]}</span>
                      <span>{text}</span>
                    </li>
                  )
                })}
              </ul>

              {r.pairs && (
                <>
                  <h2 className="section">Aday çiftler — {f.series}</h2>
                  <table className="pick-table">
                    <thead>
                      <tr>
                        <th>R1</th>
                        <th>R2</th>
                        <th>V_out</th>
                        <th>sapma</th>
                        <th>I</th>
                        <th>P_maks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {r.pairs.map((p, i) => (
                        <tr
                          key={`${p.R1}-${p.R2}`}
                          className={`pick${i === r.pickIndex ? ' on' : ''}`}
                          onClick={() => setPickIndex(i)}
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPickIndex(i) }
                          }}
                          aria-selected={i === r.pickIndex}
                        >
                          <td>{fmtRes(p.R1, 3)}</td>
                          <td>{fmtRes(p.R2, 3)}</td>
                          <td>{fmtVolt(p.Vout)}</td>
                          <td>{fmtPct(p.EV)}</td>
                          <td>{fmtAmp(p.Idiv, 3)}</td>
                          <td>
                            {fmtPow(Math.max(p.P1, p.P2), 3)}
                            {p.overPower && <span className="flag"> !</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="method-note">
                    Satıra tıklayarak çifti seçin. Sıralama ölçütü: gerilim sapması, ardından güç sınırı.
                  </p>
                </>
              )}
            </>
          )}
        </section>

        {/* ---------- Sağ: Teknik detay ---------- */}
        <section className="panel panel-detail">
          <h2>Teknik detay</h2>

          <pre className="formula">{`V_out = V_in · R2 / (R1 + R2)

Yük altında:
  R2_eff = R2 · R_L / (R2 + R_L)
  V_out  = V_in · R2_eff / (R1 + R2_eff)

I_div  = V_in / (R1 + R2)
P₁ = I_div²·R1      P₂ = I_div²·R2
Z_out  = R1 ∥ R2

Hedeften orana:
  k = V_out / V_in
  R1 / R2 = (1 − k) / k`}</pre>

          {r.ok && (
            <ul className="detail-list">
              <li>
                Mod: {r.mode === MODE_SYNTHESIS
                  ? 'sentez — hedef gerilimden çift aranıyor'
                  : 'analiz — verilen dirençlerden çıkış hesaplanıyor'}.
              </li>
              <li>
                k = V_out / V_in = {fmt(r.Vout / r.Vin, 4)}; gerekli R1/R2 oranı ={' '}
                {fmt(dividerRatio(r.Vin, r.Vout).ratio ?? NaN, 4)}.
              </li>
              <li>R1 + R2 = {fmtRes(r.R1 + r.R2)}; bölücü akımı bu toplamın tersiyle ölçeklenir.</li>
              {r.RL !== null && (
                <li>R2 ∥ R_L = {fmtRes(r.base.loaded.R2eff)} — yükleme etkisi bu eşdeğerden gelir.</li>
              )}
              {r.tolerance && (
                <li>
                  Worst-case köşeler: V_out(maks) = V_in(maks), R1(min), R2(maks); V_out(min) tersi.
                  Ara noktalar taranmaz, çünkü V_out bu üç değişkende monotondur.
                </li>
              )}
              <li>Ara değerlerde yuvarlama yapılmaz; yalnızca gösterim yuvarlanır.</li>
            </ul>
          )}

          <h2 className="section">Geçerlilik ve varsayımlar</h2>
          <ul className="detail-list">
            <li>Model saf DC ve dirençseldir; kaynak iç direnci sıfır, dirençler ideal kabul edilir.</li>
            <li>
              Yük saf direnç olarak modellenir. Kapasitif yük, ADC örnekleme kapasitesi ve giriş
              kaçak akımı bu hesapta yoktur.
            </li>
            <li>
              Direnç sıcaklık katsayısı (TCR) ve öz ısınma dikkate alınmaz; sıcak ortamda gerçek
              sapma girilen toleransın üzerine çıkabilir.
            </li>
            <li>
              Tolerans analizi worst-case köşe yöntemidir. Gerçek üretim dağılımı istatistikseldir;
              köşe sonucu karşılaşılacak en kötü durumu verir, tipik durumu değil.
            </li>
            <li>
              E serisi değerleri tercih edilen sayı tablolarından gelir; stoktaki gerçek değer ve
              tolerans üreticiye göre değişir.
            </li>
            <li>Sonuçlar yaklaşıktır — kritik tasarımlarda üretici verisi ve ölçümle doğrulayın.</li>
          </ul>
        </section>
      </div>

      {/* ---------- Alt: Parametrik grafik ---------- */}
      <section className="panel panel-chart">
        <div className="chart-head">
          <h2>Parametrik grafik</h2>
          <Segmented
            value={sweep}
            onChange={setSweep}
            options={SWEEP_PARAMS.map((p) => ({ value: p, label: SWEEP_LABEL[p] }))}
          />
        </div>

        {s ? (
          <>
            <ChartLegend
              items={[
                { label: 'V_out', tone: toneClass(0), kind: 'line' },
                ...(s.bandPoints ? [{ label: 'tolerans aralığı', tone: toneClass(0), faded: true }] : []),
                ...s.refs.map((ref) => ({ label: REF_LABEL[ref.key](ref.y), tone: 'tone-muted', kind: 'line' })),
              ]}
            />

            <LineChart
              xScale="log"
              xLabel={SWEEP_AXIS[s.param]}
              yLabel="V_out (V)"
              series={chartSeries}
              band={s.bandPoints ? { name: 'Tolerans aralığı', tone: toneClass(0), points: s.bandPoints } : null}
              refLines={s.refs.map((ref) => ({ key: ref.key, y: ref.y, label: REF_LABEL[ref.key](ref.y) }))}
              marker={s.marker ? { ...s.marker, label: 'çalışma noktası' } : null}
              formatX={axisRes}
              formatY={(v) => fmt(v, 3)}
              caption={SWEEP_CAPTION[s.param]}
            />

            <ChartDataTable
              xLabel={SWEEP_AXIS[s.param]}
              series={chartSeries}
              every={5}
              formatX={(v) => fmtRes(v, 3)}
              formatY={(v) => fmtVolt(v)}
            />
          </>
        ) : (
          <p className="empty-note">Grafik için geçerli girdi gerekli.</p>
        )}
      </section>

      <Link className="backlink" to="/kategori/komponent">← Komponent ve Devre Hesapları</Link>
    </>
  )
}
