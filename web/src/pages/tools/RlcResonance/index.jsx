import { useMemo, useRef, useState } from 'react'
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
import { fmt, fmtEng, fmtRes, fmtPct } from '../../../lib/num'
import CircuitSchematic from './schematic'
import {
  INITIAL_FORM, MODE_ANALYSIS, MODE_SYNTHESIS,
  compute, buildSweep,
} from './model'
import { getText } from './text'
import { buildReportSection } from './report'

export default function RlcResonance() {
  const [mode, setMode] = useState(MODE_ANALYSIS)
  const { f, set, patch } = useToolForm(INITIAL_FORM)

  // Kaydedilmiş hesabı geri yükler (?hesap=<id>) ve ekranı o kayda bağlar;
  // SaveToProject bağlı kayda yeni satır açmak yerine üzerine yazar.
  const saved = useSavedCalculation({
    toolKey: 'rlc-resonance', initialForm: INITIAL_FORM, patch, setMode,
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

  const chartSeries = s
    ? [{ key: 'main', name: text.chart.y, tone: toneClass(0), points: s.points }]
    : []

  return (
    <>
      <LangLink className="backlink" to="/kategori/komponent">{text.backlink}</LangLink>

      <ToolHeader title={text.title} intro={text.intro} />

      <div className="tool-grid">
        {/* ---------- Sol: Girdiler ---------- */}
        <section className="panel">
          <h2>{ui.inputs}</h2>

          <CircuitSchematic ref={schematicRef} r={r} text={text.schematic} />

          <Segmented
            label={text.modeGroup}
            value={mode}
            onChange={setMode}
            options={[
              { value: MODE_ANALYSIS, label: text.modeLabel[MODE_ANALYSIS] },
              { value: MODE_SYNTHESIS, label: text.modeLabel[MODE_SYNTHESIS] },
            ]}
          />

          <NumberField
            label={text.fields.Rr.label}
            value={f.Rr} onChange={set('Rr')}
            units={['Ω', 'mΩ', 'kΩ']} unit={f.Rru} onUnit={set('Rru')}
          />
          <NumberField
            label={text.fields.L.label}
            value={f.L} onChange={set('L')}
            units={['H', 'mH', 'µH', 'nH']} unit={f.Lu} onUnit={set('Lu')}
          />
          {mode === MODE_ANALYSIS ? (
            <>
              <NumberField
                label={text.fields.C.label}
                value={f.C} onChange={set('C')}
                units={['F', 'µF', 'nF', 'pF']} unit={f.Cu} onUnit={set('Cu')}
              />
              <NumberField
                label={text.fields.freq.label}
                value={f.freq} onChange={set('freq')}
                units={['Hz', 'kHz', 'MHz', 'GHz']} unit={f.frequ} onUnit={set('frequ')}
              />
            </>
          ) : (
            <NumberField
              label={text.fields.targetF0.label}
              value={f.targetF0} onChange={set('targetF0')}
              units={['Hz', 'kHz', 'MHz', 'GHz']} unit={f.targetF0u} onUnit={set('targetF0u')}
              hint={text.fields.targetF0.hint}
            />
          )}
        </section>

        {/* ---------- Orta: Ana sonuç ---------- */}
        {/* İç `r.ok &&` kapısı gerekli: children JSX'i ResultPanel çizmese de
            burada kurulur — bkz. TraceWidth'teki aynı not. */}
        <ResultPanel r={r} reason={(code) => text.reasonText(code, r)}>
          {r.ok && (
            <>
              <div className="big-result">
                <div className="label">
                  {r.mode === MODE_SYNTHESIS
                    ? text.big.synthesisLabel
                    : text.big.analysisLabel(fmtEng(r.f, 'Hz', 4))}
                </div>
                <div className="value">
                  {r.mode === MODE_SYNTHESIS ? fmtEng(r.C, 'F', 4) : fmtRes(r.magnitude, 4)}
                </div>
                <div className="alt">
                  f₀ = {fmtEng(r.f0, 'Hz', 4)} &nbsp;·&nbsp; Q = {fmt(r.Q, 4)} &nbsp;·&nbsp;{' '}
                  {text.kindLabel[r.kind]}
                </div>
              </div>
              {status && <span className={`status ${status.cls}`}>{status.text}</span>}
              <table className="result-table">
                <tbody>
                  <tr><td>{text.table.XL}</td><td>{fmtRes(r.XL, 4)}</td></tr>
                  <tr><td>{text.table.XC}</td><td>{fmtRes(r.XC, 4)}</td></tr>
                  <tr><td>{text.table.X}</td><td>{fmtRes(r.X, 4)}</td></tr>
                  <tr><td>{text.table.magnitude}</td><td>{fmtRes(r.magnitude, 4)}</td></tr>
                  <tr><td>{text.table.phase}</td><td>{fmt(r.phaseDeg, 4)}°</td></tr>
                  <tr><td>{text.table.f0}</td><td>{fmtEng(r.f0, 'Hz', 5)}</td></tr>
                  <tr><td>{text.table.Q}</td><td>{fmt(r.Q, 4)}</td></tr>
                  <tr><td>{text.table.BW}</td><td>{fmtEng(r.BW, 'Hz', 4)}</td></tr>
                  {r.mode === MODE_SYNTHESIS && (
                    <tr>
                      <td>{text.table.nearestC}</td>
                      <td>
                        {fmt(r.nearestC.value, 4)} pF{' '}
                        <span className="sub">({text.pct(fmtPct(r.nearestC.errorPct))})</span>
                      </td>
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
              {text.detail(r).map((line) => <li key={line}>{line}</li>)}
            </ul>
          )}

          <h2 className="section">{ui.validity}</h2>
          <ul className="detail-list">
            {text.validity.map((a) => <li key={a}>{a}</li>)}
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
                { label: text.chart.y, tone: toneClass(0), kind: 'line' },
                ...s.refs.map(() => ({
                  label: text.chart.resistanceLegend,
                  tone: 'tone-muted',
                  kind: 'line',
                })),
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
                label: `R = ${fmtRes(ref.y, 3)}`,
              }))}
              marker={{ ...s.marker, label: text.chart.marker }}
              formatX={(v) => fmtEng(v, '', 3).replace(' ', '')}
              formatY={(v) => fmt(v, 3)}
              caption={text.chart.caption}
            />

            <ChartDataTable
              xLabel={text.chart.x}
              series={chartSeries}
              every={6}
              formatX={(v) => fmtEng(v, '', 4)}
              formatY={(v) => fmt(v, 4)}
            />
          </>
        ) : (
          <p className="empty-note">{ui.chartNeedsInput}</p>
        )}
      </section>

      <ReportDialog section={reportSection} schematicRef={schematicRef} chartRef={chartRef} />
      <SaveToProject
        toolKey="rlc-resonance"
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
