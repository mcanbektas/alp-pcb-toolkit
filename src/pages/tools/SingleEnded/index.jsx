import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import NumberField from '../../../components/NumberField'
import SelectField from '../../../components/SelectField'
import Segmented from '../../../components/Segmented'
import LineChart, { ChartLegend, ChartDataTable, toneClass } from '../../../components/LineChart'
import useToolForm from '../../../hooks/useToolForm'
import { fmt, fmtEng, fmtRes, THOUSANDS_MESSAGE } from '../../../lib/num'
import ImpedanceSchematic from './schematic'
import {
  INITIAL_FORM, STRUCTURES, STRUCT_MICROSTRIP, STRUCT_STRIPLINE, STRUCT_CPW,
  MODE_ANALYSIS, MODE_SYNTHESIS, compute, buildSweep,
} from './model'
import { STRUCT_LABEL, METHOD_NOTE, CHART, reasonText, commentary } from './text'

const MARK = { ok: '✓', warn: '!', danger: '×' }
const LEVEL_RANK = { ok: 0, warn: 1, danger: 2 }
const DIM_UNITS = ['mm', 'µm', 'mil']

const FORMULA = {
  [STRUCT_MICROSTRIP]: `u = W / H
η₀ = 376.7303 Ω

a(u) = 1
    + (1/49)·ln[(u⁴+(u/52)²)/
      (u⁴+0.432)]
    + (1/18.7)·ln[1+(u/18.1)³]
b(εr) = 0.564·
    [(εr−0.9)/(εr+3)]^0.053

εeff = (εr+1)/2 +
    (εr−1)/2·(1+10/u)^(−a·b)

f_u = 6 + (2π−6)·
    exp[−(30.666/u)^0.7528]
Z_air = (η₀/2π)·
    ln[f_u/u + √(1+(2/u)²)]
Z₀ = Z_air / √εeff

Kalınlık düzeltmesi (τ = t/H):
  Δu₁ = (τ/π)·
    ln[1 + 4e/(τ·coth²√(6.517u))]
  Δu_r = (Δu₁/2)·[1 + sech√(εr−1)]`,
  [STRUCT_STRIPLINE]: `k = tanh(πW / 2b)
k' = sech(πW / 2b)

Z₀ = (30π / √εr) · K(k') / K(k)

K(k): tam eliptik integral
  (AGM ile)
εeff = εr (homojen dielektrik)`,
  [STRUCT_CPW]: `k = W / (W + 2S)
k' = √(1 − k²)

εeff ≈ (εr + 1) / 2
  (kalın substrat)
Z₀ = (30π / √εeff) · K(k') / K(k)

Bu form alt referans düzlemi
OLMAYAN yapı içindir.`,
}

export default function SingleEnded() {
  const [mode, setMode] = useState(MODE_ANALYSIS)
  const { f, set } = useToolForm(INITIAL_FORM)

  const r = useMemo(() => compute(mode, f), [mode, f])
  const s = useMemo(() => buildSweep(r), [r])
  const notes = useMemo(() => commentary(r), [r])

  const status = useMemo(() => {
    if (!r.ok || notes.length === 0) return null
    const worst = notes.reduce((acc, n) => (LEVEL_RANK[n.level] > LEVEL_RANK[acc] ? n.level : acc), 'ok')
    const count = notes.filter((n) => n.level === worst).length
    if (worst === 'ok') return { cls: 'ok', text: 'Tüm kontroller geçti' }
    if (worst === 'warn') return { cls: 'warn', text: `Sınıra yakın — ${count} uyarı` }
    return { cls: 'danger', text: `${count} kontrol sınırın dışında` }
  }, [r, notes])

  const chartSeries = s ? [{ key: 'z0', name: 'Z₀', tone: toneClass(0), points: s.points }] : []

  return (
    <>
      <Link className="backlink" to="/kategori/empedans">← Kontrollü Empedans</Link>

      <div className="tool-header">
        <h1>Single-Ended Impedance</h1>
        <p>
          Microstrip, stripline ve coplanar waveguide için karakteristik empedansı, efektif
          dielektrik sabitini ve yayılma gecikmesini hesaplar; hedef empedans için gereken hat
          genişliğini sınırlandırılmış kök aramayla bulur.
        </p>
      </div>

      <div className="tool-grid">
        {/* ---------- Sol: Girdiler ---------- */}
        <section className="panel">
          <h2>Girdiler</h2>

          <ImpedanceSchematic r={r} form={f} />

          <Segmented
            value={mode}
            onChange={setMode}
            options={[
              { value: MODE_ANALYSIS, label: 'Analiz — empedansı bul' },
              { value: MODE_SYNTHESIS, label: 'Sentez — genişliği bul' },
            ]}
          />

          <SelectField
            label="Yapı"
            value={f.structure} onChange={set('structure')}
            options={STRUCTURES.map((x) => ({ value: x, label: STRUCT_LABEL[x] }))}
          />

          {mode === MODE_ANALYSIS ? (
            <NumberField
              label="Hat genişliği (W)"
              value={f.W} onChange={set('W')}
              units={DIM_UNITS} unit={f.Wu} onUnit={set('Wu')}
            />
          ) : (
            <NumberField
              label="Hedef empedans"
              value={f.target} onChange={set('target')}
              units={['Ω']} unit="Ω" onUnit={() => {}}
              hint="Tipik hedefler: 50 Ω tek uçlu, 75 Ω video"
            />
          )}

          {f.structure === STRUCT_STRIPLINE ? (
            <NumberField
              label="Düzlemler arası mesafe (b)"
              value={f.b} onChange={set('b')}
              units={DIM_UNITS} unit={f.bu} onUnit={set('bu')}
              hint="Hat tam ortada varsayılır"
            />
          ) : (
            <NumberField
              label="Dielektrik yüksekliği (H)"
              value={f.H} onChange={set('H')}
              units={DIM_UNITS} unit={f.Hu} onUnit={set('Hu')}
              hint="Kartın toplam kalınlığı değil — hat ile referans düzlem arası"
            />
          )}

          {f.structure === STRUCT_CPW && (
            <NumberField
              label="Coplanar boşluk (S)"
              value={f.S} onChange={set('S')}
              units={DIM_UNITS} unit={f.Su} onUnit={set('Su')}
            />
          )}

          <NumberField
            label="Bakır kalınlığı (t)"
            value={f.t} onChange={set('t')}
            units={DIM_UNITS} unit={f.tu} onUnit={set('tu')}
            hint={f.structure === STRUCT_MICROSTRIP
              ? 'Kalınlık düzeltmesi uygulanır'
              : 'Bu yapının kapalı formuna dahil değil'}
          />

          <NumberField
            label="Dielektrik sabiti (εr)"
            value={f.epsR} onChange={set('epsR')}
            units={['']} unit="" onUnit={() => {}}
            hint="FR-4 için tipik 4.2–4.5; gerçek değer frekansa göre değişir"
          />

          {f.structure !== STRUCT_CPW && (
            <>
              <label className="check-row">
                <input type="checkbox" checked={f.tol} onChange={(e) => set('tol')(e.target.checked)} />
                Tolerans analizi (worst-case)
              </label>

              {f.tol && (
                <>
                  <NumberField
                    label="Genişlik toleransı (±)"
                    value={f.tolW} onChange={set('tolW')}
                    units={['%']} unit="%" onUnit={() => {}}
                  />
                  <NumberField
                    label="Dielektrik kalınlık toleransı (±)"
                    value={f.tolH} onChange={set('tolH')}
                    units={['%']} unit="%" onUnit={() => {}}
                  />
                  <NumberField
                    label="Bakır kalınlığı toleransı (±)"
                    value={f.tolT} onChange={set('tolT')}
                    units={['%']} unit="%" onUnit={() => {}}
                  />
                  <NumberField
                    label="εr toleransı (±)"
                    value={f.tolEps} onChange={set('tolEps')}
                    units={['%']} unit="%" onUnit={() => {}}
                  />
                </>
              )}
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
                  {r.mode === MODE_SYNTHESIS ? 'Gereken hat genişliği' : 'Karakteristik empedans'}
                </div>
                <div className="value">
                  {r.mode === MODE_SYNTHESIS ? fmtEng(r.W, 'm', 4) : fmtRes(r.Z0, 4)}
                </div>
                <div className="alt">
                  {r.mode === MODE_SYNTHESIS
                    ? <>Z₀ = {fmtRes(r.Z0, 4)} &nbsp;·&nbsp; hedef {fmtRes(r.target, 3)}</>
                    : <>W = {fmtEng(r.W, 'm', 4)} &nbsp;·&nbsp; εeff = {fmt(r.epsEff, 4)}</>}
                </div>
              </div>

              {status && <span className={`status ${status.cls}`}>{status.text}</span>}

              <p className="method-note">{METHOD_NOTE}</p>

              <table className="result-table">
                <tbody>
                  {r.tolerance && (
                    <tr className="mini-head">
                      <td>Z₀ — min · nominal · maks</td>
                      <td>
                        {fmtRes(r.tolerance.min, 4)} · {fmtRes(r.tolerance.nom, 4)} ·{' '}
                        {fmtRes(r.tolerance.max, 4)}
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td>Karakteristik empedans</td>
                    <td>{fmtRes(r.Z0, 5)}</td>
                  </tr>
                  <tr>
                    <td>Efektif dielektrik sabiti</td>
                    <td>{fmt(r.epsEff, 5)}</td>
                  </tr>
                  <tr>
                    <td>Yayılma gecikmesi</td>
                    <td>{fmt(r.tpdPsPerMm, 4)} ps/mm</td>
                  </tr>
                  <tr>
                    <td>Yayılma hızı</td>
                    <td>{fmt(1 / r.tpdPsPerMm * 1000, 4)} mm/ns</td>
                  </tr>
                  <tr>
                    <td>Hat genişliği</td>
                    <td>{fmtEng(r.W, 'm', 5)}</td>
                  </tr>
                  <tr>
                    <td>Dielektrik yüksekliği</td>
                    <td>{fmtEng(r.height, 'm', 5)}</td>
                  </tr>
                  {r.u != null && (
                    <tr>
                      <td>W/H oranı</td>
                      <td>{fmt(r.u, 4)}</td>
                    </tr>
                  )}
                  {r.k != null && (
                    <tr>
                      <td>Eliptik modül k</td>
                      <td>{fmt(r.k, 5)}</td>
                    </tr>
                  )}
                  <tr>
                    <td>Kullanılan yöntem</td>
                    <td>{r.model}</td>
                  </tr>
                </tbody>
              </table>

              <h2 className="section">Mühendislik yorumu</h2>
              <ul className="commentary">
                {notes.map((n) => (
                  <li key={n.text} className={n.level}>
                    <span className="mark" aria-hidden="true">{MARK[n.level]}</span>
                    <span>{n.text}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        {/* ---------- Sağ: Teknik detay ---------- */}
        <section className="panel panel-detail">
          <h2>Teknik detay</h2>

          <pre className="formula">{FORMULA[f.structure]}</pre>

          {r.ok && (
            <ul className="detail-list">
              <li>Model: {r.model}; yöntem alanı `{r.method}`.</li>
              {r.u != null && <li>u = W/H = {fmt(r.u, 5)}; τ = t/H = {fmt(r.tau, 5)}.</li>}
              {r.mode === MODE_SYNTHESIS && (
                <li>Genişlik {r.solvedBy} yöntemiyle, fiziksel sınırlar içinde çözüldü.</li>
              )}
              <li>
                Geçerlilik aralığı kontrolü: {r.inRange ? 'geometri aralık içinde' : 'geometri aralık dışında'}.
              </li>
              <li>Ara değerlerde yuvarlama yapılmaz; yalnızca gösterim yuvarlanır.</li>
            </ul>
          )}

          <h2 className="section">Geçerlilik ve varsayımlar</h2>
          <ul className="detail-list">
            <li>
              Kapalı form denklemleri alan çözücü değildir. Üretim toleransları ve karmaşık
              geometri için iki veya üç boyutlu alan çözümü gerekir.
            </li>
            <li>Solder mask, çoklu dielektrik ve trapez bakır kesiti modelde yoktur.</li>
            <li>
              Dielektrik sabiti frekanstan bağımsız kabul edilir. Gerçek Dk frekansla düşer;
              yüksek hızda üreticinin frekansa bağlı verisi kullanılmalıdır.
            </li>
            <li>Bakır pürüzlülüğü ve iletken kaybı hesaba girmez.</li>
            <li>
              İdeal coplanar waveguide sonucu, altında referans düzlemi bulunan yapı için
              kullanılmamalıdır.
            </li>
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
                { label: 'Z₀', tone: toneClass(0), kind: 'line' },
                ...s.refs.map(() => ({ label: 'hedef empedans', tone: 'tone-muted', kind: 'line' })),
              ]}
            />

            <LineChart
              xScale="log"
              xLabel={CHART.x}
              yLabel={CHART.y}
              series={chartSeries}
              refLines={s.refs.map((ref) => ({ key: ref.key, y: ref.y, label: `hedef ${fmtRes(ref.y, 3)}` }))}
              marker={{ ...s.marker, label: 'çalışma noktası' }}
              formatX={(v) => fmt(v, 3)}
              formatY={(v) => fmt(v, 3)}
              caption={CHART.caption}
            />

            <ChartDataTable
              xLabel={CHART.x}
              series={chartSeries}
              every={6}
              formatX={(v) => `${fmt(v, 4)} mm`}
              formatY={(v) => fmtRes(v, 4)}
            />
          </>
        ) : (
          <p className="empty-note">Grafik için geçerli girdi gerekli.</p>
        )}
      </section>

    </>
  )
}
