import { useMemo, useRef, useState } from 'react'
import LangLink from '../../../components/LangLink'
import NumberField from '../../../components/NumberField'
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
import { fmt, fmtEng } from '../../../lib/num'
import PlaneCavitySchematic from './schematic'
import {
  INITIAL_FORM, SWEEP_PARAMS, SWEEP_D,
  STITCHING_N_OPTIONS, MODE_LIMIT_OPTIONS,
  compute, buildSweep,
} from './model'
import { getText } from './text'
import { buildReportSection } from './report'

const LEN_UNITS = ['mm', 'µm', 'mil']
const AREA_UNITS = ['mm²', 'cm²', 'm²']
const FREQ_UNITS = ['Hz', 'kHz', 'MHz', 'GHz']
const VOLT_UNITS = ['V', 'mV']

const axisEng = (v) => fmtEng(v, '', 3).replace(' ', '')

// Bu araçta analiz/sentez modu yok (REV2 §11 ters çözüm tarif etmiyor) —
// taranan grafik parametresi ReturnPathStitchingVia'daki `sweepParam`
// state'iyle aynı gerekçeyle kaydedilen formdan ayrı, salt-UI seçimidir.
export default function PlaneCavityResonance() {
  const [sweepParam, setSweepParam] = useState(SWEEP_D)
  const { f, set, patch } = useToolForm(INITIAL_FORM)

  // Kaydedilmiş hesabı geri yükler (?hesap=<id>) ve ekranı o kayda bağlar;
  // SaveToProject bağlı kayda yeni satır açmak yerine üzerine yazar.
  const saved = useSavedCalculation({
    toolKey: 'plane-cavity-resonance', initialForm: INITIAL_FORM, patch,
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
  }, [r, notes, ui])

  const chartSeries = s
    ? [{ key: sweepParam, name: text.sweepLabel[sweepParam], tone: toneClass(0), points: s.points }]
    : []

  return (
    <>
      <LangLink className="backlink" to="/kategori/guc-termal">{text.backlink}</LangLink>

      <ToolHeader title={text.title} intro={text.intro} />

      <div className="tool-grid">
        {/* ---------- Sol: Girdiler ---------- */}
        <section className="panel">
          <h2>{ui.inputs}</h2>

          <PlaneCavitySchematic ref={schematicRef} r={r} text={text.schematic} />

          <NumberField
            label={text.fields.a.label}
            value={f.a} onChange={set('a')}
            units={LEN_UNITS} unit={f.au} onUnit={set('au')}
          />
          <NumberField
            label={text.fields.b.label}
            value={f.b} onChange={set('b')}
            units={LEN_UNITS} unit={f.bu} onUnit={set('bu')}
          />
          <NumberField
            label={text.fields.d.label}
            value={f.d} onChange={set('d')}
            units={LEN_UNITS} unit={f.du} onUnit={set('du')}
          />
          <NumberField
            label={text.fields.epsR.label}
            value={f.epsR} onChange={set('epsR')}
            units={['']} unit="" onUnit={() => {}}
          />
          <NumberField
            label={text.fields.lossTangent.label}
            value={f.lossTangent} onChange={set('lossTangent')}
            units={['']} unit="" onUnit={() => {}}
          />

          <NumberField
            label={text.fields.mMax.label}
            value={f.mMax} onChange={set('mMax')}
            units={['']} unit="" onUnit={() => {}}
            hint={text.fields.mMax.hint}
          />
          <NumberField
            label={text.fields.nMax.label}
            value={f.nMax} onChange={set('nMax')}
            units={['']} unit="" onUnit={() => {}}
            hint={text.fields.nMax.hint}
          />
          <Segmented
            label={text.fields.modeLimit.label}
            value={f.modeLimit}
            onChange={set('modeLimit')}
            options={MODE_LIMIT_OPTIONS.map((opt) => ({ value: opt, label: text.modeLimitOption(opt) }))}
          />

          <NumberField
            label={text.fields.areaOverride.label}
            value={f.areaOverride} onChange={set('areaOverride')}
            units={AREA_UNITS} unit={f.areaOverrideu} onUnit={set('areaOverrideu')}
            hint={text.fields.areaOverride.hint}
          />

          <NumberField
            label={text.fields.voltage.label}
            value={f.voltage} onChange={set('voltage')}
            units={VOLT_UNITS} unit={f.voltageu} onUnit={set('voltageu')}
            hint={text.fields.voltage.hint}
          />
          <NumberField
            label={text.fields.qc.label}
            value={f.qc} onChange={set('qc')}
            units={['']} unit="" onUnit={() => {}}
          />
          <NumberField
            label={text.fields.qr.label}
            value={f.qr} onChange={set('qr')}
            units={['']} unit="" onUnit={() => {}}
          />
          <NumberField
            label={text.fields.qLoading.label}
            value={f.qLoading} onChange={set('qLoading')}
            units={['']} unit="" onUnit={() => {}}
            hint={text.fields.qLoading.hint}
          />

          <label className="check-row">
            <input
              type="checkbox" checked={f.hasStitching}
              onChange={(e) => set('hasStitching')(e.target.checked)}
            />
            {text.fields.hasStitchingCheck}
          </label>

          {f.hasStitching && (
            <>
              <NumberField
                label={text.fields.targetFrequency.label}
                value={f.targetFrequency} onChange={set('targetFrequency')}
                units={FREQ_UNITS} unit={f.targetFrequencyu} onUnit={set('targetFrequencyu')}
              />
              <Segmented
                label={text.fields.stitchingN.label}
                value={f.stitchingN}
                onChange={set('stitchingN')}
                options={STITCHING_N_OPTIONS.map((n) => ({ value: String(n), label: text.stitchingNOption(n) }))}
              />
              <NumberField
                label={text.fields.actualStitchingSpacing.label}
                value={f.actualStitchingSpacing} onChange={set('actualStitchingSpacing')}
                units={LEN_UNITS} unit={f.actualStitchingSpacingu} onUnit={set('actualStitchingSpacingu')}
              />
            </>
          )}
        </section>

        {/* ---------- Orta: Ana sonuç ---------- */}
        {/* İç `r.ok &&` kapısı gerekli: children JSX'i ResultPanel çizmese de
            burada kurulur — bkz. ReturnPathStitchingVia'daki aynı not. */}
        <ResultPanel r={r} reason={text.reasonText}>
          {r.ok && (
            <>
              <div className="big-result">
                <div className="label">{text.bigResultLabel}</div>
                <div className="value">{fmtEng(r.capacitance, 'F', 4)}</div>
                <div className="alt">
                  {text.altLabels.area} {fmtEng(r.area, 'm²', 3)}
                  &nbsp;·&nbsp; {text.altLabels.lowestResonance} {fmtEng(r.lowestResonance, 'Hz', 3)}
                  &nbsp;·&nbsp; {text.altLabels.qd} {fmt(r.dielectricQ, 3)}
                </div>
              </div>

              {status && <span className={`status ${status.cls}`}>{status.text}</span>}

              <table className="result-table">
                <tbody>
                  <tr>
                    <td>{text.table.capacitance}</td>
                    <td>{fmtEng(r.capacitance, 'F', 4)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.area}</td>
                    <td>{fmtEng(r.area, 'm²', 4)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.capacitancePerArea}</td>
                    <td>{fmtEng(r.capacitancePerArea, 'F/m²', 4)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.lowestResonance}</td>
                    <td>{fmtEng(r.lowestResonance, 'Hz', 4)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.dielectricQ}</td>
                    <td>{fmt(r.dielectricQ, 4)}</td>
                  </tr>
                  {r.totalQ != null && (
                    <tr>
                      <td>{text.table.totalQ}</td>
                      <td>{fmt(r.totalQ, 4)}</td>
                    </tr>
                  )}
                  {r.energy != null && (
                    <tr>
                      <td>{text.table.energy}</td>
                      <td>{fmtEng(r.energy, 'J', 4)}</td>
                    </tr>
                  )}
                  {r.hasStitching && r.stitching && !r.stitching.error && (
                    <>
                      <tr>
                        <td>{text.table.stitchingLambda}</td>
                        <td>{fmtEng(r.stitching.lambda, 'm', 4)}</td>
                      </tr>
                      <tr>
                        <td>{text.table.stitchingSMax}</td>
                        <td>{fmtEng(r.stitching.sMax, 'm', 4)}</td>
                      </tr>
                      {r.stitching.actualSpacing != null && (
                        <tr>
                          <td>{text.table.stitchingActual}</td>
                          <td>{fmtEng(r.stitching.actualSpacing, 'm', 4)}</td>
                        </tr>
                      )}
                    </>
                  )}
                </tbody>
              </table>

              <Commentary items={notes} />

              <h2 className="section">{text.modesHeading}</h2>
              {r.modes.length > 0 ? (
                <table className="pick-table">
                  <thead>
                    <tr>
                      <th>{text.modesCols.m}</th>
                      <th>{text.modesCols.n}</th>
                      <th>{text.modesCols.freq}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.modes.map((mo) => (
                      <tr key={`${mo.m}-${mo.n}`}>
                        <td>{mo.m}</td>
                        <td>{mo.n}</td>
                        <td>{fmtEng(mo.freq, 'Hz', 4)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="empty-note">{text.modesEmpty}</p>
              )}
            </>
          )}
        </ResultPanel>

        {/* ---------- Sağ: Teknik detay ---------- */}
        <section className="panel panel-detail">
          <h2>{ui.technicalDetail}</h2>

          <pre className="formula">{text.formula}</pre>

          {r.ok && (
            <ul className="detail-list">
              <li>{text.detail.areaSource(f.areaOverride !== '', r.area)}</li>
              <li>{text.detail.modeGrid(r.mMax, r.nMax, (r.mMax + 1) * (r.nMax + 1) - 1, r.modes.length)}</li>
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
              xScale="log"
              yScale="log"
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
        toolKey="plane-cavity-resonance"
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
