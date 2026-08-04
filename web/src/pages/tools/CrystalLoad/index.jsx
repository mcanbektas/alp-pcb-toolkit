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
import { fmt, fmtPct } from '../../../lib/num'
import CrystalSchematic from './schematic'
import {
  INITIAL_FORM, MODE_ANALYSIS, MODE_SYNTHESIS,
  compute, buildSweep,
} from './model'
import { getText } from './text'
import { buildReportSection } from './report'

export default function CrystalLoad() {
  const [mode, setMode] = useState(MODE_ANALYSIS)
  const { f, set, patch } = useToolForm(INITIAL_FORM)

  // Kaydedilmiş hesabı geri yükler (?hesap=<id>) ve ekranı o kayda bağlar;
  // SaveToProject bağlı kayda yeni satır açmak yerine üzerine yazar.
  const saved = useSavedCalculation({
    toolKey: 'crystal-load', initialForm: INITIAL_FORM, patch, setMode,
  })
  const { lang } = useLang()

  const text = useMemo(() => getText(lang), [lang])
  const ui = useMemo(() => commonText(lang), [lang])

  const r = useMemo(() => compute(mode, f, text.fieldLabels), [f, mode, text])
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

  const chartMeta = s ? text.chart[s.kind] : null
  const chartSeries = s
    ? [
        {
          key: 'main',
          name: text.chart.series[s.kind],
          tone: toneClass(0),
          points: s.points,
        },
      ]
    : []

  return (
    <>
      <LangLink className="backlink" to="/kategori/komponent">{text.backlink}</LangLink>

      <ToolHeader title={text.title} intro={text.intro} />

      <div className="tool-grid">
        {/* ---------- Sol: Girdiler ---------- */}
        <section className="panel">
          <h2>{ui.inputs}</h2>

          <CrystalSchematic ref={schematicRef} r={r} text={text.schematic} />

          <Segmented
            label={text.modeGroup}
            value={mode}
            onChange={setMode}
            options={[
              { value: MODE_ANALYSIS, label: text.modeAnalysis },
              { value: MODE_SYNTHESIS, label: text.modeSynthesis },
            ]}
          />

          {mode === MODE_SYNTHESIS ? (
            <NumberField
              label={text.fields.CL.label}
              value={f.CL} onChange={set('CL')}
              units={['pF']} unit="pF" onUnit={() => {}}
              hint={text.fields.CL.hint}
            />
          ) : (
            <>
              <NumberField
                label={text.fields.C1.label}
                value={f.C1} onChange={set('C1')}
                units={['pF']} unit="pF" onUnit={() => {}}
              />
              <NumberField
                label={text.fields.C2.label}
                value={f.C2} onChange={set('C2')}
                units={['pF']} unit="pF" onUnit={() => {}}
              />
            </>
          )}

          <NumberField
            label={text.fields.Cstray.label}
            value={f.Cstray} onChange={set('Cstray')}
            units={['pF']} unit="pF" onUnit={() => {}}
            hint={text.fields.Cstray.hint}
          />
          <NumberField
            label={text.fields.Cin.label}
            value={f.Cin} onChange={set('Cin')}
            units={['pF']} unit="pF" onUnit={() => {}}
            hint={text.fields.Cin.hint}
          />
          <NumberField
            label={text.fields.Cout.label}
            value={f.Cout} onChange={set('Cout')}
            units={['pF']} unit="pF" onUnit={() => {}}
          />
          <NumberField
            label={text.fields.fXtal.label}
            value={f.fXtal} onChange={set('fXtal')}
            units={['Hz', 'kHz', 'MHz']} unit={f.fXtalu} onUnit={set('fXtalu')}
            hint={text.fields.fXtal.hint}
          />
        </section>

        {/* ---------- Orta: Ana sonuç ---------- */}
        {/* İç `r.ok &&` kapısı gerekli: children JSX'i ResultPanel çizmese de
            burada kurulur — bkz. TraceWidth'teki aynı not. */}
        <ResultPanel r={r} reason={(code) => text.reasonText(code, r)}>
          {r.ok && (
            <>
              <div className="big-result">
                <div className="label">
                  {r.mode === MODE_SYNTHESIS ? text.big.requiredCaps : text.big.loadCap}
                </div>
                <div className="value">
                  {fmt(r.mode === MODE_SYNTHESIS ? r.C : r.achieved, 4)} pF
                </div>
                <div className="alt">
                  {r.mode === MODE_SYNTHESIS
                    ? text.big.crystalAltSyn(
                      fmt(r.nearest.value, 3),
                      fmt(r.withStandard, 4),
                      text.pct(fmtPct(r.standardErrPct)),
                    )
                    : text.big.crystalAltAna(fmt(r.Cstray, 3))}
                </div>
              </div>

              {status && <span className={`status ${status.cls}`}>{status.text}</span>}

              <table className="result-table">
                <tbody>
                  {r.mode === MODE_SYNTHESIS ? (
                    <>
                      <tr><td>{text.table.targetCL}</td><td>{fmt(r.CL, 4)} pF</td></tr>
                      <tr><td>{text.table.computedCaps}</td><td>{fmt(r.C, 5)} pF</td></tr>
                      <tr>
                        <td>{text.table.achievedWithComputed}</td>
                        <td>{fmt(r.achieved, 5)} pF</td>
                      </tr>
                      <tr className="mini-head">
                        <td>{text.table.standardHead}</td>
                        <td>{text.table.standardSub}</td>
                      </tr>
                      <tr>
                        <td>{text.table.e24}</td>
                        <td>
                          {fmt(r.nearest.value, 4)} pF · {fmt(r.withStandard, 4)} pF ·{' '}
                          {text.pct(fmtPct(r.standardErrPct))}
                        </td>
                      </tr>
                    </>
                  ) : (
                    <>
                      <tr><td>C1</td><td>{fmt(r.C1, 4)} pF</td></tr>
                      <tr><td>C2</td><td>{fmt(r.C2, 4)} pF</td></tr>
                      <tr><td>{text.table.achieved}</td><td>{fmt(r.achieved, 5)} pF</td></tr>
                    </>
                  )}
                  <tr><td>{text.table.stray}</td><td>{fmt(r.Cstray, 4)} pF</td></tr>
                  <tr>
                    <td>{text.table.pinCaps}</td>
                    <td>{fmt(r.Cin, 3)} / {fmt(r.Cout, 3)} pF</td>
                  </tr>
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
              <li>{text.detail.crystalModel(r.mode === MODE_SYNTHESIS && r.simplified)}</li>
              <li>{text.detail.seriesEquivalent}</li>
              <li>{text.detail.slope}</li>
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
                ...chartSeries.map((cs) => ({ label: cs.name, tone: cs.tone, kind: 'line' })),
                ...s.refs.map((ref) => ({
                  label: text.chart.legendRef(ref.key),
                  tone: 'tone-muted',
                  kind: 'line',
                })),
              ]}
            />

            <LineChart
              ref={chartRef}
              xScale="linear"
              xLabel={chartMeta.x}
              yLabel={chartMeta.y}
              series={chartSeries}
              refLines={s.refs.map((ref) => ({
                key: ref.key,
                y: ref.y,
                label: text.chart.refLine(ref.key, ref.y),
              }))}
              marker={{
                ...s.marker,
                label: text.chart.markerCrystal,
              }}
              formatX={(v) => fmt(v, 3)}
              formatY={(v) => fmt(v, 3)}
              caption={chartMeta.caption}
            />

            <ChartDataTable
              xLabel={chartMeta.x}
              series={chartSeries}
              every={6}
              formatX={(v) => `${fmt(v, 4)} pF`}
              formatY={(v) => fmt(v, 4)}
            />
          </>
        ) : (
          <p className="empty-note">{ui.chartNeedsInput}</p>
        )}
      </section>

      <ReportDialog section={reportSection} schematicRef={schematicRef} chartRef={chartRef} />
      <SaveToProject
        toolKey="crystal-load"
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
