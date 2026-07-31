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
import ProfilePanel, { PROFILE_KIND_DECISION } from '../../../components/ProfilePanel'
import DfmChecks from '../../../components/DfmChecks'
import DfmSummaryBox from '../../../components/DfmSummaryBox'
import useToolForm from '../../../hooks/useToolForm'
import { statusChip } from '../../../lib/statusChip'
import useSavedCalculation from '../../../hooks/useSavedCalculation'
import useDfmProfiles from '../../../hooks/useDfmProfiles'
import useClearanceProfiles from '../../../hooks/useClearanceProfiles'
import { useLang } from '../../../hooks/useLang'
import { commonText } from '../../../data/uiText'
import { dfmText } from '../../../data/dfmText'
import { fmt } from '../../../lib/num'
import { summarizeChecks } from '../../../lib/dfmCheck'
import { buildDfmSummary } from '../../../lib/dfmSummary'
import { profileKeyOptions } from '../../../lib/clearanceProfile'
import ClearanceCreepagePadstackSchematic from './schematic'
import {
  INITIAL_FORM, TAB_CLEARANCE, TAB_CREEPAGE, TAB_PADSTACK,
  MODE_ANALYSIS, MODE_SYNTHESIS,
  SWEEP_ALTITUDE, SWEEP_VOLTAGE, SWEEP_REGISTRATION, SWEEP_DRILL_TOL,
  LEN_UNITS, VOLT_UNITS, HOLE_PTH, HOLE_NPTH,
  ASPECT_BASIS_DRILL, ASPECT_BASIS_FINISHED,
  compute, buildSweep, formFields,
} from './model'
import { getText } from './text'
import { buildReportSection } from './report'

// Uzunluklar SI (m) tutulur, ekranda mm yazılır. Yuvarlama yalnızca burada.
const asMm = (v) => (v === null || v === undefined || !Number.isFinite(v) ? '—' : `${fmt(v * 1e3, 4)} mm`)

export default function ClearanceCreepagePadstack() {
  const [tab, setTab] = useState(TAB_CLEARANCE)
  const [mode, setMode] = useState(MODE_SYNTHESIS)
  const [sweep, setSweep] = useState(SWEEP_ALTITUDE)
  const { f, set, patch } = useToolForm(INITIAL_FORM)

  // Kaydedilmiş hesabı geri yükler (?hesap=<id>) ve ekranı o kayda bağlar;
  // SaveToProject bağlı kayda yeni satır açmak yerine üzerine yazar.
  const saved = useSavedCalculation({
    toolKey: 'clearance-creepage-padstack', initialForm: INITIAL_FORM, patch, setMode: setTab,
  })
  const { lang } = useLang()

  const text = useMemo(() => getText(lang), [lang])
  const ui = useMemo(() => commonText(lang), [lang])
  const dfm = useMemo(() => dfmText(lang), [lang])

  const fab = useDfmProfiles()
  const decision = useClearanceProfiles()

  const ctx = useMemo(() => ({
    clearanceProfile: decision.active,
    limits: fab.limits,
    hasProfile: fab.hasProfile,
  }), [decision.active, fab.limits, fab.hasProfile])

  const r = useMemo(() => compute(tab, mode, f, ctx, text.fieldLabels), [tab, mode, f, ctx, text])
  const s = useMemo(() => buildSweep(r, sweep), [r, sweep])
  const notes = useMemo(() => text.commentary(r, asMm), [r, text])

  const schematicRef = useRef(null)
  const chartRef = useRef(null)

  // Karar profilindeki anahtarlar seçici seçeneklerine dönüşür; uygulamada
  // gömülü bir sınıflandırma listesi yoktur.
  const keyOptions = (listKey, field) => [
    { value: '', label: text.noneOption },
    ...profileKeyOptions(decision.active, listKey, field).map((k) => ({ value: k, label: k })),
  ]

  const checks = useMemo(() => {
    if (!r.ok) return []
    return r.tab === TAB_PADSTACK ? r.checks : [r.check]
  }, [r])

  const checkRows = useMemo(() => checks.map((c) => ({
    id: c.id,
    label: text.checkLabel(c.id),
    status: c.status,
    actual: asMm(c.actual),
    required: asMm(c.required),
    margin: c.margin === null ? '—' : asMm(c.margin),
    source: dfm.sourceLabel(c.source),
    reason: dfm.unknownReason(c.variant),
  })), [checks, text, dfm])

  // Aspect ratio boyutsuzdur; mm biçimlendirmesi ona uygulanmaz.
  const displayRows = useMemo(() => checkRows.map((row) => (
    row.id === 'aspectRatio'
      ? (() => {
        const c = checks.find((x) => x.id === row.id)
        return {
          ...row,
          actual: c.actual === null ? '—' : fmt(c.actual, 3),
          required: c.required === null ? '—' : fmt(c.required, 3),
          margin: c.margin === null ? '—' : fmt(c.margin, 3),
        }
      })()
      : row
  )), [checkRows, checks])

  const summary = useMemo(() => summarizeChecks(checks), [checks])

  const status = useMemo(() => {
    if (!r.ok || checks.length === 0) return null
    const worst = summary.worst
    return statusChip(worst, summary[worst], ui)
  }, [r, checks, summary, ui])

  const summaryText = useMemo(() => {
    if (!r.ok) return ''
    const inputs = formFields(tab, mode, text.fieldLabels)
      .filter((field) => f[field.key] !== '' && f[field.key] != null)
      .map((field) => ({
        label: field.label,
        value: f[field.key],
        unit: field.unitKey ? f[field.unitKey] : (field.unit ?? null),
      }))

    const results = r.tab === TAB_PADSTACK
      ? [
        { label: text.table.Ddrill, value: asMm(r.results.Ddrill) },
        { label: text.table.Dpad, value: asMm(r.results.Dpad) },
        { label: text.table.ringNominal, value: asMm(r.results.ringNominal) },
        { label: text.table.ringWorst, value: asMm(r.results.ringWorst) },
        { label: text.table.Dantipad, value: asMm(r.results.Dantipad) },
        { label: text.table.Dmask, value: asMm(r.results.Dmask) },
      ]
      : [
        { label: text.table.base, value: asMm(r.baseDistance) },
        { label: text.table.corrected, value: asMm(r.correctedDistance) },
        { label: text.table.required, value: asMm(r.required) },
        { label: text.table.actual, value: asMm(r.actual) },
        { label: text.table.margin, value: asMm(r.margin) },
      ]

    const assumptions = (r.assumptions ?? []).map((a) => text.assumptionText(a))
    const method = r.tab === TAB_PADSTACK ? dfm.method.geometric : text.methodText(r.method)

    const built = buildDfmSummary({
      labels: dfm.summary,
      tool: `${text.title} — ${text.tabs[r.tab]}`,
      profile: fab.active?.name ?? null,
      decisionProfile: r.tab === TAB_PADSTACK ? null : (decision.active?.name ?? ''),
      inputs,
      results,
      checks: displayRows,
      assumptions,
      method,
    })
    return built.error ? '' : built.text
  }, [r, tab, mode, f, text, dfm, fab.active, decision.active, displayRows])

  const reportSection = useMemo(
    () => buildReportSection({ tab, mode, f, r, s, text, dfm, rows: displayRows }),
    [tab, mode, f, r, s, text, dfm, displayRows],
  )

  const isDistance = tab !== TAB_PADSTACK
  const chartX = sweep === SWEEP_ALTITUDE ? text.chart.xAltitude
    : sweep === SWEEP_VOLTAGE ? text.chart.xVoltage : text.chart.xTolerance
  const chartY = isDistance ? text.chart.yDistance : text.chart.yRing
  const chartSeries = s
    ? [{
      key: 'main',
      name: isDistance ? text.chart.seriesDistance : text.chart.seriesRing,
      tone: toneClass(0),
      points: s.points,
    }]
    : []

  const sweepOptions = isDistance
    ? [
      ...(tab === TAB_CLEARANCE ? [{ value: SWEEP_ALTITUDE, label: text.chart.altitude }] : []),
      { value: SWEEP_VOLTAGE, label: text.chart.voltage },
    ]
    : [
      { value: SWEEP_REGISTRATION, label: text.chart.registration },
      { value: SWEEP_DRILL_TOL, label: text.chart.drillTol },
    ]

  function switchTab(next) {
    setTab(next)
    // Süpürme değişkeni sekmeye özgüdür; geçişte geçersiz kalmasın.
    setSweep(next === TAB_PADSTACK ? SWEEP_REGISTRATION
      : next === TAB_CREEPAGE ? SWEEP_VOLTAGE : SWEEP_ALTITUDE)
  }

  return (
    <>
      <LangLink className="backlink" to="/kategori/uretim-dfm">{text.backlink}</LangLink>

      <ToolHeader title={text.title} intro={text.intro} />

      <div className="tool-grid">
        {/* ---------- Sol: Girdiler ---------- */}
        <section className="panel">
          <h2>{ui.inputs}</h2>

          <ClearanceCreepagePadstackSchematic
            ref={schematicRef}
            r={r}
            tab={tab}
            text={text.schematic}
            fmtLen={asMm}
          />

          <Segmented
            label={text.tabsGroup}
            value={tab}
            onChange={switchTab}
            options={[
              { value: TAB_CLEARANCE, label: text.tabs.clearance },
              { value: TAB_CREEPAGE, label: text.tabs.creepage },
              { value: TAB_PADSTACK, label: text.tabs.padstack },
            ]}
          />

          {tab === TAB_CLEARANCE && (
            <>
              <NumberField
                label={text.fields.workingVoltage.label}
                value={f.workingVoltage} onChange={set('workingVoltage')}
                units={VOLT_UNITS} unit={f.workingVoltageU} onUnit={set('workingVoltageU')}
              />
              <NumberField
                label={text.fields.peakVoltage.label}
                value={f.peakVoltage} onChange={set('peakVoltage')}
                units={VOLT_UNITS} unit={f.peakVoltageU} onUnit={set('peakVoltageU')}
              />
              <NumberField
                label={text.fields.impulseVoltage.label}
                value={f.impulseVoltage} onChange={set('impulseVoltage')}
                units={VOLT_UNITS} unit={f.impulseVoltageU} onUnit={set('impulseVoltageU')}
              />
              <NumberField
                label={text.fields.altitude.label}
                value={f.altitude} onChange={set('altitude')}
                units={['m']} unit="m" onUnit={() => {}}
                hint={text.fields.altitude.hint}
              />
              <SelectField
                label={text.fields.pollutionDegree.label}
                value={f.pollutionDegree} onChange={set('pollutionDegree')}
                options={keyOptions('clearanceRules', 'pollutionDegree')}
                hint={text.fields.pollutionDegree.hint}
              />
              <SelectField
                label={text.fields.insulationType.label}
                value={f.insulationType} onChange={set('insulationType')}
                options={keyOptions('clearanceRules', 'insulationType')}
              />
              <SelectField
                label={text.fields.coating.label}
                value={f.coating} onChange={set('coating')}
                options={keyOptions('clearanceRules', 'coating')}
              />
              <NumberField
                label={text.fields.clearFab.label}
                value={f.clearFab} onChange={set('clearFab')}
                units={LEN_UNITS} unit={f.clearFabU} onUnit={set('clearFabU')}
              />
              <NumberField
                label={text.fields.clearUser.label}
                value={f.clearUser} onChange={set('clearUser')}
                units={LEN_UNITS} unit={f.clearUserU} onUnit={set('clearUserU')}
              />
              <NumberField
                label={text.fields.clearActual.label}
                value={f.clearActual} onChange={set('clearActual')}
                units={LEN_UNITS} unit={f.clearActualU} onUnit={set('clearActualU')}
              />
            </>
          )}

          {tab === TAB_CREEPAGE && (
            <>
              <NumberField
                label={text.fields.creepVoltage.label}
                value={f.creepVoltage} onChange={set('creepVoltage')}
                units={VOLT_UNITS} unit={f.creepVoltageU} onUnit={set('creepVoltageU')}
              />
              <SelectField
                label={text.fields.pollutionDegree.label}
                value={f.creepPollution} onChange={set('creepPollution')}
                options={keyOptions('creepageRules', 'pollutionDegree')}
              />
              <SelectField
                label={text.fields.materialGroup.label}
                value={f.materialGroup} onChange={set('materialGroup')}
                options={keyOptions('creepageRules', 'materialGroup')}
                hint={text.fields.materialGroup.hint}
              />
              <NumberField
                label={text.fields.cti.label}
                value={f.cti} onChange={set('cti')}
                units={['V']} unit="V" onUnit={() => {}}
              />
              <SelectField
                label={text.fields.insulationType.label}
                value={f.creepInsulation} onChange={set('creepInsulation')}
                options={keyOptions('creepageRules', 'insulationType')}
              />
              <SelectField
                label={text.fields.coating.label}
                value={f.creepCoating} onChange={set('creepCoating')}
                options={keyOptions('creepageRules', 'coating')}
              />
              <NumberField
                label={text.fields.creepFab.label}
                value={f.creepFab} onChange={set('creepFab')}
                units={LEN_UNITS} unit={f.creepFabU} onUnit={set('creepFabU')}
              />
              <NumberField
                label={text.fields.creepUser.label}
                value={f.creepUser} onChange={set('creepUser')}
                units={LEN_UNITS} unit={f.creepUserU} onUnit={set('creepUserU')}
              />
              <NumberField
                label={text.fields.creepActual.label}
                value={f.creepActual} onChange={set('creepActual')}
                units={LEN_UNITS} unit={f.creepActualU} onUnit={set('creepActualU')}
              />
            </>
          )}

          {tab === TAB_PADSTACK && (
            <>
              <Segmented
                label={text.modeGroup}
                value={mode}
                onChange={setMode}
                options={[
                  { value: MODE_SYNTHESIS, label: text.modeSynthesis },
                  { value: MODE_ANALYSIS, label: text.modeAnalysis },
                ]}
              />
              <SelectField
                label={text.holeType.label}
                value={f.holeType} onChange={set('holeType')}
                options={[
                  { value: HOLE_PTH, label: text.holeType.pth },
                  { value: HOLE_NPTH, label: text.holeType.npth },
                ]}
              />

              {mode === MODE_SYNTHESIS ? (
                <>
                  <NumberField
                    label={text.fields.Dfinished.label}
                    value={f.Dfinished} onChange={set('Dfinished')}
                    units={LEN_UNITS} unit={f.DfinishedU} onUnit={set('DfinishedU')}
                  />
                  <NumberField
                    label={text.fields.Aprocess.label}
                    value={f.Aprocess} onChange={set('Aprocess')}
                    units={LEN_UNITS} unit={f.AprocessU} onUnit={set('AprocessU')}
                    hint={text.fields.Aprocess.hint}
                  />
                  <NumberField
                    label={text.fields.targetRing.label}
                    value={f.targetRing} onChange={set('targetRing')}
                    units={LEN_UNITS} unit={f.targetRingU} onUnit={set('targetRingU')}
                  />
                </>
              ) : (
                <>
                  <NumberField
                    label={text.fields.Ddrill.label}
                    value={f.Ddrill} onChange={set('Ddrill')}
                    units={LEN_UNITS} unit={f.DdrillU} onUnit={set('DdrillU')}
                  />
                  <NumberField
                    label={text.fields.Dpad.label}
                    value={f.Dpad} onChange={set('Dpad')}
                    units={LEN_UNITS} unit={f.DpadU} onUnit={set('DpadU')}
                  />
                  <NumberField
                    label={text.fields.Dfinished.label}
                    value={f.Dfinished} onChange={set('Dfinished')}
                    units={LEN_UNITS} unit={f.DfinishedU} onUnit={set('DfinishedU')}
                  />
                </>
              )}

              <NumberField
                label={text.fields.tPlating.label}
                value={f.tPlating} onChange={set('tPlating')}
                units={LEN_UNITS} unit={f.tPlatingU} onUnit={set('tPlatingU')}
              />
              <NumberField
                label={text.fields.drillTolPlus.label}
                value={f.drillTolPlus} onChange={set('drillTolPlus')}
                units={LEN_UNITS} unit={f.drillTolPlusU} onUnit={set('drillTolPlusU')}
              />
              <NumberField
                label={text.fields.drillTolMinus.label}
                value={f.drillTolMinus} onChange={set('drillTolMinus')}
                units={LEN_UNITS} unit={f.drillTolMinusU} onUnit={set('drillTolMinusU')}
              />
              <NumberField
                label={text.fields.padTolPlus.label}
                value={f.padTolPlus} onChange={set('padTolPlus')}
                units={LEN_UNITS} unit={f.padTolPlusU} onUnit={set('padTolPlusU')}
              />
              <NumberField
                label={text.fields.padTolMinus.label}
                value={f.padTolMinus} onChange={set('padTolMinus')}
                units={LEN_UNITS} unit={f.padTolMinusU} onUnit={set('padTolMinusU')}
              />
              <NumberField
                label={text.fields.registrationTol.label}
                value={f.registrationTol} onChange={set('registrationTol')}
                units={LEN_UNITS} unit={f.registrationTolU} onUnit={set('registrationTolU')}
              />
              <NumberField
                label={text.fields.planeClearance.label}
                value={f.planeClearance} onChange={set('planeClearance')}
                units={LEN_UNITS} unit={f.planeClearanceU} onUnit={set('planeClearanceU')}
              />
              <NumberField
                label={text.fields.maskExpansion.label}
                value={f.maskExpansion} onChange={set('maskExpansion')}
                units={LEN_UNITS} unit={f.maskExpansionU} onUnit={set('maskExpansionU')}
                hint={text.fields.maskExpansion.hint}
              />
              <NumberField
                label={text.fields.padPitch.label}
                value={f.padPitch} onChange={set('padPitch')}
                units={LEN_UNITS} unit={f.padPitchU} onUnit={set('padPitchU')}
              />
              <NumberField
                label={text.fields.neighbourPad.label}
                value={f.neighbourPad} onChange={set('neighbourPad')}
                units={LEN_UNITS} unit={f.neighbourPadU} onUnit={set('neighbourPadU')}
                hint={text.fields.neighbourPad.hint}
              />
              <NumberField
                label={text.fields.holePitch.label}
                value={f.holePitch} onChange={set('holePitch')}
                units={LEN_UNITS} unit={f.holePitchU} onUnit={set('holePitchU')}
              />
              <NumberField
                label={text.fields.neighbourDrill.label}
                value={f.neighbourDrill} onChange={set('neighbourDrill')}
                units={LEN_UNITS} unit={f.neighbourDrillU} onUnit={set('neighbourDrillU')}
              />
              <NumberField
                label={text.fields.boardThickness.label}
                value={f.boardThickness} onChange={set('boardThickness')}
                units={LEN_UNITS} unit={f.boardThicknessU} onUnit={set('boardThicknessU')}
              />
              <SelectField
                label={text.aspectBasis.label}
                value={f.aspectBasis} onChange={set('aspectBasis')}
                options={[
                  { value: ASPECT_BASIS_DRILL, label: text.aspectBasis.drill },
                  { value: ASPECT_BASIS_FINISHED, label: text.aspectBasis.finished },
                ]}
                hint={text.aspectBasis.hint}
              />
            </>
          )}

          <NumberField
            label={dfm.warnPercent.label}
            value={f.warnPercent} onChange={set('warnPercent')}
            units={['%']} unit="%" onUnit={() => {}}
            hint={dfm.warnPercent.hint}
          />

          {isDistance && (
            <ProfilePanel
              kind={PROFILE_KIND_DECISION}
              profiles={decision.profiles}
              active={decision.active}
              activeId={decision.activeId}
              available={decision.available}
              onSelect={decision.selectActive}
              onImport={decision.importJson}
              onRemove={decision.remove}
              onExport={decision.exportJson}
            />
          )}

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
        <ResultPanel r={r} reason={(code) => text.reasonText(code, r.invalid)}>
          {r.ok && (
            <>
              <div className="big-result">
                <div className="label">
                  {r.tab === TAB_PADSTACK
                    ? (mode === MODE_SYNTHESIS ? text.bigResult.padstackSynthesis : text.bigResult.padstackAnalysis)
                    : (r.tab === TAB_CLEARANCE ? text.bigResult.clearance : text.bigResult.creepage)}
                </div>
                <div className="value">
                  {r.tab === TAB_PADSTACK
                    ? (mode === MODE_SYNTHESIS ? asMm(r.results.Dpad) : asMm(r.results.ringWorst))
                    : (r.required === null ? text.bigResult.noLimit : asMm(r.required))}
                </div>
                <div className="alt">
                  {r.tab === TAB_PADSTACK ? (
                    <>
                      {text.bigResult.drill} {asMm(r.results.Ddrill)}
                      &nbsp;·&nbsp;
                      {text.bigResult.ring} {asMm(r.results.ringNominal)}
                    </>
                  ) : (
                    <>
                      {text.bigResult.deciding} {dfm.sourceLabel(r.decidingSource)}
                    </>
                  )}
                </div>
              </div>

              {status && <span className={`status ${status.cls}`}>{status.text}</span>}

              <table className="result-table">
                <tbody>
                  {r.tab === TAB_PADSTACK ? (
                    <>
                      <tr><td>{text.table.Ddrill}</td><td>{asMm(r.results.Ddrill)}</td></tr>
                      <tr>
                        <td>{text.table.drillRange}</td>
                        <td>{asMm(r.results.DdrillMin)} … {asMm(r.results.DdrillMax)}</td>
                      </tr>
                      <tr><td>{text.table.Dfinished}</td><td>{asMm(r.results.Dfinished)}</td></tr>
                      <tr><td>{text.table.Dpad}</td><td>{asMm(r.results.Dpad)}</td></tr>
                      <tr>
                        <td>{text.table.padRange}</td>
                        <td>{asMm(r.results.DpadMin)} … {asMm(r.results.DpadMax)}</td>
                      </tr>
                      <tr><td>{text.table.ringNominal}</td><td>{asMm(r.results.ringNominal)}</td></tr>
                      <tr><td>{text.table.ringWorst}</td><td>{asMm(r.results.ringWorst)}</td></tr>
                      <tr><td>{text.table.Dantipad}</td><td>{asMm(r.results.Dantipad)}</td></tr>
                      <tr><td>{text.table.Dmask}</td><td>{asMm(r.results.Dmask)}</td></tr>
                      <tr><td>{text.table.maskWeb}</td><td>{asMm(r.results.maskWeb)}</td></tr>
                      <tr><td>{text.table.copperGap}</td><td>{asMm(r.results.copperGap)}</td></tr>
                      <tr><td>{text.table.holeGap}</td><td>{asMm(r.results.holeGap)}</td></tr>
                      <tr>
                        <td>{text.table.aspectRatio}</td>
                        <td>{r.results.aspectRatio === null ? '—' : fmt(r.results.aspectRatio, 3)}</td>
                      </tr>
                    </>
                  ) : (
                    <>
                      <tr><td>{text.table.base}</td><td>{asMm(r.baseDistance)}</td></tr>
                      <tr>
                        <td>{text.table.factor}</td>
                        <td>{r.factor === null ? '—' : fmt(r.factor, 4)}</td>
                      </tr>
                      <tr><td>{text.table.corrected}</td><td>{asMm(r.correctedDistance)}</td></tr>
                      <tr><td>{text.table.fab}</td><td>{asMm(r.fabMinimum)}</td></tr>
                      <tr><td>{text.table.user}</td><td>{asMm(r.userMinimum)}</td></tr>
                      <tr><td>{text.table.required}</td><td>{asMm(r.required)}</td></tr>
                      <tr><td>{text.table.actual}</td><td>{asMm(r.actual)}</td></tr>
                      <tr><td>{text.table.margin}</td><td>{asMm(r.margin)}</td></tr>
                      <tr>
                        <td>{text.table.marginPct}</td>
                        <td>{ui.pct(fmt(r.marginPercent, 3))}</td>
                      </tr>
                      <tr>
                        <td>{text.table.deciding}</td>
                        <td>{dfm.sourceLabel(r.decidingSource)}</td>
                      </tr>
                      <tr><td>{text.table.matched}</td><td>{r.matchedRuleCount}</td></tr>
                      {r.tab === TAB_CREEPAGE && (
                        <tr>
                          <td>{text.table.materialGroup}</td>
                          <td>{r.materialGroup ?? '—'}</td>
                        </tr>
                      )}
                    </>
                  )}
                </tbody>
              </table>

              <h2 className="section">{dfm.checks.title}</h2>
              <DfmChecks rows={displayRows} />

              {!fab.hasProfile && <p className="empty-note warn">{dfm.noProfileNote}</p>}
              {isDistance && !decision.hasProfile && (
                <p className="empty-note warn">{dfm.noStandardNote}</p>
              )}
              {fab.hasProfile && <p className="method-note">{dfm.fabOnlyNote}</p>}

              <Commentary items={notes} />
            </>
          )}
        </ResultPanel>

        {/* ---------- Sağ: Teknik detay ---------- */}
        <section className="panel panel-detail">
          <h2>{ui.technicalDetail}</h2>

          <ul className="detail-list">
            <li>{text.detail.toleranceOneSided}</li>
            <li>{text.detail.worstCaseUses}</li>
            {tab === TAB_PADSTACK && f.holeType === HOLE_NPTH && <li>{text.detail.npthNote}</li>}
            <li>{text.detail.profileMm}</li>
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
        <pre className="formula">
          {(r.tab === TAB_PADSTACK ? text.formulas.padstack
            : r.tab === TAB_CREEPAGE ? text.formulas.creepage
              : text.formulas.clearance).body}
        </pre>
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
          options={sweepOptions}
        />

        {s ? (
          <>
            <ChartLegend
              items={[
                { label: chartSeries[0].name, tone: toneClass(0), kind: 'line' },
                ...s.refs.map(() => ({ label: text.chart.minLegend, tone: 'tone-muted', kind: 'line' })),
              ]}
            />

            <LineChart
              ref={chartRef}
              xScale="linear"
              xLabel={chartX}
              yLabel={chartY}
              series={chartSeries}
              refLines={s.refs.map((ref) => ({
                key: ref.key, y: ref.y, label: text.chart.refMin(asMm(ref.y)),
              }))}
              marker={s.marker ?? undefined}
              formatX={(v) => (isDistance ? fmt(v, 4) : fmt(v * 1e3, 3))}
              formatY={(v) => fmt(v * 1e3, 4)}
              caption={isDistance ? text.chart.captionStep : text.chart.captionRing}
            />

            <ChartDataTable
              xLabel={chartX}
              series={chartSeries}
              every={4}
              formatX={(v) => (isDistance ? fmt(v, 4) : `${fmt(v * 1e3, 3)} mm`)}
              formatY={(v) => `${fmt(v * 1e3, 4)} mm`}
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
        toolKey="clearance-creepage-padstack"
        toolMode={tab}
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
