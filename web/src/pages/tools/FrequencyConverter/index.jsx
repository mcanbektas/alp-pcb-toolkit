import { useMemo, useRef } from 'react'
import LangLink from '../../../components/LangLink'
import NumberField from '../../../components/NumberField'
import Segmented from '../../../components/Segmented'
import ToolHeader from '../../../components/ToolHeader'
import ResultPanel from '../../../components/ResultPanel'
import Commentary from '../../../components/Commentary'
import LineChart, { ChartLegend, ChartDataTable, toneClass } from '../../../components/LineChart'
import ReportDialog from '../../../components/ReportDialog'
import SaveToProject from '../../../components/SaveToProject'
import useToolForm from '../../../hooks/useToolForm'
import { statusChip, worstLevel, countAtLevel } from '../../../lib/statusChip'
import useSavedCalculation from '../../../hooks/useSavedCalculation'
import { useLang } from '../../../hooks/useLang'
import { commonText } from '../../../data/uiText'
import { fmt, fmtEng } from '../../../lib/num'
import FrequencySchematic from './schematic'
import {
  INITIAL_FORM, SOURCES, SOURCE_FREQUENCY, SOURCE_PERIOD,
  FREQ_UNITS, TIME_UNITS, compute, buildSweep,
} from './model'
import { getText } from './text'
import { buildReportSection } from './report'

export default function FrequencyConverter() {
  const { f, set, patch } = useToolForm(INITIAL_FORM)

  // Kaydedilmiş hesabı geri yükler (?hesap=<id>) ve ekranı o kayda bağlar;
  // SaveToProject bağlı kayda yeni satır açmak yerine üzerine yazar.
  const saved = useSavedCalculation({
    toolKey: 'freq-conv', initialForm: INITIAL_FORM, patch,
  })
  const { lang } = useLang()

  const text = useMemo(() => getText(lang), [lang])
  const ui = useMemo(() => commonText(lang), [lang])

  const r = useMemo(() => compute(f, text.fieldLabels), [f, text])
  const s = useMemo(() => buildSweep(r), [r])
  const notes = useMemo(() => text.commentary(r), [r, text])

  // Rapor bölümü SVG'siz kurulur; ReportDialog indirme anında canlı DOM'dan
  // (aşağıdaki ref'ler) şematik ve grafiği okuyup satır içine çevirir.
  const reportSection = useMemo(() => buildReportSection({ f, r, s, text }), [f, r, s, text])
  const schematicRef = useRef(null)
  const chartRef = useRef(null)

  const status = useMemo(() => {
    if (!r.ok || notes.length === 0) return null
    const levels = notes.map((n) => n.level)
    const worst = worstLevel(levels)
    return statusChip(worst, countAtLevel(levels, worst), ui)
  }, [r, notes, ui])

  const chartSeries = s ? [{ key: 'period', name: 'T', tone: toneClass(0), points: s.points }] : []

  return (
    <>
      <LangLink className="backlink" to="/kategori/donusturucular">{text.backlink}</LangLink>

      <ToolHeader title={text.title} intro={text.intro} />

      <div className="tool-grid">
        {/* ---------- Sol: Girdiler ---------- */}
        <section className="panel">
          <h2>{ui.inputs}</h2>

          <FrequencySchematic ref={schematicRef} r={r} text={text.schematic} />

          <Segmented
            value={f.source}
            onChange={set('source')}
            options={SOURCES.map((x) => ({ value: x, label: text.sourceLabel[x] }))}
          />

          {f.source === SOURCE_PERIOD ? (
            <NumberField
              label={text.fields.period.label}
              value={f.period} onChange={set('period')}
              units={TIME_UNITS} unit={f.periodu} onUnit={set('periodu')}
              hint={text.fields.period.hint}
            />
          ) : (
            <NumberField
              label={text.fields.freq.label}
              value={f.freq} onChange={set('freq')}
              units={FREQ_UNITS} unit={f.frequ} onUnit={set('frequ')}
              hint={text.fields.freq.hint}
            />
          )}
        </section>

        {/* ---------- Orta: Sonuç ---------- */}
        {/* İç `r.ok &&` kapısı gerekli: children JSX'i ResultPanel çizmese de
            burada kurulur — bkz. TraceWidth'teki aynı not. */}
        <ResultPanel r={r} reason={text.reasonText}>
          {r.ok && (
            <>
              <div className="big-result">
                <div className="label">{text.mainLabel[r.source]}</div>
                <div className="value">
                  {r.source === SOURCE_FREQUENCY
                    ? fmtEng(r.period, 's', 4)
                    : fmtEng(r.frequency, 'Hz', 4)}
                </div>
                <div className="alt">
                  {r.source === SOURCE_FREQUENCY
                    ? `f = ${fmtEng(r.frequency, 'Hz', 4)}`
                    : `T = ${fmtEng(r.period, 's', 4)}`}
                  &nbsp;·&nbsp; ω = {fmtEng(r.omega, 'rad/s', 4)}
                </div>
              </div>

              {status && <span className={`status ${status.cls}`}>{status.text}</span>}

              <table className="result-table">
                <tbody>
                  <tr className="mini-head">
                    <td>{text.table.frequency}</td>
                    <td>{text.table.equivalents}</td>
                  </tr>
                  {r.freqRows.map((row) => (
                    <tr key={row.unit}>
                      <td>{row.unit}</td>
                      <td>{fmt(row.value, 6)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <h2 className="section">{text.table.period}</h2>
              <table className="result-table">
                <tbody>
                  <tr className="mini-head">
                    <td>{text.table.period}</td>
                    <td>{text.table.equivalents}</td>
                  </tr>
                  {r.timeRows.map((row) => (
                    <tr key={row.unit}>
                      <td>{row.unit}</td>
                      <td>{fmt(row.value, 6)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <Commentary items={notes} />
            </>
          )}
        </ResultPanel>

        {/* ---------- Sağ: Teknik detay ---------- */}
        <section className="panel panel-detail">
          <h2>{ui.technicalDetail}</h2>

          <pre className="formula">{text.formula}</pre>

          {r.ok && (
            <ul className="detail-list">
              <li>{text.detail.entered(r)}</li>
              <li>{text.detail.derived(r)}</li>
              <li>{text.detail.omega(fmtEng(r.omega, 'rad/s', 6))}</li>
              <li>{text.detail.noRounding}</li>
            </ul>
          )}

          <h2 className="section">{ui.sources}</h2>
          <ul className="detail-list">
            {text.sourceNotes.map((n) => <li key={n}>{n}</li>)}
          </ul>

          <h2 className="section">{ui.validity}</h2>
          <ul className="detail-list">
            {text.validity.map((n) => <li key={n}>{n}</li>)}
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
            <ChartLegend items={[{ label: text.chart.legend, tone: toneClass(0), kind: 'line' }]} />

            <LineChart
              ref={chartRef}
              xScale="log"
              xLabel={text.chart.x}
              yLabel={text.chart.y}
              series={chartSeries}
              marker={{ ...s.marker, label: text.chart.marker }}
              formatX={(v) => fmtEng(v, 'Hz', 3)}
              formatY={(v) => fmtEng(v, 's', 3)}
              caption={text.chart.caption}
            />

            <ChartDataTable
              xLabel={text.chart.x}
              series={chartSeries}
              every={10}
              formatX={(v) => fmtEng(v, 'Hz', 4)}
              formatY={(v) => fmtEng(v, 's', 4)}
            />
          </>
        ) : (
          <p className="empty-note">{ui.chartNeedsInput}</p>
        )}
      </section>

      <ReportDialog section={reportSection} schematicRef={schematicRef} chartRef={chartRef} />
      <SaveToProject
        toolKey="freq-conv"
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
