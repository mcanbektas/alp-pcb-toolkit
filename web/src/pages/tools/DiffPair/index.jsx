import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import NumberField from '../../../components/NumberField'
import SelectField from '../../../components/SelectField'
import Segmented from '../../../components/Segmented'
import LineChart, { ChartLegend, ChartDataTable, toneClass } from '../../../components/LineChart'
import ReportDialog from '../../../components/ReportDialog'
import SaveToProject from '../../../components/SaveToProject'
import useToolForm from '../../../hooks/useToolForm'
import { statusChip, worstLevel, countAtLevel } from '../../../lib/statusChip'
import useSavedCalculation from '../../../hooks/useSavedCalculation'
import { useLang } from '../../../hooks/useLang'
import { commonText } from '../../../data/uiText'
import { fmt, fmtEng, fmtRes, fmtPct } from '../../../lib/num'
import DiffPairSchematic from './schematic'
import {
  INITIAL_FORM, STRUCTURES, STRUCT_MICROSTRIP, FIXED_OPTIONS, FIX_WIDTH, FIX_SPACING,
  MODE_ANALYSIS, MODE_SYNTHESIS, compute, buildSweep,
} from './model'
import { getText } from './text'
import { buildReportSection } from './report'

const MARK = { ok: '✓', warn: '!', danger: '×' }
const DIM_UNITS = ['mm', 'µm', 'mil']

export default function DiffPair() {
  const [mode, setMode] = useState(MODE_ANALYSIS)
  const { f, set, patch } = useToolForm(INITIAL_FORM)

  // Kaydedilmiş hesabı geri yükler (?hesap=<id>) ve ekranı o kayda bağlar;
  // SaveToProject bağlı kayda yeni satır açmak yerine üzerine yazar.
  const saved = useSavedCalculation({
    toolKey: 'diff-pair', initialForm: INITIAL_FORM, patch, setMode,
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

  const chartMeta = s ? (s.sweepSpacing ? text.chartSpacing : text.chartWidth) : null
  const chartSeries = s
    ? [
        { key: 'zdiff', name: 'Z_diff', tone: toneClass(0), points: s.points },
        { key: 'zodd', name: 'Z_odd', tone: toneClass(1), points: s.oddPoints },
      ]
    : []

  return (
    <>
      <Link className="backlink" to="/kategori/empedans">{text.backlink}</Link>

      <div className="tool-header">
        <h1>{text.title}</h1>
        <p>{text.intro}</p>
      </div>

      <div className="tool-grid">
        {/* ---------- Sol: Girdiler ---------- */}
        <section className="panel">
          <h2>{ui.inputs}</h2>

          <DiffPairSchematic ref={schematicRef} r={r} form={f} text={text.schematic} />

          <Segmented
            value={mode}
            onChange={setMode}
            options={[
              { value: MODE_ANALYSIS, label: text.modeAnalysis },
              { value: MODE_SYNTHESIS, label: text.modeSynthesis },
            ]}
          />

          <SelectField
            label={text.fields.structure.label}
            value={f.structure} onChange={set('structure')}
            options={STRUCTURES.map((x) => ({ value: x, label: text.structLabel[x] }))}
          />

          {mode === MODE_SYNTHESIS && (
            <>
              <SelectField
                label={text.fields.fixed.label}
                value={f.fixed} onChange={set('fixed')}
                options={FIXED_OPTIONS.map((x) => ({ value: x, label: text.fixedLabel[x] }))}
              />
              <NumberField
                label={text.fields.target.label}
                value={f.target} onChange={set('target')}
                units={['Ω']} unit="Ω" onUnit={() => {}}
                hint={text.fields.target.hint}
              />
              <NumberField
                label={text.fields.tolerancePct.label}
                value={f.tolerancePct} onChange={set('tolerancePct')}
                units={['%']} unit="%" onUnit={() => {}}
              />
            </>
          )}

          {(mode === MODE_ANALYSIS || f.fixed === FIX_WIDTH) && (
            <NumberField
              label={mode === MODE_SYNTHESIS ? text.fields.WFixed.label : text.fields.W.label}
              value={f.W} onChange={set('W')}
              units={DIM_UNITS} unit={f.Wu} onUnit={set('Wu')}
            />
          )}

          {(mode === MODE_ANALYSIS || f.fixed === FIX_SPACING) && (
            <NumberField
              label={mode === MODE_SYNTHESIS ? text.fields.SFixed.label : text.fields.S.label}
              value={f.S} onChange={set('S')}
              units={DIM_UNITS} unit={f.Su} onUnit={set('Su')}
              hint={text.fields.S.hint}
            />
          )}

          <NumberField
            label={f.structure === STRUCT_MICROSTRIP
              ? text.fields.HMicrostrip
              : text.fields.HStripline}
            value={f.H} onChange={set('H')}
            units={DIM_UNITS} unit={f.Hu} onUnit={set('Hu')}
          />

          <NumberField
            label={text.fields.tField.label}
            value={f.t} onChange={set('t')}
            units={DIM_UNITS} unit={f.tu} onUnit={set('tu')}
          />

          <NumberField
            label={text.fields.epsR.label}
            value={f.epsR} onChange={set('epsR')}
            units={['']} unit="" onUnit={() => {}}
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
                <div className="label">
                  {r.mode === MODE_SYNTHESIS
                    ? r.solvedFor === 'S' ? text.bigResultSpacing : text.bigResultWidth
                    : text.bigResultZdiff}
                </div>
                <div className="value">
                  {r.mode === MODE_SYNTHESIS
                    ? fmtEng(r.solvedFor === 'S' ? r.S : r.W, 'm', 4)
                    : fmtRes(r.Zdiff, 4)}
                </div>
                <div className="alt">
                  {r.mode === MODE_SYNTHESIS
                    ? <>Z_diff = {fmtRes(r.Zdiff, 4)} &nbsp;·&nbsp; {text.targetWord} {fmtRes(r.target, 3)} ({text.pct(fmtPct(r.errPct))})</>
                    : <>Z_odd = {fmtRes(r.Zodd, 4)} &nbsp;·&nbsp; {text.singleEndedZ0} = {fmtRes(r.Z0, 4)}</>}
                </div>
              </div>

              {status && <span className={`status ${status.cls}`}>{status.text}</span>}

              <p className="method-note">{text.methodNote}</p>
              <p className="method-note">{text.couplingSourceNote}</p>

              <table className="result-table">
                <tbody>
                  <tr>
                    <td>{text.table.zdiff}</td>
                    <td>{fmtRes(r.Zdiff, 5)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.zodd}</td>
                    <td>{fmtRes(r.Zodd, 5)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.zeven}</td>
                    <td>{fmtRes(r.Zeven, 5)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.zcommon}</td>
                    <td>{fmtRes(r.Zcommon, 5)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.z0}</td>
                    <td>{fmtRes(r.Z0, 5)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.twiceZ0}</td>
                    <td>{fmtRes(2 * r.Z0, 5)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.coupling}</td>
                    <td>{fmt(r.coupling, 5)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.ratio}</td>
                    <td>{fmt(r.ratio, 4)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.epsEff}</td>
                    <td>{fmt(r.epsEff, 5)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.tpd}</td>
                    <td>{fmt(r.tpdPsPerMm, 4)} ps/mm</td>
                  </tr>
                  <tr>
                    <td>{text.table.geometry}</td>
                    <td>{fmtEng(r.W, 'm', 4)} · {fmtEng(r.S, 'm', 4)}</td>
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
              <li>{text.detail.model(r.model, r.method, r.singleMethod)}</li>
              <li>{text.detail.matrixApplied}</li>
              <li>{text.detail.coupling(fmt(r.coupling, 5), fmt(r.ratio, 4))}</li>
              {r.mode === MODE_SYNTHESIS && (
                <li>{text.detail.solved(r.solvedFor, r.solvedBy)}</li>
              )}
              <li>{text.detail.infiniteSolutions}</li>
              <li>{text.detail.noRounding}</li>
            </ul>
          )}

          <h2 className="section">{ui.validity}</h2>
          <ul className="detail-list">
            {text.validity.map((item, i) => (
              <li key={i}>
                {item.strong && <strong>{item.strong}</strong>}
                {item.rest}
              </li>
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
                { label: 'Z_diff', tone: toneClass(0), kind: 'line' },
                { label: 'Z_odd', tone: toneClass(1), kind: 'line' },
                ...s.refs.map(() => ({ label: text.targetLegend, tone: 'tone-muted', kind: 'line' })),
              ]}
            />

            <LineChart
              ref={chartRef}
              xScale="log"
              xLabel={chartMeta.x}
              yLabel={chartMeta.y}
              series={chartSeries}
              refLines={s.refs.map((ref) => ({ key: ref.key, y: ref.y, label: text.refTarget(ref.y) }))}
              marker={{ ...s.marker, label: text.operatingPoint }}
              formatX={(v) => fmt(v, 3)}
              formatY={(v) => fmt(v, 3)}
              caption={chartMeta.caption}
            />

            <ChartDataTable
              xLabel={chartMeta.x}
              series={chartSeries}
              every={6}
              formatX={(v) => `${fmt(v, 4)} mm`}
              formatY={(v) => fmtRes(v, 4)}
            />
          </>
        ) : (
          <p className="empty-note">{ui.chartNeedsInput}</p>
        )}
      </section>

      <ReportDialog section={reportSection} schematicRef={schematicRef} chartRef={chartRef} />
      <SaveToProject
        toolKey="diff-pair"
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
