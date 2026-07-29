import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import NumberField from '../../../components/NumberField'
import SelectField from '../../../components/SelectField'
import LineChart, { ChartLegend, ChartDataTable, toneClass } from '../../../components/LineChart'
import ReportDialog from '../../../components/ReportDialog'
import SaveToProject from '../../../components/SaveToProject'
import ProfilePanel from '../../../components/ProfilePanel'
import DfmChecks from '../../../components/DfmChecks'
import DfmSummaryBox from '../../../components/DfmSummaryBox'
import useToolForm from '../../../hooks/useToolForm'
import useDfmProfiles from '../../../hooks/useDfmProfiles'
import { useLang } from '../../../hooks/useLang'
import { commonText } from '../../../data/uiText'
import { dfmText } from '../../../data/dfmText'
import { fmt } from '../../../lib/num'
import {
  summarizeChecks, STATUS_OK, STATUS_WARNING, STATUS_DANGER, STATUS_UNKNOWN,
} from '../../../lib/dfmCheck'
import { buildDfmSummary } from '../../../lib/dfmSummary'
import { CHECK_VIA_ASPECT } from '../../../lib/bgaBreakout'
import BgaSchematic from './schematic'
import {
  INITIAL_FORM, LEN_UNITS, SWEEP_PITCH, SWEEP_LAND,
  PAD_NSMD, PAD_SMD,
  VIA_THROUGH, VIA_BLIND, VIA_MICROVIA, VIA_IN_PAD,
  compute, buildSweep, formFields,
} from './model'
import { getText } from './text'
import { buildReportSection } from './report'

const MARK = { ok: '✓', warn: '!', danger: '×', unknown: '·' }

// Uzunluklar SI (m) tutulur, ekranda mm yazılır. Yuvarlama yalnızca burada.
const asMm = (v) => (v === null || v === undefined || !Number.isFinite(v) ? '—' : `${fmt(v * 1e3, 4)} mm`)

export default function BgaBreakout() {
  const [sweep, setSweep] = useState(SWEEP_PITCH)
  const { f, set } = useToolForm(INITIAL_FORM)
  const { lang } = useLang()

  const text = useMemo(() => getText(lang), [lang])
  const ui = useMemo(() => commonText(lang), [lang])
  const dfm = useMemo(() => dfmText(lang), [lang])

  const fab = useDfmProfiles()
  const ctx = useMemo(
    () => ({ limits: fab.limits, hasProfile: fab.hasProfile }),
    [fab.limits, fab.hasProfile],
  )

  const r = useMemo(() => compute(f, ctx, text.fieldLabels), [f, ctx, text])
  const s = useMemo(() => buildSweep(r, sweep), [r, sweep])
  const notes = useMemo(() => text.commentary(r, asMm), [r, text])

  const schematicRef = useRef(null)
  const chartRef = useRef(null)

  const checks = r.ok ? r.checks : []
  const summary = useMemo(() => summarizeChecks(checks), [checks])

  // Aspect ratio ve koridor kontrolü mm ile yazılmaz: ilki boyutsuz, ikincisi
  // uzunluk. Ayrımı burada yapıyoruz, bileşen birim bilmez.
  const rows = useMemo(() => checks.map((c) => {
    const dimensionless = c.id === CHECK_VIA_ASPECT
    const format = dimensionless
      ? (v) => (v === null || !Number.isFinite(v) ? '—' : fmt(v, 3))
      : asMm
    return {
      id: c.id,
      label: text.checkLabel(c.id),
      status: c.status,
      actual: typeof c.actual === 'boolean' ? '—' : format(c.actual),
      required: typeof c.required === 'boolean' ? '—' : format(c.required),
      margin: c.margin === null ? '—' : format(c.margin),
      source: dfm.sourceLabel(c.source),
      reason: dfm.unknownReason(c.variant),
    }
  }), [checks, text, dfm])

  const status = useMemo(() => {
    if (!r.ok || checks.length === 0) return null
    const worst = summary.worst
    const count = summary[worst]
    if (worst === STATUS_OK) return { cls: 'ok', text: ui.statusOk }
    if (worst === STATUS_WARNING) return { cls: 'warn', text: ui.statusWarn(count) }
    if (worst === STATUS_DANGER) return { cls: 'danger', text: ui.statusDanger(count) }
    return { cls: 'unknown', text: ui.statusUnknown(count) }
  }, [r, checks, summary, ui])

  // İhtiyatlı sonuç cümlesi: "route edilir" denmez. Bir tek kontrol bile
  // sınırın dışındaysa uygulanabilir denmez; değerlendirilemeyen kontrol
  // varsa karar "kısmen" olarak yazılır.
  const verdict = useMemo(() => {
    if (!r.ok) return null
    if (summary[STATUS_DANGER] > 0) return text.verdict.notFeasible
    if (summary[STATUS_UNKNOWN] > 0) return text.verdict.undecided
    return text.verdict.feasible
  }, [r, summary, text])

  const summaryText = useMemo(() => {
    if (!r.ok) return ''
    const inputs = formFields(text.fieldLabels)
      .filter((field) => f[field.key] !== '' && f[field.key] != null)
      .map((field) => ({
        label: field.label,
        value: f[field.key],
        unit: field.unitKey ? f[field.unitKey] : (field.unit === 'adet' ? text.countUnit : field.unit ?? null),
      }))

    const built = buildDfmSummary({
      labels: dfm.summary,
      tool: text.title,
      profile: fab.active?.name ?? null,
      inputs,
      results: [
        { label: text.table.gap, value: asMm(r.results.gap) },
        { label: text.table.maxWidthSingle, value: asMm(r.results.maxWidthSingle) },
        { label: text.table.nMax, value: String(r.results.nMax) },
        { label: text.table.channelMargin, value: asMm(r.results.channelMargin) },
        { label: text.table.maxWidthDiagonal, value: asMm(r.results.maxWidthDiagonal) },
        { label: text.table.maxViaPad, value: asMm(r.results.maxViaPad) },
        { label: text.table.landViaClearance, value: asMm(r.results.landViaClearance) },
        { label: text.table.viaViaClearance, value: asMm(r.results.viaViaClearance) },
        { label: text.table.maskWeb, value: asMm(r.results.maskWeb) },
      ],
      checks: rows,
      assumptions: [...(r.assumptions ?? []).map((a) => text.assumptionText(a)), verdict],
      method: dfm.method.geometric,
    })
    return built.error ? '' : built.text
  }, [r, f, text, dfm, fab.active, rows, verdict])

  const reportSection = useMemo(
    () => buildReportSection({ f, r, s, text, dfm, rows, verdict }),
    [f, r, s, text, dfm, rows, verdict],
  )

  const chartSeries = s
    ? [
      { key: 'h', name: text.chart.seriesHorizontal, tone: toneClass(0), points: s.points },
      { key: 'd', name: text.chart.seriesDiagonal, tone: toneClass(1), points: s.diagonalPoints },
    ]
    : []

  return (
    <>
      <Link className="backlink" to="/kategori/uretim-dfm">{text.backlink}</Link>

      <div className="tool-header">
        <h1>{text.title}</h1>
        <p>{text.intro}</p>
      </div>

      <div className="tool-grid">
        {/* ---------- Sol: Girdiler ---------- */}
        <section className="panel">
          <h2>{ui.inputs}</h2>

          <BgaSchematic ref={schematicRef} r={r} text={text.schematic} fmtLen={asMm} />

          <NumberField
            label={text.fields.pitch.label}
            value={f.pitch} onChange={set('pitch')}
            units={LEN_UNITS} unit={f.pitchU} onUnit={set('pitchU')}
          />
          <NumberField
            label={text.fields.landDiameter.label}
            value={f.landDiameter} onChange={set('landDiameter')}
            units={LEN_UNITS} unit={f.landDiameterU} onUnit={set('landDiameterU')}
          />
          <NumberField
            label={text.fields.traceWidth.label}
            value={f.traceWidth} onChange={set('traceWidth')}
            units={LEN_UNITS} unit={f.traceWidthU} onUnit={set('traceWidthU')}
          />
          <NumberField
            label={text.fields.traceClearance.label}
            value={f.traceClearance} onChange={set('traceClearance')}
            units={LEN_UNITS} unit={f.traceClearanceU} onUnit={set('traceClearanceU')}
          />
          <NumberField
            label={text.fields.traceCount.label}
            value={f.traceCount} onChange={set('traceCount')}
            units={[text.countUnit]} unit={text.countUnit} onUnit={() => {}}
            hint={text.fields.traceCount.hint}
          />

          <SelectField
            label={text.viaType.label}
            value={f.viaType} onChange={set('viaType')}
            options={[
              { value: VIA_THROUGH, label: text.viaType[VIA_THROUGH] },
              { value: VIA_BLIND, label: text.viaType[VIA_BLIND] },
              { value: VIA_MICROVIA, label: text.viaType[VIA_MICROVIA] },
              { value: VIA_IN_PAD, label: text.viaType[VIA_IN_PAD] },
            ]}
            hint={text.viaType.hint}
          />
          <NumberField
            label={text.fields.viaPadDiameter.label}
            value={f.viaPadDiameter} onChange={set('viaPadDiameter')}
            units={LEN_UNITS} unit={f.viaPadDiameterU} onUnit={set('viaPadDiameterU')}
          />
          <NumberField
            label={text.fields.viaDrillDiameter.label}
            value={f.viaDrillDiameter} onChange={set('viaDrillDiameter')}
            units={LEN_UNITS} unit={f.viaDrillDiameterU} onUnit={set('viaDrillDiameterU')}
          />
          <NumberField
            label={text.fields.landViaDistance.label}
            value={f.landViaDistance} onChange={set('landViaDistance')}
            units={LEN_UNITS} unit={f.landViaDistanceU} onUnit={set('landViaDistanceU')}
            hint={text.fields.landViaDistance.hint}
          />
          <NumberField
            label={text.fields.viaPitch.label}
            value={f.viaPitch} onChange={set('viaPitch')}
            units={LEN_UNITS} unit={f.viaPitchU} onUnit={set('viaPitchU')}
          />
          <NumberField
            label={text.fields.viaDepth.label}
            value={f.viaDepth} onChange={set('viaDepth')}
            units={LEN_UNITS} unit={f.viaDepthU} onUnit={set('viaDepthU')}
            hint={text.fields.viaDepth.hint}
          />

          <SelectField
            label={text.padDefinition.label}
            value={f.padDefinition} onChange={set('padDefinition')}
            options={[
              { value: PAD_NSMD, label: text.padDefinition[PAD_NSMD] },
              { value: PAD_SMD, label: text.padDefinition[PAD_SMD] },
            ]}
            hint={text.padDefinition.hint}
          />
          <NumberField
            label={text.fields.maskExpansion.label}
            value={f.maskExpansion} onChange={set('maskExpansion')}
            units={LEN_UNITS} unit={f.maskExpansionU} onUnit={set('maskExpansionU')}
            hint={text.fields.maskExpansion.hint}
          />

          <NumberField
            label={text.fields.rows.label}
            value={f.rows} onChange={set('rows')}
            units={[text.countUnit]} unit={text.countUnit} onUnit={() => {}}
          />
          <NumberField
            label={text.fields.cols.label}
            value={f.cols} onChange={set('cols')}
            units={[text.countUnit]} unit={text.countUnit} onUnit={() => {}}
          />

          <NumberField
            label={dfm.warnPercent.label}
            value={f.warnPercent} onChange={set('warnPercent')}
            units={['%']} unit="%" onUnit={() => {}}
            hint={dfm.warnPercent.hint}
          />

          <ProfilePanel
            profiles={fab.profiles}
            active={fab.active}
            activeId={fab.activeId}
            available={fab.available}
            onSelect={fab.selectActive}
            onImport={fab.importJson}
            onRemove={fab.remove}
            onExport={fab.exportJson}
          />
        </section>

        {/* ---------- Orta: Ana sonuç ---------- */}
        <section className="panel">
          <h2>{ui.result}</h2>

          {!r.ok ? (
            r.ambiguous ? (
              <p className="empty-note warn">{ui.thousandsNote(r.ambiguous)}</p>
            ) : (
              <p className="empty-note">{text.reasonText(r.reason, r.invalid)}</p>
            )
          ) : (
            <>
              <div className="big-result">
                <div className="label">{text.bigResult.label}</div>
                <div className="value">{r.results.nMax}</div>
                <div className="alt">
                  {text.bigResult.gap} {asMm(r.results.gap)}
                  &nbsp;·&nbsp;
                  {text.bigResult.maxWidth} {asMm(r.results.maxWidthSingle)}
                </div>
              </div>

              {status && <span className={`status ${status.cls}`}>{status.text}</span>}

              <p className="method-note">{verdict}</p>

              <table className="result-table">
                <tbody>
                  <tr><td>{text.table.gap}</td><td>{asMm(r.results.gap)}</td></tr>
                  <tr><td>{text.table.maxWidthSingle}</td><td>{asMm(r.results.maxWidthSingle)}</td></tr>
                  <tr><td>{text.table.nMax}</td><td>{r.results.nMax} {text.countUnit}</td></tr>
                  <tr><td>{text.table.requiredSpace}</td><td>{asMm(r.results.requiredSpace)}</td></tr>
                  <tr><td>{text.table.channelMargin}</td><td>{asMm(r.results.channelMargin)}</td></tr>
                  <tr><td>{text.table.diagPitch}</td><td>{asMm(r.results.diagPitch)}</td></tr>
                  <tr><td>{text.table.diagGap}</td><td>{asMm(r.results.diagGap)}</td></tr>
                  <tr><td>{text.table.maxWidthDiagonal}</td><td>{asMm(r.results.maxWidthDiagonal)}</td></tr>
                  <tr><td>{text.table.landViaDistance}</td><td>{asMm(r.results.landViaDistance)}</td></tr>
                  <tr><td>{text.table.maxViaPad}</td><td>{asMm(r.results.maxViaPad)}</td></tr>
                  <tr><td>{text.table.landViaClearance}</td><td>{asMm(r.results.landViaClearance)}</td></tr>
                  <tr><td>{text.table.neckLength}</td><td>{asMm(r.results.neckLength)}</td></tr>
                  <tr><td>{text.table.viaViaClearance}</td><td>{asMm(r.results.viaViaClearance)}</td></tr>
                  <tr><td>{text.table.maskOpening}</td><td>{asMm(r.results.maskOpening)}</td></tr>
                  <tr><td>{text.table.maskWeb}</td><td>{asMm(r.results.maskWeb)}</td></tr>
                  <tr>
                    <td>{text.table.viaAspect}</td>
                    <td>{r.results.viaAspect === null ? '—' : fmt(r.results.viaAspect, 3)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.viaType}</td>
                    <td>{text.viaType[r.results.viaType]}</td>
                  </tr>
                </tbody>
              </table>

              <h2 className="section">{dfm.checks.title}</h2>
              <DfmChecks rows={rows} />

              {!fab.hasProfile && <p className="empty-note warn">{dfm.noProfileNote}</p>}
              {fab.hasProfile && <p className="method-note">{dfm.fabOnlyNote}</p>}

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

          <pre className="formula">{text.formula.body}</pre>

          <ul className="detail-list">
            <li>{text.detail.channelRule}</li>
            <li>{text.detail.floorNote}</li>
            <li>{text.detail.neckNote}</li>
            <li>{text.detail.noRounding}</li>
            {r.ok && (r.assumptions ?? []).map((a) => (
              <li key={a}>{text.assumptionText(a)}</li>
            ))}
          </ul>

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

        <SelectField
          label={text.chart.sweepLabel}
          value={sweep}
          onChange={setSweep}
          options={[
            { value: SWEEP_PITCH, label: text.chart.pitch },
            { value: SWEEP_LAND, label: text.chart.land },
          ]}
        />

        {s ? (
          <>
            <ChartLegend
              items={[
                { label: text.chart.seriesHorizontal, tone: toneClass(0), kind: 'line' },
                { label: text.chart.seriesDiagonal, tone: toneClass(1), kind: 'line' },
              ]}
            />

            <LineChart
              ref={chartRef}
              xScale="linear"
              xLabel={sweep === SWEEP_LAND ? text.chart.xLand : text.chart.xPitch}
              yLabel={text.chart.yWidth}
              series={chartSeries}
              marker={s.marker}
              formatX={(v) => fmt(v * 1e3, 3)}
              formatY={(v) => fmt(v * 1e3, 3)}
              caption={text.chart.caption}
            />

            <ChartDataTable
              xLabel={sweep === SWEEP_LAND ? text.chart.xLand : text.chart.xPitch}
              series={chartSeries}
              every={4}
              formatX={(v) => `${fmt(v * 1e3, 3)} mm`}
              formatY={(v) => `${fmt(v * 1e3, 3)} mm`}
            />
          </>
        ) : (
          <p className="empty-note">{ui.chartNeedsInput}</p>
        )}
      </section>

      <section className="panel panel-chart">
        <DfmSummaryBox text={summaryText} />
      </section>

      <ReportDialog section={reportSection} schematicRef={schematicRef} chartRef={chartRef} />
      <SaveToProject
        toolKey="bga-breakout"
        f={f}
        r={r}
        section={reportSection}
        schematicRef={schematicRef}
        chartRef={chartRef}
      />
    </>
  )
}
