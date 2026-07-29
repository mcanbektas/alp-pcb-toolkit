import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import NumberField from '../../../components/NumberField'
import SelectField from '../../../components/SelectField'
import Segmented from '../../../components/Segmented'
import LineChart, { ChartLegend, ChartDataTable, toneClass } from '../../../components/LineChart'
import ReportDialog from '../../../components/ReportDialog'
import SaveToProject from '../../../components/SaveToProject'
import useToolForm from '../../../hooks/useToolForm'
import useSavedCalculation from '../../../hooks/useSavedCalculation'
import { useLang } from '../../../hooks/useLang'
import { commonText } from '../../../data/uiText'
import { fmt, fmtEng, fmtRes } from '../../../lib/num'
import ImpedanceSchematic from './schematic'
import {
  INITIAL_FORM, STRUCTURES, STRUCT_MICROSTRIP, STRUCT_STRIPLINE, STRUCT_CPW,
  MODE_ANALYSIS, MODE_SYNTHESIS, compute, buildSweep,
} from './model'
import { getText } from './text'
import { buildReportSection } from './report'

const MARK = { ok: '✓', warn: '!', danger: '×' }
const LEVEL_RANK = { ok: 0, warn: 1, danger: 2 }
const DIM_UNITS = ['mm', 'µm', 'mil']

export default function SingleEnded() {
  const [mode, setMode] = useState(MODE_ANALYSIS)
  const { f, set, patch } = useToolForm(INITIAL_FORM)

  // Kaydedilmiş hesabı geri yükler (?hesap=<id>) ve ekranı o kayda bağlar;
  // SaveToProject bağlı kayda yeni satır açmak yerine üzerine yazar.
  const saved = useSavedCalculation({
    toolKey: 'single-ended', initialForm: INITIAL_FORM, patch, setMode,
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
    const worst = notes.reduce((acc, n) => (LEVEL_RANK[n.level] > LEVEL_RANK[acc] ? n.level : acc), 'ok')
    const count = notes.filter((n) => n.level === worst).length
    if (worst === 'ok') return { cls: 'ok', text: ui.statusOk }
    if (worst === 'warn') return { cls: 'warn', text: ui.statusWarn(count) }
    return { cls: 'danger', text: ui.statusDanger(count) }
  }, [r, notes, ui])

  const chartSeries = s ? [{ key: 'z0', name: 'Z₀', tone: toneClass(0), points: s.points }] : []

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

          <ImpedanceSchematic ref={schematicRef} r={r} form={f} text={text.schematic} />

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

          {mode === MODE_ANALYSIS ? (
            <NumberField
              label={text.fields.W.label}
              value={f.W} onChange={set('W')}
              units={DIM_UNITS} unit={f.Wu} onUnit={set('Wu')}
            />
          ) : (
            <NumberField
              label={text.fields.target.label}
              value={f.target} onChange={set('target')}
              units={['Ω']} unit="Ω" onUnit={() => {}}
              hint={text.fields.target.hint}
            />
          )}

          {f.structure === STRUCT_STRIPLINE ? (
            <NumberField
              label={text.fields.b.label}
              value={f.b} onChange={set('b')}
              units={DIM_UNITS} unit={f.bu} onUnit={set('bu')}
              hint={text.fields.b.hint}
            />
          ) : (
            <NumberField
              label={text.fields.H.label}
              value={f.H} onChange={set('H')}
              units={DIM_UNITS} unit={f.Hu} onUnit={set('Hu')}
              hint={text.fields.H.hint}
            />
          )}

          {f.structure === STRUCT_CPW && (
            <NumberField
              label={text.fields.S.label}
              value={f.S} onChange={set('S')}
              units={DIM_UNITS} unit={f.Su} onUnit={set('Su')}
            />
          )}

          <NumberField
            label={text.fields.tField.label}
            value={f.t} onChange={set('t')}
            units={DIM_UNITS} unit={f.tu} onUnit={set('tu')}
            hint={f.structure === STRUCT_MICROSTRIP
              ? text.fields.tField.hintMicrostrip
              : text.fields.tField.hintOther}
          />

          <NumberField
            label={text.fields.epsR.label}
            value={f.epsR} onChange={set('epsR')}
            units={['']} unit="" onUnit={() => {}}
            hint={text.fields.epsR.hint}
          />

          {f.structure !== STRUCT_CPW && (
            <>
              <label className="check-row">
                <input type="checkbox" checked={f.tol} onChange={(e) => set('tol')(e.target.checked)} />
                {text.fields.tolCheck}
              </label>

              {f.tol && (
                <>
                  <NumberField
                    label={text.fields.tolW.label}
                    value={f.tolW} onChange={set('tolW')}
                    units={['%']} unit="%" onUnit={() => {}}
                  />
                  <NumberField
                    label={text.fields.tolH.label}
                    value={f.tolH} onChange={set('tolH')}
                    units={['%']} unit="%" onUnit={() => {}}
                  />
                  <NumberField
                    label={text.fields.tolT.label}
                    value={f.tolT} onChange={set('tolT')}
                    units={['%']} unit="%" onUnit={() => {}}
                  />
                  <NumberField
                    label={text.fields.tolEps.label}
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
                  {r.mode === MODE_SYNTHESIS ? text.bigResultWidth : text.bigResultZ0}
                </div>
                <div className="value">
                  {r.mode === MODE_SYNTHESIS ? fmtEng(r.W, 'm', 4) : fmtRes(r.Z0, 4)}
                </div>
                <div className="alt">
                  {r.mode === MODE_SYNTHESIS
                    ? <>Z₀ = {fmtRes(r.Z0, 4)} &nbsp;·&nbsp; {text.targetWord} {fmtRes(r.target, 3)}</>
                    : <>W = {fmtEng(r.W, 'm', 4)} &nbsp;·&nbsp; εeff = {fmt(r.epsEff, 4)}</>}
                </div>
              </div>

              {status && <span className={`status ${status.cls}`}>{status.text}</span>}

              <p className="method-note">{text.methodNote}</p>

              <table className="result-table">
                <tbody>
                  {r.tolerance && (
                    <tr className="mini-head">
                      <td>{text.table.tolWindow}</td>
                      <td>
                        {fmtRes(r.tolerance.min, 4)} · {fmtRes(r.tolerance.nom, 4)} ·{' '}
                        {fmtRes(r.tolerance.max, 4)}
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td>{text.table.z0}</td>
                    <td>{fmtRes(r.Z0, 5)}</td>
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
                    <td>{text.table.vp}</td>
                    <td>{fmt(1 / r.tpdPsPerMm * 1000, 4)} mm/ns</td>
                  </tr>
                  <tr>
                    <td>{text.table.W}</td>
                    <td>{fmtEng(r.W, 'm', 5)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.height}</td>
                    <td>{fmtEng(r.height, 'm', 5)}</td>
                  </tr>
                  {r.u != null && (
                    <tr>
                      <td>{text.table.u}</td>
                      <td>{fmt(r.u, 4)}</td>
                    </tr>
                  )}
                  {r.k != null && (
                    <tr>
                      <td>{text.table.k}</td>
                      <td>{fmt(r.k, 5)}</td>
                    </tr>
                  )}
                  <tr>
                    <td>{text.table.model}</td>
                    <td>{r.model}</td>
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

          <pre className="formula">{text.formula[f.structure]}</pre>

          {r.ok && (
            <ul className="detail-list">
              <li>{text.detail.model(r.model, r.method)}</li>
              {r.u != null && <li>{text.detail.ratios(fmt(r.u, 5), fmt(r.tau, 5))}</li>}
              {r.mode === MODE_SYNTHESIS && (
                <li>{text.detail.solved(r.solvedBy)}</li>
              )}
              <li>{text.detail.rangeCheck(r.inRange)}</li>
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
                { label: 'Z₀', tone: toneClass(0), kind: 'line' },
                ...s.refs.map(() => ({ label: text.targetLegend, tone: 'tone-muted', kind: 'line' })),
              ]}
            />

            <LineChart
              ref={chartRef}
              xScale="log"
              xLabel={text.chart.x}
              yLabel={text.chart.y}
              series={chartSeries}
              refLines={s.refs.map((ref) => ({ key: ref.key, y: ref.y, label: text.refTarget(ref.y) }))}
              marker={{ ...s.marker, label: text.operatingPoint }}
              formatX={(v) => fmt(v, 3)}
              formatY={(v) => fmt(v, 3)}
              caption={text.chart.caption}
            />

            <ChartDataTable
              xLabel={text.chart.x}
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
        toolKey="single-ended"
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
