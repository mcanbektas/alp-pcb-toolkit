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
import { fmt, fmtEng, fmtRes, fmtVolt } from '../../../lib/num'
import ReturnPathSchematic from './schematic'
import {
  INITIAL_FORM, SWEEP_PARAMS, SWEEP_REACTANCE, SWEEP_VIA_COUNT,
  BW_SINGLE_POLE, BW_CONSERVATIVE, SPACING_DIVISORS,
  SIGNAL_SINGLE, SIGNAL_DIFF, PLANE_GND, PLANE_POWER, PLANE_SPLIT,
  compute, buildSweep,
} from './model'
import { getText } from './text'
import { buildReportSection } from './report'

const TIME_UNITS = ['ns', 'ps', 'µs']
const FREQ_UNITS = ['Hz', 'kHz', 'MHz', 'GHz']
const LEN_UNITS = ['mm', 'µm', 'mil']
const CURRENT_UNITS = ['mA', 'A']
const CAP_UNITS = ['nF', 'pF', 'µF']
const RES_UNITS = ['Ω', 'mΩ']
const IND_UNITS = ['nH', 'pH', 'µH']

const axisEng = (v) => fmtEng(v, '', 3).replace(' ', '')

// Bu araçta analiz/sentez modu yok (REV2 §4 ters çözüm tarif etmiyor) —
// taranan grafik parametresi VoltageDivider'daki `sweep` state'iyle aynı
// gerekçeyle kaydedilen formdan ayrı, salt-UI seçimidir.
export default function ReturnPathStitchingVia() {
  const [sweepParam, setSweepParam] = useState(SWEEP_REACTANCE)
  const { f, set, patch } = useToolForm(INITIAL_FORM)

  // Kaydedilmiş hesabı geri yükler (?hesap=<id>) ve ekranı o kayda bağlar;
  // SaveToProject bağlı kayda yeni satır açmak yerine üzerine yazar.
  const saved = useSavedCalculation({
    toolKey: 'return-path-stitching-via', initialForm: INITIAL_FORM, patch,
  })
  const { lang } = useLang()

  const text = useMemo(() => getText(lang), [lang])
  const ui = useMemo(() => commonText(lang), [lang])

  const r = useMemo(() => compute(f, text.fieldLabels), [f, text])
  const notes = useMemo(() => text.commentary(r), [r, text])
  const s = useMemo(() => buildSweep(r, sweepParam), [r, sweepParam])

  // Rapor bölümü SVG'siz kurulur; ReportDialog indirme anında canlı DOM'dan
  // (aşağıdaki ref'ler) şematik ve grafiği okuyup satır içine çevirir.
  const reportSection = useMemo(() => buildReportSection({ f, r, s, text }), [f, r, s, text])
  const schematicRef = useRef(null)
  const chartRef = useRef(null)

  const status = useMemo(() => {
    if (!r.ok || notes.length === 0) return null
    const levels = notes.map((n) => n.level)
    const worst = worstLevel(levels)
    return statusChip(worst, countAtLevel(levels, worst), ui)
  }, [notes, ui])

  // Via reaktansı taramasında iki eğri (tek via / N via eşdeğeri) birlikte
  // gösterilir; diğer üç taramada tek eğri vardır.
  const chartSeries = !s ? [] : sweepParam === SWEEP_REACTANCE
    ? [
      { key: 'xlSingle', name: text.seriesSingle, tone: toneClass(0), points: s.points },
      { key: 'xlParallel', name: text.seriesParallel, tone: toneClass(1), points: s.pointsParallel },
    ]
    : [{ key: sweepParam, name: text.sweepLabel[sweepParam], tone: toneClass(0), points: s.points }]

  return (
    <>
      <LangLink className="backlink" to="/kategori/via-padstack">{text.backlink}</LangLink>

      <ToolHeader title={text.title} intro={text.intro} />

      <div className="tool-grid">
        {/* ---------- Sol: Girdiler ---------- */}
        <section className="panel">
          <h2>{ui.inputs}</h2>

          <ReturnPathSchematic ref={schematicRef} r={r} text={text.schematic} />

          <Segmented
            label={text.fields.signalType.label}
            value={f.signalType}
            onChange={set('signalType')}
            options={[
              { value: SIGNAL_SINGLE, label: text.fields.signalSingle },
              { value: SIGNAL_DIFF, label: text.fields.signalDiff },
            ]}
          />

          <SelectField
            label={text.fields.planeType.label}
            value={f.planeType}
            onChange={set('planeType')}
            hint={text.fields.planeType.hint}
            options={[
              { value: PLANE_GND, label: text.fields.planeGnd },
              { value: PLANE_POWER, label: text.fields.planePower },
              { value: PLANE_SPLIT, label: text.fields.planeSplit },
            ]}
          />

          <NumberField
            label={text.fields.tr.label}
            value={f.tr} onChange={set('tr')}
            units={TIME_UNITS} unit={f.tru} onUnit={set('tru')}
          />

          <Segmented
            label={text.fields.bandwidthMethod.label}
            value={f.bandwidthMethod}
            onChange={set('bandwidthMethod')}
            options={[
              { value: BW_CONSERVATIVE, label: text.fields.bwConservative },
              { value: BW_SINGLE_POLE, label: text.fields.bwSinglePole },
            ]}
          />

          <NumberField
            label={text.fields.clockFreq.label}
            value={f.clockFreq} onChange={set('clockFreq')}
            units={FREQ_UNITS} unit={f.clockFrequ} onUnit={set('clockFrequ')}
            hint={text.fields.clockFreq.hint}
          />

          <NumberField
            label={text.fields.epsR.label}
            value={f.epsR} onChange={set('epsR')}
            units={['']} unit="" onUnit={() => {}}
          />
          <NumberField
            label={text.fields.epsEff.label}
            value={f.epsEff} onChange={set('epsEff')}
            units={['']} unit="" onUnit={() => {}}
            hint={text.fields.epsEff.hint}
          />

          <NumberField
            label={text.fields.viaLength.label}
            value={f.viaLength} onChange={set('viaLength')}
            units={LEN_UNITS} unit={f.viaLengthu} onUnit={set('viaLengthu')}
          />
          <NumberField
            label={text.fields.viaDiameter.label}
            value={f.viaDiameter} onChange={set('viaDiameter')}
            units={LEN_UNITS} unit={f.viaDiameteru} onUnit={set('viaDiameteru')}
          />
          <NumberField
            label={text.fields.stitchingViaCount.label}
            value={f.stitchingViaCount} onChange={set('stitchingViaCount')}
            units={[text.countUnit]} unit={text.countUnit} onUnit={() => {}}
          />

          <NumberField
            label={text.fields.actualSpacing.label}
            value={f.actualSpacing} onChange={set('actualSpacing')}
            units={LEN_UNITS} unit={f.actualSpacingu} onUnit={set('actualSpacingu')}
            hint={text.fields.actualSpacing.hint}
          />
          <Segmented
            label={text.fields.spacingDivisor.label}
            value={f.spacingDivisor}
            onChange={set('spacingDivisor')}
            options={SPACING_DIVISORS.map((d) => ({ value: String(d), label: text.table.spacing(d) }))}
          />
          <NumberField
            label={text.fields.signalToReturnViaDistance.label}
            value={f.signalToReturnViaDistance} onChange={set('signalToReturnViaDistance')}
            units={LEN_UNITS} unit={f.signalToReturnViaDistanceu} onUnit={set('signalToReturnViaDistanceu')}
            hint={text.fields.signalToReturnViaDistance.hint}
          />

          <NumberField
            label={text.fields.analysisFreq.label}
            value={f.analysisFreq} onChange={set('analysisFreq')}
            units={FREQ_UNITS} unit={f.analysisFrequ} onUnit={set('analysisFrequ')}
            hint={text.fields.analysisFreq.hint}
          />
          <NumberField
            label={text.fields.returnCurrentPeak.label}
            value={f.returnCurrentPeak} onChange={set('returnCurrentPeak')}
            units={CURRENT_UNITS} unit={f.returnCurrentPeaku} onUnit={set('returnCurrentPeaku')}
            hint={text.fields.returnCurrentPeak.hint}
          />

          <label className="check-row">
            <input
              type="checkbox" checked={f.hasCapacitor}
              onChange={(e) => set('hasCapacitor')(e.target.checked)}
            />
            {text.fields.hasCapacitorCheck}
          </label>

          {f.hasCapacitor && (
            <>
              <NumberField
                label={text.fields.capC.label}
                value={f.capC} onChange={set('capC')}
                units={CAP_UNITS} unit={f.capCu} onUnit={set('capCu')}
              />
              <NumberField
                label={text.fields.capEsr.label}
                value={f.capEsr} onChange={set('capEsr')}
                units={RES_UNITS} unit={f.capEsru} onUnit={set('capEsru')}
              />
              <NumberField
                label={text.fields.capEsl.label}
                value={f.capEsl} onChange={set('capEsl')}
                units={IND_UNITS} unit={f.capEslu} onUnit={set('capEslu')}
              />
              <NumberField
                label={text.fields.capMountL.label}
                value={f.capMountL} onChange={set('capMountL')}
                units={IND_UNITS} unit={f.capMountLu} onUnit={set('capMountLu')}
                hint={text.fields.capMountL.hint}
              />
              <NumberField
                label={text.fields.capDistance.label}
                value={f.capDistance} onChange={set('capDistance')}
                units={LEN_UNITS} unit={f.capDistanceu} onUnit={set('capDistanceu')}
              />
            </>
          )}
        </section>

        {/* ---------- Orta: Ana sonuç ---------- */}
        {/* İç `r.ok &&` kapısı gerekli: children JSX'i ResultPanel çizmese de
            burada kurulur — bkz. VoltageDivider'daki aynı not. */}
        <ResultPanel r={r} reason={text.reasonText}>
          {r.ok && (
            <>
              <div className="big-result">
                <div className="label">{text.bigResultLabel}</div>
                <div className="value">{fmtRes(r.reactanceParallel)}</div>
                <div className="alt">
                  {text.altLabels.fEdge} {fmtEng(r.fEdge, 'Hz', 3)}
                  &nbsp;·&nbsp; {text.altLabels.lambda} {fmtEng(r.lambda, 'm', 3)}
                  &nbsp;·&nbsp; {text.altLabels.lVia} {fmtEng(r.viaInductanceSingle, 'H', 3)}
                </div>
              </div>

              {status && <span className={`status ${status.cls}`}>{status.text}</span>}

              <table className="result-table">
                <tbody>
                  <tr>
                    <td>{text.table.fEdge}</td>
                    <td>{fmtEng(r.fEdge, 'Hz', 4)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.fAnalysis}</td>
                    <td>{fmtEng(r.fAnalysis, 'Hz', 4)}</td>
                  </tr>
                  {r.edgeToClockRatio != null && (
                    <tr>
                      <td>{text.table.edgeToClockRatio}</td>
                      <td>{fmt(r.edgeToClockRatio, 4)}×</td>
                    </tr>
                  )}
                  <tr>
                    <td>{text.table.vp}</td>
                    <td>{fmtEng(r.vp, 'm/s', 4)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.lambda}</td>
                    <td>{fmtEng(r.lambda, 'm', 4)}</td>
                  </tr>
                  {SPACING_DIVISORS.map((d) => (
                    <tr key={d} className={r.spacingDivisor === d ? 'mini-head' : undefined}>
                      <td>{text.table.spacing(d)}</td>
                      <td>{fmtEng(r.spacingLimits[d], 'm', 4)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td>{text.table.viaLSingle}</td>
                    <td>{fmtEng(r.viaInductanceSingle, 'H', 4)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.viaLEq(r.stitchingViaCount)}</td>
                    <td>{fmtEng(r.viaInductanceEq, 'H', 4)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.xlSingle}</td>
                    <td>{fmtRes(r.reactanceSingle)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.xlParallel}</td>
                    <td>{fmtRes(r.reactanceParallel)}</td>
                  </tr>
                  {r.spacingRatio != null && (
                    <>
                      <tr>
                        <td>{text.table.spacingLimit}</td>
                        <td>{fmtEng(r.spacingLimit, 'm', 4)}</td>
                      </tr>
                      <tr>
                        <td>{text.table.spacingRatio}</td>
                        <td>{fmt(r.spacingRatio, 4)}×</td>
                      </tr>
                    </>
                  )}
                  {r.signalToReturnViaDistance != null && (
                    <tr>
                      <td>{text.table.signalToReturnViaDistance}</td>
                      <td>{fmtEng(r.signalToReturnViaDistance, 'm', 4)}</td>
                    </tr>
                  )}
                  {r.returnVoltage != null && (
                    <tr>
                      <td>{text.table.returnVoltage}</td>
                      <td>{fmtVolt(r.returnVoltage)}</td>
                    </tr>
                  )}
                  {r.capacitor && (
                    <>
                      <tr>
                        <td>{text.table.capEslTotal}</td>
                        <td>{fmtEng(r.capacitor.eslTotal, 'H', 4)}</td>
                      </tr>
                      <tr>
                        <td>{text.table.capFsrf}</td>
                        <td>{fmtEng(r.capacitor.fSrf, 'Hz', 4)}</td>
                      </tr>
                      <tr>
                        <td>{text.table.capImpedance}</td>
                        <td>{fmtRes(r.capacitor.impedance)}</td>
                      </tr>
                    </>
                  )}
                  {r.capDistance != null && (
                    <tr>
                      <td>{text.table.capDistance}</td>
                      <td>{fmtEng(r.capDistance, 'm', 4)}</td>
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
              <li>{text.detail.epsUsed(r.usedEpsEff, r.eps)}</li>
              <li>{text.detail.analysisSource(f.analysisFreq !== '')}</li>
              <li>{text.detail.spacingRule(r.spacingDivisor)}</li>
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
          <Segmented
            label={text.sweepGroup}
            value={sweepParam}
            onChange={setSweepParam}
            options={SWEEP_PARAMS.map((p) => ({ value: p, label: text.sweepLabel[p] }))}
          />
        </div>

        {s ? (
          <>
            <ChartLegend
              items={chartSeries.map((series) => ({ label: series.name, tone: series.tone, kind: 'line' }))}
            />

            <LineChart
              ref={chartRef}
              xScale={sweepParam === SWEEP_VIA_COUNT ? 'linear' : 'log'}
              yScale={sweepParam === SWEEP_REACTANCE ? 'log' : 'linear'}
              xLabel={text.sweepAxis[sweepParam]}
              yLabel={text.sweepYLabel[sweepParam]}
              series={chartSeries}
              marker={s.marker ? { ...s.marker, label: text.operatingPoint } : null}
              formatX={axisEng}
              formatY={(v) => fmt(v, 3)}
              caption={text.sweepCaption[sweepParam]}
            />

            <ChartDataTable
              xLabel={text.sweepAxis[sweepParam]}
              series={chartSeries}
              every={8}
              formatX={(v) => fmt(v, 3)}
              formatY={(v) => fmt(v, 4)}
            />
          </>
        ) : (
          <p className="empty-note">{ui.chartNeedsInput}</p>
        )}
      </section>

      <ReportDialog section={reportSection} schematicRef={schematicRef} chartRef={chartRef} />
      <SaveToProject
        toolKey="return-path-stitching-via"
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
