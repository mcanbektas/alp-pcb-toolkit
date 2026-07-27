import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import NumberField from '../../../components/NumberField'
import Segmented from '../../../components/Segmented'
import LineChart, { ChartLegend, ChartDataTable, toneClass } from '../../../components/LineChart'
import useToolForm from '../../../hooks/useToolForm'
import { fmt, fmtEng, fmtPct, THOUSANDS_MESSAGE } from '../../../lib/num'
import AwgSchematic from './schematic'
import {
  INITIAL_FORM, DIRECTIONS, DIR_DIAMETER, SWEEPS, SWEEP_D,
  compute, buildSweep,
} from './model'
import {
  CHART, DIR_LABEL, SWEEP_LABEL, SWEEP_AXIS, SWEEP_CAPTION, FIELD_HINT,
  awgLabel, reasonText, commentary, validityNotes,
} from './text'

const MARK = { ok: '✓', warn: '!', danger: '×' }
const LEVEL_RANK = { ok: 0, warn: 1, danger: 2 }

export default function AwgConverter() {
  const { f, set } = useToolForm(INITIAL_FORM)
  const [sweep, setSweep] = useState(SWEEP_D)

  const r = useMemo(() => compute(f), [f])
  const s = useMemo(() => buildSweep(r, sweep), [r, sweep])
  const notes = useMemo(() => commentary(r), [r])
  const validity = useMemo(() => validityNotes(r), [r])

  // Durum çipi — en kötü bulgu seviyesi
  const status = useMemo(() => {
    if (!r.ok || notes.length === 0) return null
    const worst = notes.reduce((acc, n) => (LEVEL_RANK[n.level] > LEVEL_RANK[acc] ? n.level : acc), 'ok')
    const count = notes.filter((n) => n.level === worst).length
    if (worst === 'ok') return { cls: 'ok', text: 'Tüm kontroller geçti' }
    if (worst === 'warn') return { cls: 'warn', text: `Sınıra yakın — ${count} uyarı` }
    return { cls: 'danger', text: `${count} kontrol sınırın dışında` }
  }, [r, notes])

  const chartSeries = s ? [{ key: 'awg', name: 'AWG', tone: toneClass(0), points: s.points }] : []

  return (
    <>
      <div className="tool-header">
        <h1>AWG Wire Gauge Converter</h1>
        <p>
          AWG numarası ile çıplak iletken çapı ve kesit alanı arasında iki yönlü çevirir; çaptan
          numaraya dönüşü analitik tersiyle çözer, sonucu hem kesirli hem en yakın standart
          numara olarak verir ve ölçeğin geçerli sınırlarını birlikte gösterir.
        </p>
      </div>

      <div className="tool-grid">
        {/* ---------- Sol: Girdiler ---------- */}
        <section className="panel">
          <h2>Girdiler</h2>

          <AwgSchematic r={r} />

          <Segmented
            value={f.dir}
            onChange={set('dir')}
            options={DIRECTIONS.map((x) => ({ value: x, label: DIR_LABEL[x] }))}
          />

          {f.dir === DIR_DIAMETER ? (
            <NumberField
              label="İletken çapı (çıplak)"
              value={f.d} onChange={set('d')}
              units={['mm', 'um', 'mil', 'inch']} unit={f.du} onUnit={set('du')}
              hint={FIELD_HINT.d}
            />
          ) : (
            <NumberField
              label="AWG numarası"
              value={f.awg} onChange={set('awg')}
              units={['AWG']} unit="AWG" onUnit={() => {}}
              hint={FIELD_HINT.awg}
            />
          )}
        </section>

        {/* ---------- Orta: Sonuç ---------- */}
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
                  {r.dir === DIR_DIAMETER ? 'AWG numarası (kesirli)' : 'Çıplak iletken çapı'}
                </div>
                <div className="value">
                  {r.dir === DIR_DIAMETER
                    ? `AWG ${fmt(r.awgExact, 5)}`
                    : `${fmt(r.dUnits.mm, 4)} mm`}
                </div>
                <div className="alt">
                  {r.dir === DIR_DIAMETER ? (
                    <>
                      en yakın standart AWG {awgLabel(r.awgNearest)} &nbsp;·&nbsp;
                      {' '}{fmt(r.nearest.dUnits.mm, 4)} mm &nbsp;·&nbsp;
                      {' '}{fmt(r.nearest.aUnits.mm2, 4)} mm²
                    </>
                  ) : (
                    <>
                      {fmt(r.dUnits.mil, 4)} mil &nbsp;·&nbsp; {fmt(r.dUnits.inch, 4)} inch
                      &nbsp;·&nbsp; {fmt(r.aUnits.mm2, 4)} mm²
                    </>
                  )}
                </div>
              </div>

              {status && <span className={`status ${status.cls}`}>{status.text}</span>}

              <table className="result-table">
                <tbody>
                  <tr className="mini-head">
                    <td>Çap</td>
                    <td>{r.standard ? `AWG ${awgLabel(r.awgExact)}` : `AWG ${fmt(r.awgExact, 5)}`}</td>
                  </tr>
                  <tr><td>mm</td><td>{fmt(r.dUnits.mm, 5)}</td></tr>
                  <tr><td>µm</td><td>{fmt(r.dUnits.um, 5)}</td></tr>
                  <tr><td>mil</td><td>{fmt(r.dUnits.mil, 5)}</td></tr>
                  <tr><td>inch</td><td>{fmt(r.dUnits.inch, 5)}</td></tr>
                  <tr>
                    <td>SI</td>
                    <td>{fmtEng(r.d, 'm', 5)}</td>
                  </tr>
                </tbody>
              </table>

              <h2 className="section">Kesit alanı</h2>
              <table className="result-table">
                <tbody>
                  <tr className="mini-head">
                    <td>A = π·d²/4</td>
                    <td>yuvarlak kesit</td>
                  </tr>
                  <tr><td>mm²</td><td>{fmt(r.aUnits.mm2, 5)}</td></tr>
                  <tr><td>mil²</td><td>{fmt(r.aUnits.mil2, 6)}</td></tr>
                  <tr><td>µm²</td><td>{fmt(r.aUnits.um2, 5)}</td></tr>
                  <tr><td>SI</td><td>{fmtEng(r.area, 'm²', 5)}</td></tr>
                </tbody>
              </table>

              <h2 className="section">En yakın standart numara</h2>
              <table className="result-table">
                <tbody>
                  <tr className="mini-head">
                    <td>AWG {awgLabel(r.awgNearest)}</td>
                    <td>{r.standard ? 'girilen değerin kendisi' : 'yuvarlanmış karşılık'}</td>
                  </tr>
                  <tr><td>Çap</td><td>{fmt(r.nearest.dUnits.mm, 5)} mm <span className="sub">({fmt(r.nearest.dUnits.mil, 4)} mil)</span></td></tr>
                  <tr><td>Kesit alanı</td><td>{fmt(r.nearest.aUnits.mm2, 5)} mm² <span className="sub">({fmt(r.nearest.aUnits.mil2, 6)} mil²)</span></td></tr>
                  <tr><td>Çap farkı</td><td>{fmtPct(r.dDeltaPct)}</td></tr>
                  <tr><td>Kesit farkı</td><td>{fmtPct(r.areaDeltaPct)}</td></tr>
                </tbody>
              </table>

              <h2 className="section">Komşu standart numaralar</h2>
              <table className="result-table">
                <tbody>
                  <tr className="mini-head">
                    <td>Numara</td>
                    <td>çap · kesit</td>
                  </tr>
                  {r.neighbors.map((n) => (
                    <tr key={n.awg}>
                      <td>
                        AWG {awgLabel(n.awg)}
                        {n.awg === r.awgNearest && <span className="sub"> (en yakın)</span>}
                      </td>
                      <td>{fmt(n.dUnits.mm, 4)} mm · {fmt(n.aUnits.mm2, 4)} mm²</td>
                    </tr>
                  ))}
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

          <pre className="formula">{`Numaradan çap:
  d[inch] =
    0.005 × 92^((36 − AWG)/39)
  d[mm] =
    0.127 × 92^((36 − AWG)/39)

Kesit alanı:
  A = π·d²/4

Çaptan numara (analitik ters):
  AWG = 36 − 39 ·
    ln(d[mm]/0.127) / ln(92)

Birim bağıntıları:
  1 inch = 25.4 mm
  1 mil = 0.001 inch = 0.0254 mm
  1 mil² = 0.00064516 mm²

Geçerli aralık: AWG -3 (4/0) … 40`}</pre>

          {r.ok && (
            <ul className="detail-list">
              <li>Üs: (36 − {fmt(r.awgExact, 5)}) / 39 = {fmt(r.exponent, 5)}</li>
              <li>Çarpan: 92^{fmt(r.exponent, 5)} = {fmt(r.factor, 6)}</li>
              <li>
                Çap: 0.127 mm × {fmt(r.factor, 6)} = {fmt(r.dUnits.mm, 6)} mm
                {r.dir === DIR_DIAMETER && <> <span className="sub">(çap girildi, numara bundan çözüldü)</span></>}
              </li>
              <li>Kesit: π·d²/4 = {fmt(r.aUnits.mm2, 6)} mm² = {fmt(r.aUnits.mil2, 6)} mil²</li>
              <li>Ölçek oranı: 92^(1/39) = {fmt(Math.pow(92, 1 / 39), 6)} — bir numara başına çap oranı</li>
              <li>Ara değerlerde yuvarlama yapılmaz; yalnızca gösterim yuvarlanır.</li>
            </ul>
          )}

          <h2 className="section">Geçerlilik ve varsayımlar</h2>
          <ul className="detail-list">
            {validity.map((w) => <li key={w} className="w">{w}</li>)}
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
            options={SWEEPS.map((x) => ({ value: x, label: SWEEP_LABEL[x] }))}
          />
        </div>

        {s ? (
          <>
            <ChartLegend items={[{ label: 'tam numaralar', tone: toneClass(0), kind: 'line' }]} />

            <LineChart
              xScale="log"
              xLabel={SWEEP_AXIS[sweep]}
              yLabel={CHART.y}
              series={chartSeries}
              marker={s.marker ? { ...s.marker, label: 'seçilen' } : null}
              formatX={(v) => fmt(v, 3)}
              formatY={(v) => fmt(v, 3)}
              caption={SWEEP_CAPTION[sweep]}
            />

            <ChartDataTable
              xLabel={SWEEP_AXIS[sweep]}
              series={chartSeries}
              every={5}
              formatX={(v) => fmt(v, 4)}
              formatY={(v) => `AWG ${awgLabel(v)}`}
            />
          </>
        ) : (
          <p className="empty-note">Grafik için geçerli girdi gerekli.</p>
        )}
      </section>

      <Link className="backlink" to="/kategori/uretim-dfm">← PCB Üretim, DFM ve Dönüşümler</Link>
    </>
  )
}
