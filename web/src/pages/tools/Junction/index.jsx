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
import { fmt, fmtWatt } from '../../../lib/num'
import JunctionSchematic from './schematic'
import {
  INITIAL_FORM, MODES, MODE_JUNCTION, MODE_HEATSINK, MODE_SURFACE,
  METRICS, COPPER_OPTIONS, COPPER_ON, compute, buildSweep,
} from './model'
import { getText } from './text'
import { buildReportSection } from './report'

const DIM_UNITS = ['mm', 'µm', 'mil']
const AREA_UNITS = ['mm²', 'mil²', 'm²']

export default function Junction() {
  const [mode, setMode] = useState(MODE_JUNCTION)
  const { f, set, patch } = useToolForm(INITIAL_FORM)

  // Kaydedilmiş hesabı geri yükler (?hesap=<id>) ve ekranı o kayda bağlar;
  // SaveToProject bağlı kayda yeni satır açmak yerine üzerine yazar.
  const saved = useSavedCalculation({
    toolKey: 'junction', initialForm: INITIAL_FORM, patch, setMode,
  })
  const { lang } = useLang()

  const text = useMemo(() => getText(lang), [lang])
  const ui = useMemo(() => commonText(lang), [lang])

  const r = useMemo(() => compute(mode, f, text.fieldLabels), [mode, f, text])
  const s = useMemo(() => buildSweep(r), [r])
  const notes = useMemo(() => text.commentary(r), [r, text])

  // Rapor bölümü SVG'siz kurulur; ReportDialog indirme anında canlı DOM'dan
  // (aşağıdaki ref'ler) şematik ve grafiği okuyup satır içine çevirir.
  const reportSection = useMemo(
    () => buildReportSection({ mode, f, r, s, text }),
    [mode, f, r, s, text],
  )
  const schematicRef = useRef(null)
  const chartRef = useRef(null)

  const status = useMemo(() => {
    if (!r.ok || notes.length === 0) return null
    const levels = notes.map((n) => n.level)
    const worst = worstLevel(levels)
    return statusChip(worst, countAtLevel(levels, worst), ui)
  }, [r, notes, ui])

  const copperOn = f.copper === COPPER_ON
  const chartMeta = text.chart[mode]
  const chartSeries = s
    ? [{ key: 'tj', name: text.chart.seriesTj, tone: toneClass(0), points: s.points }]
    : []
  const chartX = (v) => (mode === MODE_HEATSINK ? `${fmt(v, 3)} °C/W` : `${fmt(v, 3)} W`)

  // θ_SA,max ≤ 0 iken tarama hiç kurulamıyor; boş grafik notu bunu söyler,
  // diğer her durumda ortak "geçerli girdi gerekli" notu görünür.
  const chartEmptyNote = r.ok && r.mode === MODE_HEATSINK && !r.feasible
    ? text.chartInfeasible
    : ui.chartNeedsInput

  return (
    <>
      <LangLink className="backlink" to="/kategori/guc-termal">{text.backlink}</LangLink>

      <ToolHeader title={text.title} intro={text.intro} />

      <div className="tool-grid">
        {/* ---------- Sol: Girdiler ---------- */}
        <section className="panel">
          <h2>{ui.inputs}</h2>

          <JunctionSchematic ref={schematicRef} r={r} form={f} mode={mode} text={text.schematic} />

          <Segmented
            value={mode}
            onChange={setMode}
            options={MODES.map((m) => ({ value: m, label: text.modeLabel[m] }))}
          />

          {mode === MODE_SURFACE ? (
            <>
              <NumberField
                label={text.fields.Tsurface.label}
                value={f.Tsurface} onChange={set('Tsurface')}
                units={['°C']} unit="°C" onUnit={() => {}}
                hint={text.fields.Tsurface.hint}
              />
              <SelectField
                label={text.fields.metric.label}
                value={f.metric} onChange={set('metric')}
                options={METRICS.map((m) => ({ value: m, label: text.metricLabel[m] }))}
                hint={text.fields.metric.hint}
              />
              <NumberField
                label={text.fields.psi.label(text.metricShort[f.metric])}
                value={f.psi} onChange={set('psi')}
                units={['°C/W']} unit="°C/W" onUnit={() => {}}
                hint={text.fields.psi.hint}
              />
            </>
          ) : (
            <NumberField
              label={text.fields.Ta.label}
              value={f.Ta} onChange={set('Ta')}
              units={['°C']} unit="°C" onUnit={() => {}}
              hint={text.fields.Ta.hint}
            />
          )}

          <NumberField
            label={text.fields.P.label}
            value={f.P} onChange={set('P')}
            units={['W', 'mW', 'kW']} unit={f.Pu} onUnit={set('Pu')}
          />

          {mode === MODE_JUNCTION && (
            <NumberField
              label={text.fields.thetaJA.label}
              value={f.thetaJA} onChange={set('thetaJA')}
              units={['°C/W']} unit="°C/W" onUnit={() => {}}
              hint={text.fields.thetaJA.hint}
            />
          )}

          {mode === MODE_HEATSINK && (
            <>
              <NumberField
                label={text.fields.thetaJC.label}
                value={f.thetaJC} onChange={set('thetaJC')}
                units={['°C/W']} unit="°C/W" onUnit={() => {}}
              />
              <NumberField
                label={text.fields.thetaCS.label}
                value={f.thetaCS} onChange={set('thetaCS')}
                units={['°C/W']} unit="°C/W" onUnit={() => {}}
                hint={text.fields.thetaCS.hint}
              />
              <NumberField
                label={text.fields.thetaSA.label}
                value={f.thetaSA} onChange={set('thetaSA')}
                units={['°C/W']} unit="°C/W" onUnit={() => {}}
                hint={text.fields.thetaSA.hint}
              />
            </>
          )}

          <NumberField
            label={mode === MODE_SURFACE
              ? text.fields.TjMax.labelOptional
              : text.fields.TjMax.label}
            value={f.TjMax} onChange={set('TjMax')}
            units={['°C']} unit="°C" onUnit={() => {}}
          />

          <SelectField
            label={text.fields.copper.label}
            value={f.copper} onChange={set('copper')}
            options={COPPER_OPTIONS.map((c) => ({ value: c, label: text.copperLabel[c] }))}
            hint={text.fields.copper.hint}
          />

          {copperOn && (
            <>
              <NumberField
                label={text.fields.Lcu.label}
                value={f.Lcu} onChange={set('Lcu')}
                units={DIM_UNITS} unit={f.Lcuu} onUnit={set('Lcuu')}
              />
              <NumberField
                label={text.fields.Wcu.label}
                value={f.Wcu} onChange={set('Wcu')}
                units={DIM_UNITS} unit={f.Wcuu} onUnit={set('Wcuu')}
              />
              <NumberField
                label={text.fields.tcu.label}
                value={f.tcu} onChange={set('tcu')}
                units={DIM_UNITS} unit={f.tcuu} onUnit={set('tcuu')}
              />
              <NumberField
                label={text.fields.Hdi.label}
                value={f.Hdi} onChange={set('Hdi')}
                units={DIM_UNITS} unit={f.Hdiu} onUnit={set('Hdiu')}
              />
              <NumberField
                label={text.fields.area.label}
                value={f.area} onChange={set('area')}
                units={AREA_UNITS} unit={f.areau} onUnit={set('areau')}
                hint={text.fields.area.hint}
              />
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
                  {r.mode === MODE_JUNCTION && text.bigLabel.junction}
                  {r.mode === MODE_HEATSINK
                    && (r.hasSink ? text.bigLabel.junction : text.bigLabel.sinkNeeded)}
                  {r.mode === MODE_SURFACE && text.bigLabel.surface}
                </div>
                <div className="value">
                  {r.mode === MODE_HEATSINK && !r.hasSink
                    ? <>{fmt(r.thetaSAmax, 4)} °C/W</>
                    : <>{fmt(r.Tj, 4)} °C</>}
                </div>
                <div className="alt">
                  {r.mode === MODE_JUNCTION
                    && text.bigAlt.junction(fmt(r.Ta, 4), fmt(r.rise, 4))}
                  {r.mode === MODE_HEATSINK && (r.hasSink
                    ? text.bigAlt.heatsinkWithSink(fmt(r.thetaSAmax, 4), fmt(r.thetaTotal, 4))
                    : text.bigAlt.heatsinkNoSink(
                      fmt(r.budget, 4), fmt(r.thetaJC, 4), fmt(r.thetaCS, 4),
                    ))}
                  {r.mode === MODE_SURFACE && text.bigAlt.surface(
                    text.metricShort[r.metric], fmt(r.Tsurface, 4), fmt(r.rise, 4),
                  )}
                </div>
              </div>

              {status && <span className={`status ${status.cls}`}>{status.text}</span>}

              {r.mode === MODE_JUNCTION && <p className="method-note">{text.thetaNote}</p>}
              {r.mode === MODE_SURFACE && <p className="method-note">{text.psiNote}</p>}
              {r.copperOn && <p className="method-note">{text.firstOrderNote}</p>}

              <table className="result-table">
                <tbody>
                  {r.mode === MODE_JUNCTION && (
                    <>
                      <tr>
                        <td>{text.table.Tj}</td>
                        <td>{fmt(r.Tj, 5)} °C</td>
                      </tr>
                      <tr>
                        <td>{text.table.rise}</td>
                        <td>{fmt(r.rise, 5)} °C</td>
                      </tr>
                      <tr>
                        <td>{text.table.TjMax}</td>
                        <td>{fmt(r.TjMax, 5)} °C</td>
                      </tr>
                      <tr>
                        <td>{text.table.margin}</td>
                        <td>{fmt(r.margin, 5)} °C</td>
                      </tr>
                      <tr>
                        <td>{text.table.Pmax}</td>
                        <td>{fmtWatt(r.Pmax)}</td>
                      </tr>
                      <tr>
                        <td>{text.table.utilisation}</td>
                        <td>{text.pct(fmt(r.utilisation * 100, 4))}</td>
                      </tr>
                    </>
                  )}

                  {r.mode === MODE_HEATSINK && (
                    <>
                      <tr>
                        <td>{text.table.budget}</td>
                        <td>{fmt(r.budget, 5)} °C/W</td>
                      </tr>
                      <tr>
                        <td>{text.table.thetaSAmax}</td>
                        <td>{fmt(r.thetaSAmax, 5)} °C/W</td>
                      </tr>
                      <tr>
                        <td>{text.table.thetaJC}</td>
                        <td>{fmt(r.thetaJC, 5)} °C/W</td>
                      </tr>
                      <tr>
                        <td>{text.table.thetaCS}</td>
                        <td>{fmt(r.thetaCS, 5)} °C/W</td>
                      </tr>
                      {r.hasSink && (
                        <>
                          <tr>
                            <td>{text.table.thetaTotal}</td>
                            <td>{fmt(r.thetaTotal, 5)} °C/W</td>
                          </tr>
                          <tr>
                            <td>{text.table.Tj}</td>
                            <td>{fmt(r.Tj, 5)} °C</td>
                          </tr>
                          <tr>
                            <td>{text.table.margin}</td>
                            <td>{fmt(r.margin, 5)} °C</td>
                          </tr>
                          <tr className="mini-head">
                            <td>{text.table.shareHead}</td>
                            <td>{text.table.shareCols}</td>
                          </tr>
                          <tr>
                            <td>{text.table.shareRow}</td>
                            <td>
                              {text.pct(fmt(r.shares.jc * 100, 3))} ·{' '}
                              {text.pct(fmt(r.shares.cs * 100, 3))} ·{' '}
                              {text.pct(fmt(r.shares.sa * 100, 3))}
                            </td>
                          </tr>
                        </>
                      )}
                    </>
                  )}

                  {r.mode === MODE_SURFACE && (
                    <>
                      <tr>
                        <td>{text.table.TjEstimate}</td>
                        <td>{fmt(r.Tj, 5)} °C</td>
                      </tr>
                      <tr>
                        <td>{text.table.metricUsed}</td>
                        <td>{text.metricShort[r.metric]}</td>
                      </tr>
                      <tr>
                        <td>{text.table.metricValue}</td>
                        <td>{fmt(r.psi, 5)} °C/W</td>
                      </tr>
                      <tr>
                        <td>{text.table.psiRise}</td>
                        <td>{fmt(r.rise, 5)} °C</td>
                      </tr>
                      <tr>
                        <td>{text.table.Tsurface}</td>
                        <td>{fmt(r.Tsurface, 5)} °C</td>
                      </tr>
                    </>
                  )}

                  {r.copperOn && r.copper && (
                    <>
                      <tr className="mini-head">
                        <td>{text.table.copperHead}</td>
                        <td>{text.table.copperHeadNote}</td>
                      </tr>
                      <tr>
                        <td>{text.table.copperStrip}</td>
                        <td>{fmt(r.copper.strip.Rth, 5)} °C/W</td>
                      </tr>
                      <tr>
                        <td>{text.table.copperDielectric}</td>
                        <td>{fmt(r.copper.dielectric.Rth, 5)} °C/W</td>
                      </tr>
                      <tr>
                        <td>{text.table.copperEq}</td>
                        <td>{fmt(r.copper.eq.Rth, 5)} °C/W</td>
                      </tr>
                      <tr>
                        <td>{text.table.copperShares}</td>
                        <td>
                          {text.pct(fmt(r.copper.eq.shares[0] * 100, 3))} ·{' '}
                          {text.pct(fmt(r.copper.eq.shares[1] * 100, 3))}
                        </td>
                      </tr>
                      <tr>
                        <td>{text.table.copperRise}</td>
                        <td>{fmt(r.copper.rise.deltaT, 5)} °C</td>
                      </tr>
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

          <pre className="formula">{text.formula[mode]}</pre>
          {copperOn && <pre className="formula">{text.copperFormula}</pre>}

          {r.ok && (
            <ul className="detail-list">
              {r.mode === MODE_JUNCTION && <li>{text.detail.junction(r)}</li>}
              {r.mode === MODE_HEATSINK && <li>{text.detail.heatsink(r)}</li>}
              {r.mode === MODE_SURFACE && <li>{text.detail.surface(r)}</li>}
              {r.copperOn && r.copper && <li>{text.detail.copper(r)}</li>}
              <li>{text.detail.degreeUnits}</li>
              <li>{text.detail.noRounding}</li>
            </ul>
          )}

          <h2 className="section">{ui.validity}</h2>
          <ul className="detail-list">
            {text.validity.map((item, i) => (
              <li key={i}>
                {item.strong && <><strong>{item.strong}</strong>{' '}</>}
                {item.text}
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
                { label: text.chart.seriesTj, tone: toneClass(0), kind: 'line' },
                ...s.refs.map(() => ({
                  label: text.chart.seriesTjMax, tone: 'tone-muted', kind: 'line',
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
                label: text.chart.refLabel(fmt(ref.y, 4)),
              }))}
              marker={{ ...s.marker, label: text.chart.marker }}
              formatX={(v) => fmt(v, 3)}
              formatY={(v) => fmt(v, 4)}
              caption={chartMeta.caption}
            />

            <ChartDataTable
              xLabel={chartMeta.x}
              series={chartSeries}
              every={6}
              formatX={chartX}
              formatY={(v) => `${fmt(v, 4)} °C`}
            />
          </>
        ) : (
          <p className="empty-note">{chartEmptyNote}</p>
        )}
      </section>

      <ReportDialog section={reportSection} schematicRef={schematicRef} chartRef={chartRef} />
      <SaveToProject
        toolKey="junction"
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
