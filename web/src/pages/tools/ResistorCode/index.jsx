import { useMemo, useRef, useState } from 'react'
import LangLink from '../../../components/LangLink'
import NumberField from '../../../components/NumberField'
import SelectField from '../../../components/SelectField'
import TextField from '../../../components/TextField'
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
import { fmt, fmtRes, fmtPct } from '../../../lib/num'
import CodeSchematic from './schematic'
import {
  INITIAL_FORM, MODE_ANALYSIS, MODE_SYNTHESIS,
  KIND_COLOR, KIND_CAP, KINDS, BAND_COUNTS,
  compute, buildSweep, bandRoles,
} from './model'
import { getText } from './text'
import { buildReportSection } from './report'

export default function ResistorCode() {
  const [mode, setMode] = useState(MODE_ANALYSIS)
  const { f, set, patch } = useToolForm(INITIAL_FORM)

  // Kaydedilmiş hesabı geri yükler (?hesap=<id>) ve ekranı o kayda bağlar;
  // SaveToProject bağlı kayda yeni satır açmak yerine üzerine yazar.
  const saved = useSavedCalculation({
    toolKey: 'resistor-code', initialForm: INITIAL_FORM, patch, setMode,
  })
  const { lang } = useLang()

  const text = useMemo(() => getText(lang), [lang])
  const ui = useMemo(() => commonText(lang), [lang])

  const r = useMemo(() => compute(mode, f, text.fieldLabels), [mode, f, text])
  const s = useMemo(() => buildSweep(r), [r])
  const notes = useMemo(() => text.commentary(r), [r, text])

  // Bu pilotta yalnızca şematik yakalanır — grafik kapsam dışı bırakıldı
  // (bant renklerinin svgInline.js'i sınaması amaçlanıyordu, bkz. plan §13).
  const reportSection = useMemo(() => buildReportSection({ mode, f, r, text }), [mode, f, r, text])
  const schematicRef = useRef(null)

  const status = useMemo(() => {
    if (!r.ok || notes.length === 0) return null
    const levels = notes.map((n) => n.level)
    const worst = worstLevel(levels)
    return statusChip(worst, countAtLevel(levels, worst), ui)
  }, [r, notes, ui])

  const roles = bandRoles(Number(f.bandCount))
  const chartSeries = s
    ? [{ key: 'rt', name: text.chart.series, tone: toneClass(0), points: s.points }]
    : []

  return (
    <>
      <LangLink className="backlink" to="/kategori/komponent">{text.backlink}</LangLink>

      <ToolHeader title={text.title} intro={text.intro} />

      <div className="tool-grid">
        {/* ---------- Sol: Girdiler ---------- */}
        <section className="panel">
          <h2>{ui.inputs}</h2>

          <CodeSchematic ref={schematicRef} r={r} form={f} text={text.schematic} />

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
            label={text.fields.kind}
            value={f.kind} onChange={set('kind')}
            options={KINDS.map((k) => ({ value: k, label: text.kindLabel[k] }))}
          />

          {(f.kind === KIND_COLOR || mode === MODE_SYNTHESIS) && (
            <SelectField
              label={text.fields.bandCount}
              value={f.bandCount} onChange={set('bandCount')}
              options={BAND_COUNTS.map((n) => ({ value: String(n), label: text.bandCountOption(n) }))}
            />
          )}

          {mode === MODE_SYNTHESIS ? (
            <>
              <NumberField
                label={text.fields.target}
                value={f.target} onChange={set('target')}
                units={['Ω', 'kΩ', 'MΩ']} unit={f.targetUnit} onUnit={set('targetUnit')}
              />
              <NumberField
                label={text.fields.tolerance.label}
                value={f.tolerance} onChange={set('tolerance')}
                units={['%']} unit="%" onUnit={() => {}}
                hint={text.fields.tolerance.hint}
              />
              {f.bandCount === '6' && (
                <NumberField
                  label={text.fields.tcr.label}
                  value={f.tcr} onChange={set('tcr')}
                  units={['ppm/°C']} unit="ppm/°C" onUnit={() => {}}
                  hint={text.fields.tcr.hint}
                />
              )}
            </>
          ) : f.kind === KIND_COLOR ? (
            roles.map((role) => (
              <SelectField
                key={role.index}
                label={text.roleLabel[role.role](role.index)}
                value={f[`b${role.index}`]} onChange={set(`b${role.index}`)}
                options={role.options.map((c) => ({ value: c.key, label: text.colorName[c.key] }))}
              />
            ))
          ) : (
            <TextField
              label={text.fields.cap.label}
              value={f.cap} onChange={set('cap')}
              hint={text.fields.cap.hint}
            />
          )}

          <NumberField
            label={text.fields.Tref.label}
            value={f.Tref} onChange={set('Tref')}
            units={['°C']} unit="°C" onUnit={() => {}}
            hint={text.fields.Tref.hint}
          />
          <NumberField
            label={text.fields.Tmin}
            value={f.Tmin} onChange={set('Tmin')}
            units={['°C']} unit="°C" onUnit={() => {}}
          />
          <NumberField
            label={text.fields.Tmax}
            value={f.Tmax} onChange={set('Tmax')}
            units={['°C']} unit="°C" onUnit={() => {}}
          />
        </section>

        {/* ---------- Orta: Ana sonuç ---------- */}
        {/* İç `r.ok &&` kapısı gerekli: children JSX'i ResultPanel çizmese de
            burada kurulur — bkz. TraceWidth'teki aynı not. */}
        <ResultPanel r={r} reason={(code) => text.reasonText(code, r.detail)}>
          {r.ok && (
            <>
              <div className="big-result">
                <div className="label">
                  {r.kind === KIND_CAP
                    ? text.big.capacitance
                    : r.mode === MODE_SYNTHESIS ? text.big.representable : text.big.resistance}
                </div>
                <div className="value">
                  {r.kind === KIND_CAP ? `${fmt(r.nF, 4)} nF` : fmtRes(r.ohms, 4)}
                </div>
                <div className="alt">
                  {r.kind === KIND_CAP
                    ? text.big.capAlt(fmt(r.pF, 4), fmt(r.uF, 4))
                    : r.tolerance != null
                      ? text.big.tolRange(fmt(r.tolerance, 3), fmtRes(r.min, 4), fmtRes(r.max, 4))
                      : text.big.noTolerance}
                </div>
              </div>

              {status && <span className={`status ${status.cls}`}>{status.text}</span>}

              {r.mode === MODE_SYNTHESIS && (
                <table className="result-table">
                  <tbody>
                    <tr>
                      <td>{text.table.bands}</td>
                      <td>{r.bands.map((b) => text.colorName[b]).join(' · ')}</td>
                    </tr>
                    <tr>
                      <td>{text.table.requested}</td>
                      <td>{fmtRes(r.requested, 4)}</td>
                    </tr>
                    <tr>
                      <td>{text.table.representable}</td>
                      <td>
                        {fmtRes(r.ohms, 4)}{' '}
                        {r.exact ? '' : <span className="sub">{text.table.nearestNote}</span>}
                      </td>
                    </tr>
                  </tbody>
                </table>
              )}

              {r.kind !== KIND_CAP && (
                <table className="result-table">
                  <tbody>
                    {r.mode === MODE_ANALYSIS && r.kind === KIND_COLOR && (
                      <tr>
                        <td>{text.table.bands}</td>
                        <td>{r.bands.map((b) => text.colorName[b]).join(' · ')}</td>
                      </tr>
                    )}
                    <tr>
                      <td>{text.table.nearestE24}</td>
                      <td>
                        {fmtRes(r.nearestE24.value, 4)}{' '}
                        <span className="sub">({text.pct(fmtPct(r.nearestE24.errorPct))})</span>
                      </td>
                    </tr>
                    <tr>
                      <td>{text.table.nearestE96}</td>
                      <td>
                        {fmtRes(r.nearestE96.value, 4)}{' '}
                        <span className="sub">({text.pct(fmtPct(r.nearestE96.errorPct))})</span>
                      </td>
                    </tr>
                    {r.tcr != null && (
                      <>
                        <tr>
                          <td>{text.table.tcr}</td>
                          <td>{fmt(r.tcr, 3)} ppm/°C</td>
                        </tr>
                        <tr>
                          <td>{text.table.resistanceAt(fmt(r.temps.Tref, 3))}</td>
                          <td>
                            {fmtRes(r.atTref, 4)} <span className="sub">({text.pct(fmtPct(r.driftPct))})</span>
                          </td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              )}

              {r.kind === KIND_CAP && (
                <table className="result-table">
                  <tbody>
                    <tr>
                      <td>pF</td>
                      <td>{fmt(r.pF, 6)}</td>
                    </tr>
                    <tr>
                      <td>nF</td>
                      <td>{fmt(r.nF, 6)}</td>
                    </tr>
                    <tr>
                      <td>µF</td>
                      <td>{fmt(r.uF, 6)}</td>
                    </tr>
                    {r.tolerance != null && (
                      <tr>
                        <td>{text.table.capTolerance(r.toleranceLetter)}</td>
                        <td>±{text.pct(fmt(r.tolerance, 3))}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              <Commentary items={notes} />
            </>
          )}
        </ResultPanel>

        {/* ---------- Sağ: Teknik detay ---------- */}
        <section className="panel panel-detail">
          <h2>{ui.technicalDetail}</h2>

          <pre className="formula">{text.formula}</pre>

          {r.ok && r.kind !== KIND_CAP && (
            <ul className="detail-list">
              <li>{text.detail.nominal(fmtRes(r.ohms, 6))}</li>
              {r.tolerance != null && (
                <li>{text.detail.toleranceWindow(fmtRes(r.min, 6), fmtRes(r.max, 6))}</li>
              )}
              {r.tcr != null && (
                <li>{text.detail.drift(fmt(r.temps.Tref, 3), text.pct(fmtPct(r.driftPct)))}</li>
              )}
              <li>{text.detail.noRounding}</li>
            </ul>
          )}

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
            <ChartLegend
              items={[
                { label: text.chart.series, tone: toneClass(0), kind: 'line' },
                ...s.refs.map((ref) => ({
                  label: ref.key === 'min' ? text.chart.legendMin : text.chart.legendMax,
                  tone: 'tone-muted',
                  kind: 'line',
                })),
              ]}
            />

            <LineChart
              xScale="linear"
              xLabel={text.chart.x}
              yLabel={text.chart.y}
              series={chartSeries}
              refLines={s.refs.map((ref) => ({
                key: ref.key,
                y: ref.y,
                label: ref.key === 'min'
                  ? text.chart.refMin(fmtRes(ref.y, 4))
                  : text.chart.refMax(fmtRes(ref.y, 4)),
              }))}
              marker={{ ...s.marker, label: text.chart.tempTick(fmt(r.temps.Tref, 3)) }}
              formatX={(v) => fmt(v, 3)}
              formatY={(v) => fmt(v, 4)}
              caption={text.chart.caption}
            />

            <ChartDataTable
              xLabel={text.chart.x}
              series={chartSeries}
              every={5}
              formatX={(v) => text.chart.tempTick(fmt(v, 3))}
              formatY={(v) => fmtRes(v, 5)}
            />
          </>
        ) : (
          <p className="empty-note">{text.chartEmpty}</p>
        )}
      </section>

      <ReportDialog section={reportSection} schematicRef={schematicRef} />
      <SaveToProject
        toolKey="resistor-code"
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
