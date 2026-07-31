import { useMemo, useRef, useState } from 'react'
import LangLink from '../../../components/LangLink'
import NumberField from '../../../components/NumberField'
import SelectField from '../../../components/SelectField'
import Segmented from '../../../components/Segmented'
import RowList from '../../../components/RowList'
import ToolHeader from '../../../components/ToolHeader'
import ResultPanel from '../../../components/ResultPanel'
import Commentary from '../../../components/Commentary'
import LineChart, { ChartLegend, ChartDataTable, toneClass } from '../../../components/LineChart'
import ReportDialog from '../../../components/ReportDialog'
import SaveToProject from '../../../components/SaveToProject'
import ProfilePanel from '../../../components/ProfilePanel'
import DfmChecks from '../../../components/DfmChecks'
import DfmSummaryBox from '../../../components/DfmSummaryBox'
import useToolForm from '../../../hooks/useToolForm'
import { statusChip } from '../../../lib/statusChip'
import useSavedCalculation from '../../../hooks/useSavedCalculation'
import useDfmProfiles from '../../../hooks/useDfmProfiles'
import { useLang } from '../../../hooks/useLang'
import { commonText } from '../../../data/uiText'
import { dfmText } from '../../../data/dfmText'
import { fmt, fmtEng } from '../../../lib/num'
import {
  summarizeChecks,
} from '../../../lib/dfmCheck'
import { buildDfmSummary } from '../../../lib/dfmSummary'
import {
  CHECK_SPOKE_WIDTH, CHECK_THERMAL_GAP, CHECK_VOLTAGE_DROP, CHECK_POWER_LOSS,
  CHECK_CURRENT_DENSITY, CHECK_THERMAL_RESISTANCE, CHECK_SPOKE_OVERLAP,
} from '../../../lib/thermalRelief'
import ThermalReliefSchematic from './schematic'
import {
  INITIAL_FORM, LEN_UNITS, CURRENT_UNITS, K_OPTIONS,
  SPOKE_UNIFORM, SPOKE_TAPER, SPOKE_CUSTOM,
  SWEEP_WIDTH, SWEEP_COUNT, SWEEP_LENGTH, SWEEP_THICKNESS,
  METRIC_RESISTANCE, METRIC_VOLTAGE, METRIC_THERMAL, METRIC_DENSITY,
  compute, buildSweep, formFields,
} from './model'
import { getText } from './text'
import { buildReportSection } from './report'

// Uzunluklar SI (m) tutulur, ekranda mm yazılır. Yuvarlama yalnızca burada.
const asMm = (v) => (v === null || v === undefined || !Number.isFinite(v) ? '—' : `${fmt(v * 1e3, 4)} mm`)
const asOhm = (v) => (v === null || !Number.isFinite(v) ? '—' : fmtEng(v, 'Ω', 4))
const asVolt = (v) => (v === null || !Number.isFinite(v) ? '—' : fmtEng(v, 'V', 4))
const asWatt = (v) => (v === null || !Number.isFinite(v) ? '—' : fmtEng(v, 'W', 4))
const asKW = (v) => (v === null || !Number.isFinite(v) ? '—' : `${fmt(v, 4)} K/W`)
// Akım yoğunluğu A/mm² okunur: A/m² değerleri mühendislik kullanımında
// okunamayacak kadar büyük çıkar.
const asDensity = (v) => (v === null || !Number.isFinite(v) ? '—' : `${fmt(v / 1e6, 4)} A/mm²`)

// Her kontrolün kendi birimi var; bileşen birim bilmez, ekran biçimler.
const CHECK_FORMAT = {
  [CHECK_SPOKE_WIDTH]: asMm,
  [CHECK_THERMAL_GAP]: asMm,
  [CHECK_VOLTAGE_DROP]: asVolt,
  [CHECK_POWER_LOSS]: asWatt,
  [CHECK_CURRENT_DENSITY]: asDensity,
  [CHECK_THERMAL_RESISTANCE]: asKW,
  [CHECK_SPOKE_OVERLAP]: asMm,
}

const METRIC_FORMAT = {
  [METRIC_RESISTANCE]: (v) => v * 1e3,
  [METRIC_VOLTAGE]: (v) => v * 1e3,
  [METRIC_THERMAL]: (v) => v,
  [METRIC_DENSITY]: (v) => v / 1e6,
}

export default function ThermalRelief() {
  const [sweep, setSweep] = useState(SWEEP_WIDTH)
  const [metric, setMetric] = useState(METRIC_RESISTANCE)
  const { f, set, patch } = useToolForm(INITIAL_FORM)

  // Kaydedilmiş hesabı geri yükler (?hesap=<id>) ve ekranı o kayda bağlar;
  // SaveToProject bağlı kayda yeni satır açmak yerine üzerine yazar.
  const saved = useSavedCalculation({
    toolKey: 'thermal-relief', initialForm: INITIAL_FORM, patch,
  })
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
  const notes = useMemo(() => text.commentary(r), [r, text])

  const schematicRef = useRef(null)
  const chartRef = useRef(null)

  const checks = r.ok ? r.checks : []
  const summary = useMemo(() => summarizeChecks(checks), [checks])

  const rows = useMemo(() => checks.map((c) => {
    const format = CHECK_FORMAT[c.id] ?? ((v) => (v === null ? '—' : fmt(v, 4)))
    return {
      id: c.id,
      label: text.checkLabel(c.id),
      status: c.status,
      actual: format(c.actual),
      required: format(c.required),
      margin: c.margin === null ? '—' : format(c.margin),
      source: dfm.sourceLabel(c.source),
      reason: dfm.unknownReason(c.variant),
    }
  }), [checks, text, dfm])

  const status = useMemo(() => {
    if (!r.ok || checks.length === 0) return null
    const worst = summary.worst
    return statusChip(worst, summary[worst], ui)
  }, [r, checks, summary, ui])

  const summaryText = useMemo(() => {
    if (!r.ok) return ''
    const inputs = formFields(f.spokeMode, text.fieldLabels)
      .filter((field) => f[field.key] !== '' && f[field.key] != null)
      .map((field) => ({
        label: field.label,
        value: f[field.key],
        unit: field.unitKey
          ? f[field.unitKey]
          : (field.unit === 'adet' ? text.countUnit : field.unit ?? null),
      }))

    const built = buildDfmSummary({
      labels: dfm.summary,
      tool: text.title,
      profile: fab.active?.name ?? null,
      inputs,
      results: [
        { label: text.table.singleResistance, value: asOhm(r.results.singleResistance) },
        { label: text.table.parallelResistance, value: asOhm(r.results.parallelResistance) },
        { label: text.table.voltageDrop, value: asVolt(r.results.voltageDrop) },
        { label: text.table.powerTotal, value: asWatt(r.results.powerTotal) },
        { label: text.table.maxDensity, value: asDensity(r.results.maxLocalCurrentDensity) },
        { label: text.table.thermalResistance, value: asKW(r.results.thermalResistance) },
        {
          label: text.table.thermalConductance,
          value: fmt(r.results.thermalConductance, 4),
          unit: 'W/K',
        },
        { label: text.table.thermalGap, value: asMm(r.results.thermalGap) },
        { label: text.table.clearanceDiameter, value: asMm(r.results.clearanceDiameter) },
        {
          label: text.table.bridgeFraction,
          value: r.results.bridgeFraction === null
            ? '—'
            : fmt(r.results.bridgeFraction * 100, 3),
          unit: r.results.bridgeFraction === null ? null : '%',
        },
      ],
      checks: rows,
      assumptions: (r.assumptions ?? []).map((a) => text.assumptionText(a)),
      method: dfm.method.oneDimensionalThermal,
    })
    return built.error ? '' : built.text
  }, [r, f, text, dfm, fab.active, rows])

  const reportSection = useMemo(
    () => buildReportSection({ f, r, s, metric, text, dfm, rows }),
    [f, r, s, metric, text, dfm, rows],
  )

  const chartSeries = s
    ? [{
      key: metric,
      name: text.chart.metrics[metric],
      tone: toneClass(0),
      points: s.seriesFor(metric).map(([x, y]) => [x, METRIC_FORMAT[metric](y)]),
    }]
    : []

  // X ekseni birimi süpürülen değişkene bağlıdır.
  const formatX = (v) => {
    // Spoke sayısı tam sayıdır; `fmt` sıfır anlamlı basamak kabul etmez.
    if (sweep === SWEEP_COUNT) return String(Math.round(v))
    if (sweep === SWEEP_THICKNESS) return fmt(v * 1e6, 3)
    return fmt(v * 1e3, 3)
  }

  return (
    <>
      <LangLink className="backlink" to="/kategori/uretim-dfm">{text.backlink}</LangLink>

      <ToolHeader title={text.title} intro={text.intro} />

      <div className="tool-grid">
        {/* ---------- Sol: Girdiler ---------- */}
        <section className="panel">
          <h2>{ui.inputs}</h2>

          <ThermalReliefSchematic ref={schematicRef} r={r} text={text.schematic} fmtLen={asMm} />

          <Segmented
            label={text.spokeMode.label}
            value={f.spokeMode}
            onChange={set('spokeMode')}
            options={[
              { value: SPOKE_UNIFORM, label: text.spokeMode[SPOKE_UNIFORM] },
              { value: SPOKE_TAPER, label: text.spokeMode[SPOKE_TAPER] },
              { value: SPOKE_CUSTOM, label: text.spokeMode[SPOKE_CUSTOM] },
            ]}
          />

          <NumberField
            label={text.fields.current.label}
            value={f.current} onChange={set('current')}
            units={CURRENT_UNITS} unit={f.currentU} onUnit={set('currentU')}
          />
          <NumberField
            label={text.fields.temperature.label}
            value={f.temperature} onChange={set('temperature')}
            units={['°C']} unit="°C" onUnit={() => {}}
            hint={text.fields.temperature.hint}
          />
          <NumberField
            label={text.fields.copperThickness.label}
            value={f.copperThickness} onChange={set('copperThickness')}
            units={LEN_UNITS} unit={f.copperThicknessU} onUnit={set('copperThicknessU')}
          />

          {f.spokeMode !== SPOKE_CUSTOM && (
            <>
              <NumberField
                label={text.fields.spokeCount.label}
                value={f.spokeCount} onChange={set('spokeCount')}
                units={[text.countUnit]} unit={text.countUnit} onUnit={() => {}}
                hint={text.fields.spokeCount.hint}
              />
              <NumberField
                label={text.fields.innerWidth.label}
                value={f.innerWidth} onChange={set('innerWidth')}
                units={LEN_UNITS} unit={f.innerWidthU} onUnit={set('innerWidthU')}
              />
            </>
          )}

          {f.spokeMode === SPOKE_TAPER && (
            <NumberField
              label={text.fields.outerWidth.label}
              value={f.outerWidth} onChange={set('outerWidth')}
              units={LEN_UNITS} unit={f.outerWidthU} onUnit={set('outerWidthU')}
            />
          )}

          {f.spokeMode === SPOKE_CUSTOM && (
            <RowList
              label={text.customList.label}
              rows={f.customSpokes}
              onChange={set('customSpokes')}
              min={1}
              max={16}
              addLabel={text.customList.add}
              rowLabel={text.customList.rowLabel}
              hint={text.customList.hint}
              columns={[
                { key: 'innerWidth', label: text.customList.columns.innerWidth },
                { key: 'outerWidth', label: text.customList.columns.outerWidth },
                { key: 'length', label: text.customList.columns.length },
                { key: 'thickness', label: text.customList.columns.thickness },
              ]}
            />
          )}

          <NumberField
            label={text.fields.spokeLength.label}
            value={f.spokeLength} onChange={set('spokeLength')}
            units={LEN_UNITS} unit={f.spokeLengthU} onUnit={set('spokeLengthU')}
            hint={text.fields.spokeLength.hint}
          />
          <NumberField
            label={text.fields.padDiameter.label}
            value={f.padDiameter} onChange={set('padDiameter')}
            units={LEN_UNITS} unit={f.padDiameterU} onUnit={set('padDiameterU')}
          />
          <NumberField
            label={text.fields.thermalGap.label}
            value={f.thermalGap} onChange={set('thermalGap')}
            units={LEN_UNITS} unit={f.thermalGapU} onUnit={set('thermalGapU')}
          />
          <NumberField
            label={text.fields.clearanceDiameter.label}
            value={f.clearanceDiameter} onChange={set('clearanceDiameter')}
            units={LEN_UNITS} unit={f.clearanceDiameterU} onUnit={set('clearanceDiameterU')}
            hint={text.fields.clearanceDiameter.hint}
          />

          <NumberField
            label={text.fields.deltaT.label}
            value={f.deltaT} onChange={set('deltaT')}
            units={['°C']} unit="°C" onUnit={() => {}}
            hint={text.fields.deltaT.hint}
          />
          <SelectField
            label={text.fields.k.label}
            value={f.k}
            onChange={set('k')}
            options={K_OPTIONS.map((value) => ({
              value: String(value),
              label: `${value} W/(m·K)`,
            }))}
            hint={text.fields.k.hint}
          />

          <NumberField
            label={text.fields.maxVoltageDrop.label}
            value={f.maxVoltageDrop} onChange={set('maxVoltageDrop')}
            units={['V', 'mV', 'µV']} unit={f.maxVoltageDropU} onUnit={set('maxVoltageDropU')}
          />
          <NumberField
            label={text.fields.maxPowerLoss.label}
            value={f.maxPowerLoss} onChange={set('maxPowerLoss')}
            units={['W', 'mW', 'µW']} unit={f.maxPowerLossU} onUnit={set('maxPowerLossU')}
          />
          <NumberField
            label={text.fields.maxCurrentDensity.label}
            value={f.maxCurrentDensity} onChange={set('maxCurrentDensity')}
            units={['A/mm²', 'A/m²']} unit={f.maxCurrentDensityU} onUnit={set('maxCurrentDensityU')}
          />
          <NumberField
            label={text.fields.maxThermalResistance.label}
            value={f.maxThermalResistance} onChange={set('maxThermalResistance')}
            units={['K/W', '°C/W']} unit={f.maxThermalResistanceU} onUnit={set('maxThermalResistanceU')}
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
        {/* İç `r.ok &&` kapısı gerekli: children JSX'i ResultPanel çizmese de
            burada kurulur — bkz. TraceWidth'teki aynı not. */}
        <ResultPanel r={r} reason={(code) => text.reasonText(code, r.invalid, r.code, r.index)}>
          {r.ok && (
            <>
              <div className="big-result">
                <div className="label">{text.bigResult.label}</div>
                <div className="value">{asOhm(r.results.parallelResistance)}</div>
                <div className="alt">
                  {text.bigResult.drop} {asVolt(r.results.voltageDrop)}
                  &nbsp;·&nbsp;
                  {text.bigResult.thermal} {asKW(r.results.thermalResistance)}
                </div>
              </div>

              {status && <span className={`status ${status.cls}`}>{status.text}</span>}

              <table className="result-table">
                <tbody>
                  <tr><td>{text.table.singleResistance}</td><td>{asOhm(r.results.singleResistance)}</td></tr>
                  <tr><td>{text.table.parallelResistance}</td><td>{asOhm(r.results.parallelResistance)}</td></tr>
                  <tr>
                    <td>{text.table.maxSpokeCurrent}</td>
                    <td>{fmtEng(r.results.maxSpokeCurrent, 'A', 4)}</td>
                  </tr>
                  <tr><td>{text.table.voltageDrop}</td><td>{asVolt(r.results.voltageDrop)}</td></tr>
                  <tr><td>{text.table.powerTotal}</td><td>{asWatt(r.results.powerTotal)}</td></tr>
                  <tr><td>{text.table.powerCheck}</td><td>{asWatt(r.results.powerFromEquivalent)}</td></tr>
                  <tr>
                    <td>{text.table.totalArea}</td>
                    <td>{fmt(r.results.totalArea * 1e6, 4)} mm²</td>
                  </tr>
                  <tr><td>{text.table.averageDensity}</td><td>{asDensity(r.results.averageCurrentDensity)}</td></tr>
                  <tr><td>{text.table.maxDensity}</td><td>{asDensity(r.results.maxLocalCurrentDensity)}</td></tr>
                  <tr><td>{text.table.singleThermal}</td><td>{asKW(r.results.singleThermalResistance)}</td></tr>
                  <tr><td>{text.table.thermalResistance}</td><td>{asKW(r.results.thermalResistance)}</td></tr>
                  <tr>
                    <td>{text.table.thermalConductance}</td>
                    <td>{fmt(r.results.thermalConductance, 5)} W/K</td>
                  </tr>
                  <tr>
                    <td>{text.table.heatFlow}</td>
                    <td>{r.results.heatFlow === null ? text.table.notEntered : asWatt(r.results.heatFlow)}</td>
                  </tr>
                  <tr><td>{text.table.thermalGap}</td><td>{asMm(r.results.thermalGap)}</td></tr>
                  <tr><td>{text.table.clearanceDiameter}</td><td>{asMm(r.results.clearanceDiameter)}</td></tr>
                  <tr><td>{text.table.spokeLength}</td><td>{asMm(r.results.spokeLength)}</td></tr>
                  <tr><td>{text.table.overlapLimit}</td><td>{asMm(r.results.overlapLimit)}</td></tr>
                  <tr>
                    <td>{text.table.bridgeFraction}</td>
                    <td>
                      {r.results.bridgeFraction === null
                        ? text.table.notEntered
                        : ui.pct(fmt(r.results.bridgeFraction * 100, 3))}
                    </td>
                  </tr>
                  <tr>
                    <td>{text.table.rho}</td>
                    <td>{fmtEng(r.results.rho, 'Ω·m', 4)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.k}</td>
                    <td>{fmt(r.results.k, 3)} W/(m·K)</td>
                  </tr>
                </tbody>
              </table>

              <h2 className="section">{text.spokeTable.title}</h2>
              <table className="result-table">
                <tbody>
                  {r.spokes.map((sp, i) => (
                    <tr key={i}>
                      <td>
                        {text.spokeTable.index} {i + 1}
                        <span className="sub-line">
                          {text.spokeTable.width} {asMm(sp.minWidth)}
                        </span>
                      </td>
                      <td>
                        {fmtEng(sp.current, 'A', 4)}
                        <span className="sub-line">
                          {text.spokeTable.power} {asWatt(sp.power)}
                          {' · '}
                          {text.spokeTable.density} {asDensity(sp.currentDensity)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <h2 className="section">{dfm.checks.title}</h2>
              <DfmChecks rows={rows} />

              {!fab.hasProfile && <p className="empty-note warn">{dfm.noProfileNote}</p>}
              {fab.hasProfile && <p className="method-note">{dfm.fabOnlyNote}</p>}

              <Commentary items={notes} />
            </>
          )}
        </ResultPanel>

        {/* ---------- Sağ: Teknik detay ---------- */}
        <section className="panel panel-detail">
          <h2>{ui.technicalDetail}</h2>

          <ul className="detail-list">
            <li>{text.detail.constantsFromUnits}</li>
            <li>{text.detail.taperLimit}</li>
            <li>{text.detail.widestIsWorst}</li>
            <li>{text.detail.notTotalArea}</li>
            <li>{text.detail.crossCheck}</li>
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

      {/* ---------- Alt: Denklemler ---------- */}
      {/* Dar sağ sütunda uzun formüller kırpılıyordu; tam genişlikte
          hiçbiri taşmıyor. Desen ViaProperties ile aynı. */}
      <section className="formula-wide">
        <h2>{ui.equations}</h2>
        <pre className="formula">{text.formula.body}</pre>
      </section>

      {/* ---------- Alt: Parametrik grafik ---------- */}
      <section className="panel panel-chart">
        <div className="chart-head">
          <h2>{ui.chart}</h2>
        </div>

        <SelectField
          label={text.chart.sweepLabel}
          value={sweep}
          onChange={setSweep}
          options={[SWEEP_WIDTH, SWEEP_COUNT, SWEEP_LENGTH, SWEEP_THICKNESS].map((v) => ({
            value: v, label: text.chart.sweeps[v],
          }))}
        />
        <SelectField
          label={text.chart.metricLabel}
          value={metric}
          onChange={setMetric}
          options={[METRIC_RESISTANCE, METRIC_VOLTAGE, METRIC_THERMAL, METRIC_DENSITY].map((v) => ({
            value: v, label: text.chart.metrics[v],
          }))}
          hint={text.chart.metricHint}
        />

        {s ? (
          <>
            <ChartLegend
              items={[{ label: text.chart.metrics[metric], tone: toneClass(0), kind: 'line' }]}
            />

            <LineChart
              ref={chartRef}
              xScale="linear"
              xLabel={text.chart.axis[sweep]}
              yLabel={text.chart.yAxis[metric]}
              series={chartSeries}
              formatX={formatX}
              formatY={(v) => fmt(v, 4)}
              caption={text.chart.caption}
            />

            <ChartDataTable
              xLabel={text.chart.axis[sweep]}
              series={chartSeries}
              every={4}
              formatX={formatX}
              formatY={(v) => fmt(v, 4)}
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
        toolKey="thermal-relief"
        toolMode={f.spokeMode}
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
