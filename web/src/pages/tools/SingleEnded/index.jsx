import { useMemo, useRef, useState } from 'react'
import LangLink from '../../../components/LangLink'
import NumberField from '../../../components/NumberField'
import SelectField from '../../../components/SelectField'
import Segmented from '../../../components/Segmented'
import ToolHeader from '../../../components/ToolHeader'
import ResultPanel from '../../../components/ResultPanel'
import Commentary from '../../../components/Commentary'
import LineChart, { ChartLegend, ChartDataTable, toneClass } from '../../../components/LineChart'
import ReportDialog from '../../../components/ReportDialog'
import SaveToProject from '../../../components/SaveToProject'
import useToolForm from '../../../hooks/useToolForm'
import useFieldSolver from '../../../hooks/useFieldSolver'
import { statusChip, worstLevel, countAtLevel } from '../../../lib/statusChip'
import useSavedCalculation from '../../../hooks/useSavedCalculation'
import { useLang } from '../../../hooks/useLang'
import { commonText } from '../../../data/uiText'
import { fmt, fmtEng, fmtRes, fmtPct } from '../../../lib/num'
import ImpedanceSchematic from './schematic'
import {
  INITIAL_FORM, STRUCTURES, STRUCT_MICROSTRIP, STRUCT_STRIPLINE, STRUCT_CPW, STRUCT_GCPW,
  MODE_ANALYSIS, MODE_SYNTHESIS, compute, buildSweep,
} from './model'
import { getText } from './text'
import { buildReportSection } from './report'

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

  // Alan çözücü, bulunan geometriyi worker'da TEK SEFER analiz eder (sentezde
  // de: çözücü köke sokulmaz, sonucu doğrulama satırı olarak gelir). İdeal
  // CPW'de iş yok (solverParams null); grounded CPW'de sayının TEK kaynağı
  // çözücüdür (kapalı form dalı yazılmadı — spec §6.7, brif 09 F2).
  const solver = useFieldSolver(r.ok ? r.solverParams : null)
  const fs = solver.status === 'done' && !solver.result.error ? solver.result : null

  const notes = useMemo(() => text.commentary(r, solver), [r, solver, text])

  // Rapor bölümü SVG'siz kurulur; ReportDialog indirme anında canlı DOM'dan
  // (aşağıdaki ref'ler) şematik ve grafiği okuyup satır içine çevirir.
  // Çözücü satırları rapora da girer (F2); indirme anında yoksa girmez.
  const reportSection = useMemo(
    () => buildReportSection({ mode, f, r, s, text, fs }),
    [mode, f, r, s, text, fs],
  )
  const schematicRef = useRef(null)
  const chartRef = useRef(null)

  const status = useMemo(() => {
    if (!r.ok || notes.length === 0) return null
    const levels = notes.map((n) => n.level)
    const worst = worstLevel(levels)
    return statusChip(worst, countAtLevel(levels, worst), ui)
  }, [r, notes, ui])

  // gcpw sentezinde W çözücüden gelir; şematik o değeri gösterir, çözüm
  // sürerken W basılmaz.
  const rDisplay = r.ok && r.solverOnly && r.W == null && fs
    ? { ...r, W: fs.W }
    : r

  const chartSeries = s ? [{ key: 'z0', name: 'Z₀', tone: toneClass(0), points: s.points }] : []

  return (
    <>
      <LangLink className="backlink" to="/kategori/empedans">{text.backlink}</LangLink>

      <ToolHeader title={text.title} intro={text.intro} />

      <div className="tool-grid">
        {/* ---------- Sol: Girdiler ---------- */}
        <section className="panel">
          <h2>{ui.inputs}</h2>

          <ImpedanceSchematic ref={schematicRef} r={rDisplay} form={f} text={text.schematic} />

          <Segmented
            label={text.modeGroup}
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

          {(f.structure === STRUCT_CPW || f.structure === STRUCT_GCPW) && (
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
              : f.structure === STRUCT_GCPW
                ? text.fields.tField.hintSolver
                : text.fields.tField.hintOther}
          />

          <NumberField
            label={text.fields.epsR.label}
            value={f.epsR} onChange={set('epsR')}
            units={['']} unit="" onUnit={() => {}}
            hint={text.fields.epsR.hint}
          />

          {f.structure !== STRUCT_CPW && f.structure !== STRUCT_GCPW && (
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
        {/* İç `r.ok &&` kapısı gerekli: children JSX'i ResultPanel çizmese de
            burada kurulur — bkz. TraceWidth'teki aynı not. */}
        <ResultPanel r={r} reason={text.reasonText}>
          {r.ok && (
            <>
              <div className="big-result">
                <div className="label">
                  {r.mode === MODE_SYNTHESIS ? text.bigResultWidth : text.bigResultZ0}
                </div>
                <div className="value">
                  {r.mode === MODE_SYNTHESIS
                    ? r.solverOnly
                      ? (fs ? fmtEng(fs.W, 'm', 4) : text.bigResultPending)
                      : fmtEng(r.W, 'm', 4)
                    : r.solverOnly
                      ? (fs ? fmtRes(fs.Z0, 4) : text.bigResultPending)
                      : fmtRes(r.Z0, 4)}
                </div>
                <div className="alt">
                  {r.mode === MODE_SYNTHESIS
                    ? r.solverOnly
                      ? (fs
                        ? <>Z₀ = {fmtRes(fs.Z0, 4)} &nbsp;·&nbsp; {text.targetWord} {fmtRes(r.target, 3)}</>
                        : <>{text.targetWord} {fmtRes(r.target, 3)}</>)
                      : <>Z₀ = {fmtRes(r.Z0, 4)} &nbsp;·&nbsp; {text.targetWord} {fmtRes(r.target, 3)}</>
                    : r.solverOnly
                      ? (fs
                        ? <>W = {fmtEng(r.W, 'm', 4)} &nbsp;·&nbsp; εeff = {fmt(fs.epsEff, 4)}</>
                        : <>W = {fmtEng(r.W, 'm', 4)}</>)
                      : <>W = {fmtEng(r.W, 'm', 4)} &nbsp;·&nbsp; εeff = {fmt(r.epsEff, 4)}</>}
                </div>
              </div>

              {status && <span className={`status ${status.cls}`}>{status.text}</span>}

              <p className="method-note">
                {r.solverOnly ? text.methodNoteSolver : text.methodNote}
              </p>
              {solver.status === 'running' && (
                <p className="method-note">{text.solver.pending}</p>
              )}

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
                  {r.solverOnly ? (
                    fs && (
                      <>
                        <tr>
                          <td>{text.table.z0}</td>
                          <td>{fmtRes(fs.Z0, 5)}</td>
                        </tr>
                        <tr>
                          <td>{text.table.epsEff}</td>
                          <td>{fmt(fs.epsEff, 5)}</td>
                        </tr>
                        <tr>
                          <td>{text.table.tpd}</td>
                          <td>{fmt(fs.tpd * 1e9, 4)} ps/mm</td>
                        </tr>
                        <tr>
                          <td>{text.table.W}</td>
                          <td>{fmtEng(r.W ?? fs.W, 'm', 5)}</td>
                        </tr>
                        <tr>
                          <td>{text.table.height}</td>
                          <td>{fmtEng(r.height, 'm', 5)}</td>
                        </tr>
                        <tr>
                          <td>{text.solver.rowConv}</td>
                          <td>{ui.pct(fmt(fs.convergence.coarsePct, 2))}</td>
                        </tr>
                        <tr>
                          <td>{text.table.model}</td>
                          <td>{fs.model}</td>
                        </tr>
                      </>
                    )
                  ) : (
                    <>
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
                      {fs && (
                        <>
                          <tr className="mini-head">
                            <td>{r.mode === MODE_SYNTHESIS ? text.solver.rowZ0Syn : text.solver.rowZ0}</td>
                            <td>{fmtRes(fs.Z0, 5)}</td>
                          </tr>
                          <tr>
                            <td>{text.solver.rowEps}</td>
                            <td>{fmt(fs.epsEff, 5)}</td>
                          </tr>
                          <tr>
                            <td>{text.solver.rowConv}</td>
                            <td>{ui.pct(fmt(fs.convergence.coarsePct, 2))}</td>
                          </tr>
                          <tr>
                            <td>{text.solver.rowDiff}</td>
                            <td>{ui.pct(fmtPct((100 * (fs.Z0 - r.Z0)) / r.Z0))}</td>
                          </tr>
                          <tr>
                            <td>{text.solver.rowMethod}</td>
                            <td>{fs.method}</td>
                          </tr>
                        </>
                      )}
                    </>
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

          <pre className="formula">{text.formula[f.structure]}</pre>

          {r.ok && (
            <ul className="detail-list">
              {r.solverOnly ? (
                <>
                  <li>{text.detail.solverOnly}</li>
                  {fs && (
                    <li>{text.detail.solverMesh(`${fs.mesh.fine.nx}×${fs.mesh.fine.ny}`)}</li>
                  )}
                  {r.mode === MODE_SYNTHESIS && fs && (
                    <li>{text.detail.solverSynthesis(fs.solvedBy, fs.search.evals)}</li>
                  )}
                  {r.mode === MODE_SYNTHESIS && !fs && (
                    <li>{text.detail.solverSynthesisPending}</li>
                  )}
                </>
              ) : (
                <>
                  <li>{text.detail.model(r.model, r.method)}</li>
                  {r.u != null && <li>{text.detail.ratios(fmt(r.u, 5), fmt(r.tau, 5))}</li>}
                  {r.mode === MODE_SYNTHESIS && (
                    <li>{text.detail.solved(r.solvedBy)}</li>
                  )}
                  <li>{text.detail.rangeCheck(r.inRange)}</li>
                </>
              )}
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
      {/* Grounded CPW'de grafik hiç çizilmez: nokta başına senkron motor yok
          (bkz. buildSweep). Paneli "geçerli girdi gerekli" notuyla göstermek
          yanıltıcı olurdu — girdi geçerli, grafik bu yapıda yok. */}
      {!(r.ok && r.solverOnly) && (
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
      )}

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
