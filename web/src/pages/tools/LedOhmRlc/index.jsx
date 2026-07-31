import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import NumberField from '../../../components/NumberField'
import SelectField from '../../../components/SelectField'
import TextField from '../../../components/TextField'
import Segmented from '../../../components/Segmented'
import ToolHeader from '../../../components/ToolHeader'
import Commentary from '../../../components/Commentary'
import LineChart, { ChartLegend, ChartDataTable, toneClass } from '../../../components/LineChart'
import ReportDialog from '../../../components/ReportDialog'
import SaveToProject from '../../../components/SaveToProject'
import useToolForm from '../../../hooks/useToolForm'
import { statusChip, worstLevel, countAtLevel } from '../../../lib/statusChip'
import useSavedCalculation from '../../../hooks/useSavedCalculation'
import { useLang } from '../../../hooks/useLang'
import { commonText } from '../../../data/uiText'
import { fmt, fmtEng, fmtRes, fmtAmp, fmtPow, fmtVolt, fmtPct } from '../../../lib/num'
import CircuitSchematic from './schematic'
import {
  INITIAL_FORM, TOOLS, TOOL_OHM, TOOL_LED, TOOL_RLC, TOOL_COMBO,
  MODE_ANALYSIS, MODE_SYNTHESIS, HAS_MODES,
  COMBO_SERIES, COMBO_PARALLEL,
  REASON_VALUE_LIST,
  compute, buildSweep,
} from './model'
import { getText } from './text'
import { buildReportSection } from './report'

export default function LedOhmRlc() {
  const [mode, setMode] = useState(MODE_ANALYSIS)
  const { f, set, patch } = useToolForm(INITIAL_FORM)

  // Kaydedilmiş hesabı geri yükler (?hesap=<id>) ve ekranı o kayda bağlar;
  // SaveToProject bağlı kayda yeni satır açmak yerine üzerine yazar.
  const saved = useSavedCalculation({
    toolKey: 'led-ohm-rlc', initialForm: INITIAL_FORM, patch, setMode,
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

  const chartMeta = s ? text.chart[s.kind] : null
  const chartSeries = s
    ? [{ key: 'main', name: chartMeta.y, tone: toneClass(0), points: s.points }]
    : []

  return (
    <>
      <Link className="backlink" to="/kategori/komponent">{text.backlink}</Link>

      <ToolHeader title={text.title} intro={text.intro} />

      <div className="tool-grid">
        {/* ---------- Sol: Girdiler ---------- */}
        <section className="panel">
          <h2>{ui.inputs}</h2>

          <CircuitSchematic ref={schematicRef} r={r} form={f} text={text.schematic} />

          <SelectField
            label={text.fields.tool}
            value={f.tool} onChange={set('tool')}
            options={TOOLS.map((x) => ({ value: x, label: text.toolLabel[x] }))}
          />

          {HAS_MODES[f.tool] && (
            <Segmented
              value={mode}
              onChange={setMode}
              options={[
                { value: MODE_ANALYSIS, label: text.modeLabel[MODE_ANALYSIS] },
                { value: MODE_SYNTHESIS, label: text.modeLabel[MODE_SYNTHESIS] },
              ]}
            />
          )}

          {f.tool === TOOL_OHM && (
            <>
              <p className="method-note">{text.ohmNote}</p>
              <NumberField
                label={text.fields.V.label}
                value={f.V} onChange={set('V')}
                units={['V', 'mV', 'kV']} unit={f.Vu} onUnit={set('Vu')}
                placeholder={text.fields.blankPlaceholder}
              />
              <NumberField
                label={text.fields.I.label}
                value={f.I} onChange={set('I')}
                units={['A', 'mA', 'µA']} unit={f.Iu} onUnit={set('Iu')}
                placeholder={text.fields.blankPlaceholder}
              />
              <NumberField
                label={text.fields.R.label}
                value={f.R} onChange={set('R')}
                units={['Ω', 'kΩ', 'MΩ']} unit={f.Ru} onUnit={set('Ru')}
                placeholder={text.fields.blankPlaceholder}
              />
              <NumberField
                label={text.fields.P.label}
                value={f.P} onChange={set('P')}
                units={['W', 'mW', 'kW']} unit={f.Pu} onUnit={set('Pu')}
                placeholder={text.fields.blankPlaceholder}
              />
            </>
          )}

          {f.tool === TOOL_LED && (
            <>
              <NumberField
                label={text.fields.Vs.label}
                value={f.Vs} onChange={set('Vs')}
                units={['V', 'mV']} unit={f.Vsu} onUnit={set('Vsu')}
              />
              <NumberField
                label={text.fields.Vf.label}
                value={f.Vf} onChange={set('Vf')}
                units={['V', 'mV']} unit={f.Vfu} onUnit={set('Vfu')}
                hint={text.fields.Vf.hint}
              />
              <NumberField
                label={text.fields.n.label}
                value={f.n} onChange={set('n')}
                units={[text.fields.countUnit]} unit={text.fields.countUnit} onUnit={() => {}}
              />
              <NumberField
                label={text.fields.Iled.label}
                value={f.Iled} onChange={set('Iled')}
                units={['mA', 'A']} unit={f.Iledu} onUnit={set('Iledu')}
              />
              <NumberField
                label={text.fields.derating.label}
                value={f.derating} onChange={set('derating')}
                units={['%']} unit="%" onUnit={() => {}}
                hint={text.fields.derating.hint}
              />
            </>
          )}

          {f.tool === TOOL_RLC && (
            <>
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
            </>
          )}

          {f.tool === TOOL_COMBO && (
            <>
              <SelectField
                label={text.fields.combo}
                value={f.combo} onChange={set('combo')}
                options={[
                  { value: COMBO_PARALLEL, label: text.comboLabel[COMBO_PARALLEL] },
                  { value: COMBO_SERIES, label: text.comboLabel[COMBO_SERIES] },
                ]}
              />
              <TextField
                label={text.fields.values.label}
                value={f.values} onChange={set('values')}
                hint={text.fields.values.hint}
              />
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
              <p className="empty-note">
                {r.reason === REASON_VALUE_LIST
                  ? text.valueListError(r.valueList, r.at)
                  : text.reasonText(r.reason, r)}
              </p>
            )
          ) : (
            <>
              {r.tool === TOOL_OHM && (
                <>
                  <div className="big-result">
                    <div className="label">{text.big.ohmLabel}</div>
                    <div className="value">{fmtPow(r.P, 4)}</div>
                    <div className="alt">
                      V = {fmtVolt(r.V)} &nbsp;·&nbsp; I = {fmtAmp(r.I)} &nbsp;·&nbsp; R = {fmtRes(r.R)}
                    </div>
                  </div>
                  {status && <span className={`status ${status.cls}`}>{status.text}</span>}
                  <table className="result-table">
                    <tbody>
                      <tr><td>{text.table.voltage}</td><td>{fmtVolt(r.V)}</td></tr>
                      <tr><td>{text.table.current}</td><td>{fmtAmp(r.I)}</td></tr>
                      <tr><td>{text.table.resistance}</td><td>{fmtRes(r.R)}</td></tr>
                      <tr><td>{text.table.power}</td><td>{fmtPow(r.P)}</td></tr>
                      {r.inconsistency != null && (
                        <tr>
                          <td>{text.table.inconsistency}</td>
                          <td>{text.pct(fmt(r.inconsistency * 100, 3))}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </>
              )}

              {r.tool === TOOL_LED && (
                <>
                  <div className="big-result">
                    <div className="label">{text.big.ledLabel}</div>
                    <div className="value">{fmtRes(r.R, 4)}</div>
                    <div className="alt">
                      {text.big.ledAlt(fmtRes(r.e24.value, 4), fmtAmp(r.e24.I, 3))}
                    </div>
                  </div>
                  {status && <span className={`status ${status.cls}`}>{status.text}</span>}
                  <table className="result-table">
                    <tbody>
                      <tr><td>{text.table.totalLedVoltage}</td><td>{fmtVolt(r.Vled)}</td></tr>
                      <tr><td>{text.table.headroom}</td><td>{fmtVolt(r.headroom)}</td></tr>
                      <tr><td>{text.table.idealResistance}</td><td>{fmtRes(r.R, 5)}</td></tr>
                      <tr><td>{text.table.resistorPower}</td><td>{fmtPow(r.P, 4)}</td></tr>
                      <tr>
                        <td>{text.table.ratedPower}</td>
                        <td>
                          {fmtPow(r.Prated, 4)}{' '}
                          <span className="sub">
                            {text.table.utilisation(text.pct(fmt(r.derating * 100, 3)))}
                          </span>
                        </td>
                      </tr>
                      <tr className="mini-head">
                        <td>{text.table.standardHead}</td>
                        <td>{text.table.standardHeadSub}</td>
                      </tr>
                      <tr>
                        <td>E24</td>
                        <td>
                          {fmtRes(r.e24.value, 4)} · {fmtAmp(r.e24.I, 3)} ·{' '}
                          {text.pct(fmtPct((100 * (r.e24.I - r.targetI)) / r.targetI))}
                        </td>
                      </tr>
                      <tr>
                        <td>E96</td>
                        <td>
                          {fmtRes(r.e96.value, 4)} · {fmtAmp(r.e96.I, 3)} ·{' '}
                          {text.pct(fmtPct((100 * (r.e96.I - r.targetI)) / r.targetI))}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </>
              )}

              {r.tool === TOOL_RLC && (
                <>
                  <div className="big-result">
                    <div className="label">
                      {r.mode === MODE_SYNTHESIS
                        ? text.big.rlcSynthesisLabel
                        : text.big.rlcAnalysisLabel(fmtEng(r.f, 'Hz', 4))}
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
                </>
              )}

              {r.tool === TOOL_COMBO && (
                <>
                  <div className="big-result">
                    <div className="label">{text.big.comboLabel(r.combo)}</div>
                    <div className="value">{fmtRes(r.equivalent, 4)}</div>
                    <div className="alt">
                      {text.big.comboAlt(
                        r.values.length,
                        fmtRes(r.nearestE24.value, 4),
                        text.pct(fmtPct(r.nearestE24.errorPct)),
                      )}
                    </div>
                  </div>
                  {status && <span className={`status ${status.cls}`}>{status.text}</span>}
                  <table className="result-table">
                    <tbody>
                      <tr className="mini-head">
                        <td>{text.table.shareHead}</td>
                        <td>
                          {r.combo === COMBO_SERIES
                            ? text.table.shareSeries
                            : text.table.shareParallel}
                        </td>
                      </tr>
                      {r.values.map((x, i) => (
                        <tr key={`${x}-${i}`}>
                          <td>{fmtRes(x, 4)}</td>
                          <td>{text.pct(fmt(r.shares[i] * 100, 3))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}

              <Commentary items={notes} />
            </>
          )}
        </section>

        {/* ---------- Sağ: Teknik detay ---------- */}
        <section className="panel panel-detail">
          <h2>{ui.technicalDetail}</h2>

          <pre className="formula">{text.formula[f.tool]}</pre>

          {r.ok && r.tool === TOOL_RLC && (
            <ul className="detail-list">
              {text.detail.rlc(r).map((line) => <li key={line}>{line}</li>)}
            </ul>
          )}

          {r.ok && r.tool === TOOL_LED && (
            <ul className="detail-list">
              {text.detail.led(r).map((line) => <li key={line}>{line}</li>)}
            </ul>
          )}

          {r.ok && r.tool === TOOL_OHM && (
            <ul className="detail-list">
              {text.detail.ohm(r).map((line) => <li key={line}>{line}</li>)}
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
                { label: chartMeta.y, tone: toneClass(0), kind: 'line' },
                ...s.refs.map((ref) => ({
                  label: ref.key === 'target'
                    ? text.chart.targetLegend
                    : text.chart.resistanceLegend,
                  tone: 'tone-muted',
                  kind: 'line',
                })),
              ]}
            />

            <LineChart
              ref={chartRef}
              xScale="log"
              xLabel={chartMeta.x}
              yLabel={chartMeta.y}
              series={chartSeries}
              refLines={s.refs.map((ref) => ({
                key: ref.key,
                y: ref.y,
                label: ref.key === 'target'
                  ? text.chart.targetRef(fmtAmp(ref.y, 3))
                  : `R = ${fmtRes(ref.y, 3)}`,
              }))}
              marker={{ ...s.marker, label: text.chart.marker }}
              formatX={(v) => fmtEng(v, '', 3).replace(' ', '')}
              formatY={(v) => fmt(v, 3)}
              caption={chartMeta.caption}
            />

            <ChartDataTable
              xLabel={chartMeta.x}
              series={chartSeries}
              every={6}
              formatX={(v) => fmtEng(v, '', 4)}
              formatY={(v) => fmt(v, 4)}
            />
          </>
        ) : (
          <p className="empty-note">
            {f.tool === TOOL_COMBO ? text.chart.comboNote : ui.chartNeedsInput}
          </p>
        )}
      </section>

      <ReportDialog section={reportSection} schematicRef={schematicRef} chartRef={chartRef} />
      <SaveToProject
        toolKey="led-ohm-rlc"
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
