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
import { statusChip, worstLevel, countAtLevel } from '../../../lib/statusChip'
import useSavedCalculation from '../../../hooks/useSavedCalculation'
import { useLang } from '../../../hooks/useLang'
import { commonText } from '../../../data/uiText'
import { fmt, fmtEng, fmtRes, fmtAmp, fmtVolt, fmtPct } from '../../../lib/num'
import TimingSchematic from './schematic'
import {
  INITIAL_FORM, TOOLS, TOOL_RC, TOOL_RL, TOOL_CRYSTAL,
  MODE_ANALYSIS, MODE_SYNTHESIS,
  compute, buildSweep,
} from './model'
import { getText } from './text'
import { buildReportSection } from './report'

export default function TimingCrystal() {
  const [mode, setMode] = useState(MODE_ANALYSIS)
  const { f, set, patch } = useToolForm(INITIAL_FORM)

  // Kaydedilmiş hesabı geri yükler (?hesap=<id>) ve ekranı o kayda bağlar;
  // SaveToProject bağlı kayda yeni satır açmak yerine üzerine yazar.
  const saved = useSavedCalculation({
    toolKey: 'rc-crystal', initialForm: INITIAL_FORM, patch, setMode,
  })
  const { lang } = useLang()

  const text = useMemo(() => getText(lang), [lang])
  const ui = useMemo(() => commonText(lang), [lang])

  const r = useMemo(() => compute(f.tool, mode, f, text.fieldLabels), [f, mode, text])
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

  const isTiming = f.tool === TOOL_RC || f.tool === TOOL_RL
  const chartMeta = s ? text.chart[s.kind] : null
  const chartSeries = s
    ? [
        {
          key: 'main',
          name: text.chart.series[s.kind],
          tone: toneClass(0),
          points: s.points,
        },
        ...(s.dischargePoints
          ? [{
            key: 'discharge',
            name: text.chart.discharge,
            tone: toneClass(1),
            points: s.dischargePoints,
          }]
          : []),
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

          <TimingSchematic ref={schematicRef} r={r} form={f} text={text.schematic} />

          <SelectField
            label={text.fields.tool}
            value={f.tool} onChange={set('tool')}
            options={TOOLS.map((tool) => ({ value: tool, label: text.toolLabel[tool] }))}
          />

          <Segmented
            value={mode}
            onChange={setMode}
            options={[
              { value: MODE_ANALYSIS, label: text.modeLabel[f.tool].ana },
              { value: MODE_SYNTHESIS, label: text.modeLabel[f.tool].syn },
            ]}
          />

          {isTiming && (
            <>
              <NumberField
                label={text.fields.R.label}
                value={f.R} onChange={set('R')}
                units={['Ω', 'kΩ', 'MΩ']} unit={f.Ru} onUnit={set('Ru')}
              />

              {mode === MODE_ANALYSIS ? (
                f.tool === TOOL_RC ? (
                  <NumberField
                    label={text.fields.C.label}
                    value={f.C} onChange={set('C')}
                    units={['F', 'µF', 'nF', 'pF']} unit={f.Cu} onUnit={set('Cu')}
                  />
                ) : (
                  <NumberField
                    label={text.fields.L.label}
                    value={f.L} onChange={set('L')}
                    units={['H', 'mH', 'µH', 'nH']} unit={f.Lu} onUnit={set('Lu')}
                  />
                )
              ) : (
                <NumberField
                  label={text.fields.targetTau.label}
                  value={f.targetTau} onChange={set('targetTau')}
                  units={['s', 'ms', 'µs', 'ns']} unit={f.targetTauu} onUnit={set('targetTauu')}
                />
              )}

              <NumberField
                label={text.fields.Vs.label}
                value={f.Vs} onChange={set('Vs')}
                units={['V', 'mV']} unit={f.Vsu} onUnit={set('Vsu')}
                hint={text.fields.Vs.hint}
              />
            </>
          )}

          {f.tool === TOOL_CRYSTAL && (
            <>
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
            </>
          )}
        </section>

        {/* ---------- Orta: Ana sonuç ---------- */}
        {/* İç `r.ok &&` kapısı gerekli: children JSX'i ResultPanel çizmese de
            burada kurulur — bkz. TraceWidth'teki aynı not. */}
        <ResultPanel r={r} reason={(code) => text.reasonText(code, r)}>
          {r.ok && (
            <>
              {isTiming ? (
                <>
                  <div className="big-result">
                    <div className="label">
                      {r.mode === MODE_SYNTHESIS
                        ? f.tool === TOOL_RC ? text.big.requiredC : text.big.requiredL
                        : text.big.tau}
                    </div>
                    <div className="value">
                      {r.mode === MODE_SYNTHESIS
                        ? fmtEng(f.tool === TOOL_RC ? r.C : r.L, f.tool === TOOL_RC ? 'F' : 'H', 4)
                        : fmtEng(r.tau, 's', 4)}
                    </div>
                    <div className="alt">
                      τ = {fmtEng(r.tau, 's', 4)} &nbsp;·&nbsp; 5τ = {fmtEng(5 * r.tau, 's', 4)}
                      &nbsp;·&nbsp; t_r = {fmtEng(r.riseTime1090, 's', 4)}
                    </div>
                  </div>

                  {status && <span className={`status ${status.cls}`}>{status.text}</span>}

                  <table className="result-table">
                    <tbody>
                      <tr><td>{text.table.tau}</td><td>{fmtEng(r.tau, 's', 5)}</td></tr>
                      <tr><td>{text.table.rise}</td><td>{fmtEng(r.riseTime1090, 's', 5)}</td></tr>
                      <tr className="mini-head">
                        <td>{text.table.settleHead}</td>
                        <td>{text.table.settleSub}</td>
                      </tr>
                      {r.steps.map((st) => (
                        <tr key={st.n}>
                          <td>{st.n}τ</td>
                          <td>{fmtEng(st.time, 's', 4)} · {text.pct(fmt(st.pct, 4))}</td>
                        </tr>
                      ))}
                      <tr>
                        <td>
                          {f.tool === TOOL_RC ? text.table.peakCurrent : text.table.steadyCurrent}
                        </td>
                        <td>{fmtAmp(r.Ifinal, 4)}</td>
                      </tr>
                      {r.mode === MODE_SYNTHESIS && (
                        <tr>
                          <td>{text.table.nearestE24}</td>
                          <td>
                            {f.tool === TOOL_RC
                              ? `${fmt(r.nearestC.value, 4)} nF`
                              : `${fmt(r.nearestL.value, 4)} µH`}{' '}
                            <span className="sub">
                              ({text.pct(fmtPct(f.tool === TOOL_RC ? r.nearestC.errorPct : r.nearestL.errorPct))})
                            </span>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </>
              ) : (
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
                </>
              )}

              <Commentary items={notes} />
            </>
          )}
        </ResultPanel>

        {/* ---------- Sağ: Teknik detay ---------- */}
        <section className="panel panel-detail">
          <h2>{ui.technicalDetail}</h2>

          <pre className="formula">{text.formula[f.tool]}</pre>

          {r.ok && isTiming && (
            <ul className="detail-list">
              <li>{text.detail.tauSource(fmtEng(r.tau, 's', 6), f.tool === TOOL_RC)}</li>
              <li>{text.detail.supply(fmtVolt(r.Vs), fmtRes(r.R, 4))}</li>
              {r.mode === MODE_SYNTHESIS && <li>{text.detail.solved(r.solvedBy)}</li>}
              <li>{text.detail.noRounding}</li>
            </ul>
          )}

          {r.ok && !isTiming && (
            <ul className="detail-list">
              <li>{text.detail.crystalModel(r.mode === MODE_SYNTHESIS && r.simplified)}</li>
              <li>{text.detail.seriesEquivalent}</li>
              <li>{text.detail.slope}</li>
            </ul>
          )}

          <h2 className="section">{ui.validity}</h2>
          <ul className="detail-list">
            {text.validity[f.tool].map((a) => <li key={a}>{a}</li>)}
            <li>{text.validity.approximate}</li>
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
                label: isTiming ? text.chart.markerTiming : text.chart.markerCrystal,
              }}
              formatX={(v) => (isTiming ? fmtEng(v, '', 3) : fmt(v, 3))}
              formatY={(v) => fmt(v, 3)}
              caption={chartMeta.caption}
            />

            <ChartDataTable
              xLabel={chartMeta.x}
              series={chartSeries}
              every={6}
              formatX={(v) => (isTiming ? fmtEng(v, 's', 4) : `${fmt(v, 4)} pF`)}
              formatY={(v) => fmt(v, 4)}
            />
          </>
        ) : (
          <p className="empty-note">{ui.chartNeedsInput}</p>
        )}
      </section>

      <ReportDialog section={reportSection} schematicRef={schematicRef} chartRef={chartRef} />
      <SaveToProject
        toolKey="rc-crystal"
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
