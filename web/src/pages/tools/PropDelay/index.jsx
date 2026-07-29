import { useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import NumberField from '../../../components/NumberField'
import EpsEffFields, { epsEffRows } from '../../../components/EpsEffFields'
import LineChart, { ChartLegend, ChartDataTable, toneClass } from '../../../components/LineChart'
import ReportDialog from '../../../components/ReportDialog'
import SaveToProject from '../../../components/SaveToProject'
import useToolForm from '../../../hooks/useToolForm'
import useSavedCalculation from '../../../hooks/useSavedCalculation'
import { useLang } from '../../../hooks/useLang'
import { commonText } from '../../../data/uiText'
import { fmt, fmtEng } from '../../../lib/num'
import WaveSchematic from './schematic'
import { INITIAL_FORM, compute, buildSweep } from './model'
import { getText } from './text'
import { buildReportSection } from './report'

const MARK = { ok: '✓', warn: '!', danger: '×' }
const LEVEL_RANK = { ok: 0, warn: 1, danger: 2 }

export default function PropDelay() {
  const { f, set, patch } = useToolForm(INITIAL_FORM)

  // Kaydedilmiş hesabı geri yükler (?hesap=<id>) ve ekranı o kayda bağlar;
  // SaveToProject bağlı kayda yeni satır açmak yerine üzerine yazar.
  const saved = useSavedCalculation({
    toolKey: 'prop-delay', initialForm: INITIAL_FORM, patch,
  })
  const { lang } = useLang()

  const text = useMemo(() => getText(lang), [lang])
  const ui = useMemo(() => commonText(lang), [lang])

  const r = useMemo(() => compute(f, text.fieldLabels), [f, text])
  const s = useMemo(() => buildSweep(r), [r])
  const notes = useMemo(() => text.commentary(r), [r, text])

  // Rapor bölümü SVG'siz kurulur; ReportDialog indirme anında canlı DOM'dan
  // (aşağıdaki ref'ler) şematik ve grafiği okuyup satır içine çevirir.
  const reportSection = useMemo(
    () => buildReportSection({ f, r, s, text, lang }),
    [f, r, s, text, lang],
  )
  const schematicRef = useRef(null)
  const chartRef = useRef(null)

  const status = useMemo(() => {
    if (!r.ok || notes.length === 0) return null
    const worst = notes.reduce((acc, n) => (LEVEL_RANK[n.level] > LEVEL_RANK[acc] ? n.level : acc), 'ok')
    const count = notes.filter((n) => n.level === worst).length
    if (worst === 'ok') return { cls: 'ok', text: ui.statusOk }
    if (worst === 'warn') return { cls: 'warn', text: ui.statusWarn(count) }
    return { cls: 'danger', text: ui.statusDanger(count) }
  }, [r, notes, ui])

  const chartSeries = s
    ? [{ key: 'deg', name: text.legendElectricalLength, tone: toneClass(0), points: s.points }]
    : []

  return (
    <>
      <Link className="backlink" to="/kategori/sinyal-butunlugu">{text.backlink}</Link>

      <div className="tool-header">
        <h1>{text.title}</h1>
        <p>{text.intro}</p>
      </div>

      <div className="tool-grid">
        {/* ---------- Sol: Girdiler ---------- */}
        <section className="panel">
          <h2>{ui.inputs}</h2>

          <WaveSchematic ref={schematicRef} r={r} text={text.schematic} />

          <EpsEffFields f={f} set={set} />

          <NumberField
            label={text.fields.length.label}
            value={f.length} onChange={set('length')}
            units={['mm', 'cm', 'm', 'mil', 'inch']} unit={f.lengthu} onUnit={set('lengthu')}
          />

          <NumberField
            label={text.fields.freq.label}
            value={f.freq} onChange={set('freq')}
            units={['Hz', 'kHz', 'MHz', 'GHz']} unit={f.frequ} onUnit={set('frequ')}
            hint={text.fields.freq.hint}
          />
        </section>

        {/* ---------- Orta: Ana sonuç ---------- */}
        <section className="panel">
          <h2>{ui.result}</h2>

          {!r.ok ? (
            r.ambiguous ? (
              <p className="empty-note warn">{ui.thousandsNote(r.ambiguous)}</p>
            ) : (
              <p className="empty-note">{text.reasonText(r.reason)}</p>
            )
          ) : (
            <>
              <div className="big-result">
                <div className="label">{text.bigResult}</div>
                <div className="value">{fmt(r.tpdPsPerMm, 4)} ps/mm</div>
                <div className="alt">
                  {text.bigResultAlt(fmtEng(r.delay, 's', 4), fmt(r.degrees, 4))}
                </div>
              </div>

              {status && <span className={`status ${status.cls}`}>{status.text}</span>}

              <table className="result-table">
                <tbody>
                  {epsEffRows(r.eps, fmt, lang).map((row) => (
                    <tr key={row.label}>
                      <td>{row.label}</td>
                      <td>{row.value}</td>
                    </tr>
                  ))}
                  <tr>
                    <td>{text.table.tpd}</td>
                    <td>{fmt(r.tpdPsPerMm, 5)} ps/mm</td>
                  </tr>
                  <tr>
                    <td>{text.table.delay}</td>
                    <td>{fmtEng(r.delay, 's', 5)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.vp}</td>
                    <td>{fmtEng(r.vp, 'm/s', 5)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.lambda0}</td>
                    <td>{fmtEng(r.lambda0, 'm', 5)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.lambdaG}</td>
                    <td>{fmtEng(r.lambdaG, 'm', 5)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.quarter}</td>
                    <td>{fmtEng(r.quarter, 'm', 5)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.half}</td>
                    <td>{fmtEng(r.half, 'm', 5)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.electricalLength}</td>
                    <td>{fmt(r.degrees, 5)}° · {fmt(r.radians, 5)} rad</td>
                  </tr>
                  <tr>
                    <td>{text.table.fraction}</td>
                    <td>{fmt(r.fraction, 5)} λ</td>
                  </tr>
                  <tr>
                    <td>{text.table.quarterWaveFreq}</td>
                    <td>{fmtEng(r.quarterWaveFreq, 'Hz', 5)}</td>
                  </tr>
                </tbody>
              </table>

              <h2 className="section">{ui.commentary}</h2>
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
          <h2>{ui.technicalDetail}</h2>

          <pre className="formula">{text.formula}</pre>

          {r.ok && (
            <ul className="detail-list">
              <li>{text.detail.epsSource(r.eps)}</li>
              <li>{text.detail.sqrtEps(fmt(Math.sqrt(r.eps.epsEff), 5))}</li>
              <li>{text.detail.practicalCoeff}</li>
              <li>{text.detail.noRounding}</li>
            </ul>
          )}

          <h2 className="section">{ui.validity}</h2>
          <ul className="detail-list">
            {text.validity.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </section>
      </div>

      {/* ---------- Alt: Parametrik grafik ---------- */}
      <section className="panel panel-chart">
        <div className="chart-head">
          <h2>{ui.chart}</h2>
        </div>

        {s ? (
          <>
            <ChartLegend
              items={[
                { label: text.legendElectricalLength, tone: toneClass(0), kind: 'line' },
                { label: text.legendQuarter, tone: 'tone-muted', kind: 'line' },
                { label: text.legendHalf, tone: 'tone-muted', kind: 'line' },
              ]}
            />

            <LineChart
              ref={chartRef}
              xScale="log"
              xLabel={text.chart.x}
              yLabel={text.chart.y}
              series={chartSeries}
              refLines={s.refs.map((ref) => ({
                key: ref.key,
                y: ref.y,
                label: ref.key === 'quarter' ? text.refQuarter : text.refHalf,
              }))}
              marker={{ ...s.marker, label: text.operatingFrequency }}
              formatX={(v) => fmtEng(v, '', 3).replace(' ', '')}
              formatY={(v) => fmt(v, 3)}
              caption={text.chart.caption}
            />

            <ChartDataTable
              xLabel={text.chart.x}
              series={chartSeries}
              every={6}
              formatX={(v) => fmtEng(v, 'Hz', 4)}
              formatY={(v) => `${fmt(v, 4)}°`}
            />
          </>
        ) : (
          <p className="empty-note">{ui.chartNeedsInput}</p>
        )}
      </section>

      <ReportDialog section={reportSection} schematicRef={schematicRef} chartRef={chartRef} />
      <SaveToProject
        toolKey="prop-delay"
        f={f}
        r={r}
        section={reportSection}
        schematicRef={schematicRef}
        chartRef={chartRef}
        saved={saved}
      />
    </>
  )
}
