import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
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
import { fmt, fmtPow } from '../../../lib/num'
import ThermalViaSchematic from './schematic'
import { INITIAL_FORM, MODE_ANALYSIS, MODE_SYNTHESIS, compute, buildSweep } from './model'
import { getText } from './text'
import { buildReportSection } from './report'

const DIA_UNITS = ['mm', 'µm', 'mil']

export default function ThermalVia() {
  const [mode, setMode] = useState(MODE_ANALYSIS)
  const { f, set, patch } = useToolForm(INITIAL_FORM)

  // Kaydedilmiş hesabı geri yükler (?hesap=<id>) ve ekranı o kayda bağlar;
  // SaveToProject bağlı kayda yeni satır açmak yerine üzerine yazar.
  const saved = useSavedCalculation({
    toolKey: 'thermal-via', initialForm: INITIAL_FORM, patch, setMode,
  })
  const { lang } = useLang()

  const text = useMemo(() => getText(lang), [lang])
  const ui = useMemo(() => commonText(lang), [lang])

  const r = useMemo(() => compute(mode, f, text.fieldLabels), [mode, f, text])
  const s = useMemo(() => buildSweep(r), [r])
  const notes = useMemo(() => text.commentary(r), [r, text])

  // Rapor bölümü SVG'siz kurulur; ReportDialog indirme anında canlı DOM'dan
  // (aşağıdaki ref'ler) şematik ve grafiği okuyup satır içine çevirir.
  const reportSection = useMemo(() => buildReportSection({ mode, f, r, s, text }), [mode, f, r, s, text])
  const schematicRef = useRef(null)
  const chartRef = useRef(null)

  const status = useMemo(() => {
    if (!r.ok || notes.length === 0) return null
    const levels = notes.map((n) => n.level)
    const worst = worstLevel(levels)
    return statusChip(worst, countAtLevel(levels, worst), ui)
  }, [r, notes, ui])

  const chartSeries = s ? [{ key: 'rth', name: text.schematic.arrayR, tone: toneClass(0), points: s.points }] : []

  return (
    <>
      <Link className="backlink" to="/kategori/via-padstack">{text.backlink}</Link>

      <ToolHeader title={text.title} intro={text.intro} />

      <div className="tool-grid">
        {/* ---------- Sol: Girdiler ---------- */}
        <section className="panel">
          <h2>{ui.inputs}</h2>

          <ThermalViaSchematic ref={schematicRef} r={r} text={text.schematic} />

          <Segmented
            value={mode}
            onChange={setMode}
            options={[
              { value: MODE_ANALYSIS, label: text.modeAnalysis },
              { value: MODE_SYNTHESIS, label: text.modeSynthesis },
            ]}
          />

          <NumberField
            label={text.fields.Df.label}
            value={f.Df} onChange={set('Df')}
            units={DIA_UNITS} unit={f.Dfu} onUnit={set('Dfu')}
            hint={text.fields.Df.hint}
          />
          <NumberField
            label={text.fields.tp.label}
            value={f.tp} onChange={set('tp')}
            units={DIA_UNITS} unit={f.tpu} onUnit={set('tpu')}
          />
          <NumberField
            label={text.fields.H.label}
            value={f.H} onChange={set('H')}
            units={DIA_UNITS} unit={f.Hu} onUnit={set('Hu')}
          />

          {mode === MODE_ANALYSIS ? (
            <NumberField
              label={text.fields.N.label}
              value={f.N} onChange={set('N')}
              units={[text.countUnit]} unit={text.countUnit} onUnit={() => {}}
            />
          ) : (
            <NumberField
              label={text.fields.Q.label}
              value={f.Q} onChange={set('Q')}
              units={['W', 'mW']} unit={f.Qu} onUnit={set('Qu')}
            />
          )}

          <NumberField
            label={text.fields.deltaT.label}
            value={f.deltaT} onChange={set('deltaT')}
            units={['°C']} unit="°C" onUnit={() => {}}
            hint={text.fields.deltaT.hint}
          />

          <label className="check-row">
            <input type="checkbox" checked={f.filled} onChange={(e) => set('filled')(e.target.checked)} />
            {text.fields.filled}
          </label>

          <NumberField
            label={text.fields.k.label}
            value={f.k} onChange={set('k')}
            units={['W/(m·K)']} unit="W/(m·K)" onUnit={() => {}}
            hint={text.fields.k.hint}
          />
        </section>

        {/* ---------- Orta: Ana sonuç ---------- */}
        {/* İç `r.ok &&` kapısı gerekli: children JSX'i ResultPanel çizmese de
            burada kurulur — bkz. TraceWidth'teki aynı not. */}
        <ResultPanel r={r} reason={text.reasonText}>
          {r.ok && (
            <>
              <div className="big-result">
                <div className="label">
                  {r.mode === MODE_SYNTHESIS ? text.bigResult.synthesis : text.bigResult.analysis}
                </div>
                <div className="value">
                  {r.mode === MODE_SYNTHESIS ? r.N : `${fmt(r.Rarray, 4)} °C/W`}
                </div>
                <div className="alt">
                  {r.mode === MODE_SYNTHESIS
                    ? <>{text.bigResult.arrayR} {fmt(r.Rarray, 4)} °C/W &nbsp;·&nbsp; {text.bigResult.conducted} {fmtPow(r.actualQ, 3)}</>
                    : <>{text.bigResult.singleR} {fmt(r.Rsingle, 4)} °C/W &nbsp;·&nbsp; {text.bigResult.conducted} {fmtPow(r.actualQ, 3)}</>}
                </div>
              </div>

              {status && <span className={`status ${status.cls}`}>{status.text}</span>}

              <table className="result-table">
                <tbody>
                  <tr>
                    <td>{text.table.area}</td>
                    <td>{fmt(r.area * 1e6, 4)} mm²</td>
                  </tr>
                  {r.filled && (
                    <tr>
                      <td>{text.table.fillArea}</td>
                      <td>{fmt(r.fillArea * 1e6, 4)} mm²</td>
                    </tr>
                  )}
                  <tr>
                    <td>{text.table.Rsingle}</td>
                    <td>{fmt(r.Rsingle, 5)} °C/W</td>
                  </tr>
                  <tr>
                    <td>{text.table.Rarray(r.N)}</td>
                    <td>{fmt(r.Rarray, 5)} °C/W</td>
                  </tr>
                  <tr>
                    <td>{text.table.improvement}</td>
                    <td>{fmt(r.improvementVsOne, 4)}×</td>
                  </tr>
                  <tr>
                    <td>{text.table.deltaT}</td>
                    <td>{fmt(r.deltaT, 4)} °C</td>
                  </tr>
                  <tr>
                    <td>{text.table.actualQ}</td>
                    <td>{fmtPow(r.actualQ, 5)}</td>
                  </tr>
                  {r.mode === MODE_SYNTHESIS && (
                    <tr>
                      <td>{text.table.Rneeded}</td>
                      <td>{fmt(r.Rneeded, 5)} °C/W</td>
                    </tr>
                  )}
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
              <li>{text.detail.conductivity(r.k)}</li>
              <li>{text.detail.section(r.area, r.H)}</li>
              <li>{text.detail.division}</li>
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
                { label: text.chart.seriesArray, tone: toneClass(0), kind: 'line' },
                ...s.refs.map(() => ({ label: text.chart.neededLegend, tone: 'tone-muted', kind: 'line' })),
              ]}
            />

            <LineChart
              ref={chartRef}
              xScale="linear"
              xLabel={text.chart.x}
              yLabel={text.chart.y}
              series={chartSeries}
              refLines={s.refs.map((ref) => ({
                key: ref.key, y: ref.y, label: text.chart.refNeeded(ref.y),
              }))}
              marker={{ ...s.marker, label: `${r.N} ${text.countUnit}` }}
              formatX={(v) => fmt(v, 3)}
              formatY={(v) => fmt(v, 3)}
              caption={text.chart.caption}
            />

            <ChartDataTable
              xLabel={text.chart.x}
              series={chartSeries}
              every={3}
              formatX={(v) => `${fmt(v, 2)} ${text.countUnit}`}
              formatY={(v) => `${fmt(v, 4)} °C/W`}
            />
          </>
        ) : (
          <p className="empty-note">{ui.chartNeedsInput}</p>
        )}
      </section>

      <ReportDialog section={reportSection} schematicRef={schematicRef} chartRef={chartRef} />
      <SaveToProject
        toolKey="thermal-via"
        toolMode={mode}
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
