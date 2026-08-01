import { useMemo, useRef, useState } from 'react'
import LangLink from '../../../components/LangLink'
import NumberField from '../../../components/NumberField'
import SelectField from '../../../components/SelectField'
import Segmented from '../../../components/Segmented'
import ToolHeader from '../../../components/ToolHeader'
import ResultPanel from '../../../components/ResultPanel'
import Commentary from '../../../components/Commentary'
import ReportDialog from '../../../components/ReportDialog'
import SaveToProject from '../../../components/SaveToProject'
import useToolForm from '../../../hooks/useToolForm'
import useFieldSolver from '../../../hooks/useFieldSolver'
import { statusChip, worstLevel, countAtLevel } from '../../../lib/statusChip'
import useSavedCalculation from '../../../hooks/useSavedCalculation'
import { useLang } from '../../../hooks/useLang'
import { commonText } from '../../../data/uiText'
import { fmt, fmtEng, fmtRes, fmtPct } from '../../../lib/num'
import DiffPairSchematic from './schematic'
import {
  INITIAL_FORM, STRUCTURES, STRUCT_MICROSTRIP,
  MODE_ANALYSIS, MODE_SYNTHESIS, compute,
} from './model'
import { getText } from './text'
import { buildReportSection } from './report'

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

  // Çiftin sayıları alan çözücüden gelir (spec §6.8.1 rotası, worker'da).
  // İlk render'da çalışmaz (hydration kuralı); o ana kadar kapalı form tek
  // uçlu taban gösterilir. Sentezde de çözücü köke sokulmaz: bulunan
  // geometriyi tek sefer analiz eder, hedeften sapma bu sonuçtan okunur.
  const solver = useFieldSolver(r.ok ? r.solverParams : null)
  const fs = solver.status === 'done' && !solver.result.error ? solver.result : null

  const notes = useMemo(() => text.commentary(r, solver), [r, solver, text])

  // Rapor bölümü SVG'siz kurulur; ReportDialog indirme anında canlı DOM'dan
  // (aşağıdaki ref) şematiği okuyup satır içine çevirir. Çözücü sonucu rapora
  // da girer (F2) — indirme anında henüz yoksa satırları rapora girmez.
  const reportSection = useMemo(
    () => buildReportSection({ mode, f, r, text, fs }),
    [mode, f, r, text, fs],
  )
  const schematicRef = useRef(null)

  const status = useMemo(() => {
    if (!r.ok || notes.length === 0) return null
    const levels = notes.map((n) => n.level)
    const worst = worstLevel(levels)
    return statusChip(worst, countAtLevel(levels, worst), ui)
  }, [r, notes, ui])

  const errPct = r.ok && fs && r.target != null
    ? (100 * (fs.Zdiff - r.target)) / r.target
    : null

  return (
    <>
      <LangLink className="backlink" to="/kategori/empedans">{text.backlink}</LangLink>

      <ToolHeader title={text.title} intro={text.intro} />

      <div className="tool-grid">
        {/* ---------- Sol: Girdiler ---------- */}
        <section className="panel">
          <h2>{ui.inputs}</h2>

          <DiffPairSchematic ref={schematicRef} r={r} form={f} text={text.schematic} />

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

          {mode === MODE_SYNTHESIS && (
            <>
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

          {mode === MODE_ANALYSIS && (
            <NumberField
              label={text.fields.W.label}
              value={f.W} onChange={set('W')}
              units={DIM_UNITS} unit={f.Wu} onUnit={set('Wu')}
            />
          )}

          <NumberField
            label={text.fields.S.label}
            value={f.S} onChange={set('S')}
            units={DIM_UNITS} unit={f.Su} onUnit={set('Su')}
            hint={mode === MODE_SYNTHESIS ? text.fields.SFixedHint : text.fields.S.hint}
          />

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
        {/* İç `r.ok &&` kapısı gerekli: children JSX'i ResultPanel çizmese de
            burada kurulur — bkz. TraceWidth'teki aynı not. */}
        <ResultPanel r={r} reason={text.reasonText}>
          {r.ok && (
            <>
              <div className="big-result">
                <div className="label">
                  {r.mode === MODE_SYNTHESIS ? text.bigResultWidth : text.bigResultZdiff}
                </div>
                <div className="value">
                  {r.mode === MODE_SYNTHESIS
                    ? fmtEng(r.W, 'm', 4)
                    : fs ? fmtRes(fs.Zdiff, 4) : text.bigResultPending}
                </div>
                <div className="alt">
                  {r.mode === MODE_SYNTHESIS
                    ? (fs
                      ? <>Z_diff = {fmtRes(fs.Zdiff, 4)} &nbsp;·&nbsp; {text.targetWord} {fmtRes(r.target, 3)} ({text.pct(fmtPct(errPct))})</>
                      : <>{text.targetWord} {fmtRes(r.target, 3)}</>)
                    : (fs
                      ? <>Z_odd = {fmtRes(fs.Zodd, 4)} &nbsp;·&nbsp; {text.singleEndedZ0} = {fmtRes(r.Z0, 4)}</>
                      : <>{text.singleEndedZ0} = {fmtRes(r.Z0, 4)}</>)}
                </div>
              </div>

              {status && <span className={`status ${status.cls}`}>{status.text}</span>}

              <p className="method-note">{text.methodNote}</p>
              {solver.status === 'running' && (
                <p className="method-note">{text.solver.pending}</p>
              )}

              <table className="result-table">
                <tbody>
                  {fs && (
                    <>
                      <tr>
                        <td>{text.table.zdiff}</td>
                        <td>{fmtRes(fs.Zdiff, 5)}</td>
                      </tr>
                      <tr>
                        <td>{text.table.zodd}</td>
                        <td>{fmtRes(fs.Zodd, 5)}</td>
                      </tr>
                      <tr>
                        <td>{text.table.zeven}</td>
                        <td>{fmtRes(fs.Zeven, 5)}</td>
                      </tr>
                      <tr>
                        <td>{text.table.zcommon}</td>
                        <td>{fmtRes(fs.Zcommon, 5)}</td>
                      </tr>
                      <tr>
                        <td>{text.table.epsEffOdd}</td>
                        <td>{fmt(fs.epsEffOdd, 5)}</td>
                      </tr>
                      <tr>
                        <td>{text.table.epsEffEven}</td>
                        <td>{fmt(fs.epsEffEven, 5)}</td>
                      </tr>
                      <tr>
                        <td>{text.table.tpdOdd}</td>
                        <td>{fmt(fs.tpdOdd * 1e9, 4)} ps/mm</td>
                      </tr>
                      <tr>
                        <td>{text.table.tpdEven}</td>
                        <td>{fmt(fs.tpdEven * 1e9, 4)} ps/mm</td>
                      </tr>
                      <tr>
                        <td>{text.solver.rowConv}</td>
                        <td>{ui.pct(fmt(fs.convergence.coarsePct, 2))}</td>
                      </tr>
                    </>
                  )}
                  <tr className="mini-head">
                    <td>{text.table.z0}</td>
                    <td>{fmtRes(r.Z0, 5)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.twiceZ0}</td>
                    <td>{fmtRes(2 * r.Z0, 5)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.ratio}</td>
                    <td>{fmt(r.ratio, 4)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.geometry}</td>
                    <td>{fmtEng(r.W, 'm', 4)} · {fmtEng(r.S, 'm', 4)}</td>
                  </tr>
                  {fs && (
                    <tr>
                      <td>{text.solver.rowMethod}</td>
                      <td>{fs.model}</td>
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
              <li>{text.detail.model(r.singleMethod)}</li>
              {fs && (
                <li>{text.detail.matrix(fmt(fs.C11 * 1e12, 4), fmt(fs.C12 * 1e12, 4))}</li>
              )}
              {fs && (
                <li>
                  {text.detail.mesh(
                    `${fs.mesh.even.nx}×${fs.mesh.even.ny}`,
                    `${fs.mesh.odd.nx}×${fs.mesh.odd.ny}`,
                  )}
                </li>
              )}
              {r.mode === MODE_SYNTHESIS && (
                <li>{text.detail.solved(r.solvedBy)}</li>
              )}
              {r.mode === MODE_SYNTHESIS && (
                <li>{text.detail.spacingSynthesis}</li>
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

      <ReportDialog section={reportSection} schematicRef={schematicRef} />
      <SaveToProject
        toolKey="diff-pair"
        toolMode={mode}
        f={f}
        r={r}
        section={reportSection}
        schematicRef={schematicRef}
        saved={saved}
      />
    </>
  )
}
