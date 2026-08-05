import { useMemo, useRef, useState } from 'react'
import LangLink from '../../../components/LangLink'
import NumberField from '../../../components/NumberField'
import Segmented from '../../../components/Segmented'
import RowList from '../../../components/RowList'
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
import { fmt, fmtEng, fmtRes, fmtWatt } from '../../../lib/num'
import EmcFilterSchematic from './schematic'
import {
  INITIAL_FORM, TOPOLOGY_LC, TOPOLOGY_PI, TOPOLOGY_CM,
  CHART_GAIN, CHART_ZOUT, CHART_COMPARE, CHART_TOLERANCE, CHART_PARAMS,
  compute, buildSweep,
} from './model'
import { getText } from './text'
import { buildReportSection } from './report'

const RES_UNITS = ['Ω', 'mΩ', 'kΩ']
const IND_UNITS = ['µH', 'nH', 'mH', 'H']
const CAP_UNITS = ['µF', 'nF', 'pF', 'F']
const FREQ_UNITS = ['Hz', 'kHz', 'MHz', 'GHz']
const VOLT_UNITS = ['V', 'mV']
const POW_UNITS = ['W', 'mW']

const axisEng = (v) => fmtEng(v, '', 3).replace(' ', '')
const axisInt = (v) => String(Math.round(v))
const fmtHzShort = (v) => fmtEng(v, 'Hz', 4)
const fmtFShort = (v) => fmtEng(v, 'F', 3)

export default function EmcFilterDesigner() {
  const [chartParam, setChartParam] = useState(CHART_GAIN)
  const { f, set, patch } = useToolForm(INITIAL_FORM)

  // Kaydedilmiş hesabı geri yükler (?hesap=<id>); topoloji formda tutulduğu
  // için (f.topology) ayrı bir setMode gerekmez (bkz. useSavedCalculation
  // JSDoc'u — CLAUDE.md "Kaydedilmiş hesap bağı" ile aynı kural).
  const saved = useSavedCalculation({
    toolKey: 'emc-filter-designer', initialForm: INITIAL_FORM, patch,
  })
  const { lang } = useLang()

  const text = useMemo(() => getText(lang), [lang])
  const ui = useMemo(() => commonText(lang), [lang])

  const r = useMemo(() => compute(f, text.fieldLabels), [f, text])
  const notes = useMemo(() => text.commentary(r), [r, text])
  const s = useMemo(() => buildSweep(r, chartParam), [r, chartParam])

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

  const topology = f.topology
  const isCm = topology === TOPOLOGY_CM
  const isPi = topology === TOPOLOGY_PI

  // Ana sweep grafiği — dört seçenekten biri, kararlar §3.3'ün "üç ana metrik
  // AYRI grafik" kuralının KAPSAMI DIŞINDA (o kural yalnız aşağıdaki
  // candidate metrik grafiklerine uygulanır, bkz. metricSeries).
  let chartSeries = []
  let chartYScale = 'linear'
  let chartRefLines = []
  if (s) {
    if (chartParam === CHART_GAIN) {
      chartSeries = [
        {
          key: 'gain', name: text.chart.seriesGain, tone: toneClass(0),
          points: s.freqs.map((fq, i) => [fq, s.gainDb[i]]),
        },
        {
          key: 'il', name: text.chart.seriesIl, tone: toneClass(1),
          points: s.freqs.map((fq, i) => [fq, s.ilDb[i]]),
        },
      ]
    } else if (chartParam === CHART_ZOUT) {
      chartYScale = 'log'
      chartSeries = [
        {
          key: 'zout', name: text.chart.seriesZout, tone: toneClass(0),
          points: s.freqs.map((fq, i) => [fq, s.zOut[i]]),
        },
      ]
      chartRefLines = [{ key: 'zin', y: s.zInThreshold, label: text.chart.zInRefLabel(s.zInThreshold) }]
    } else if (chartParam === CHART_COMPARE) {
      chartSeries = s.rows.map((row, i) => ({
        key: row.key,
        name: i === 0 ? text.chart.seriesUndamped : text.chart.seriesCandidate(i),
        tone: toneClass(i),
        points: s.freqs.map((fq, j) => [fq, row.gainDb[j]]),
      }))
    } else {
      chartSeries = [
        {
          key: 'nominal', name: text.chart.seriesNominal, tone: toneClass(0),
          points: s.freqs.map((fq, i) => [fq, s.nominal[i]]),
        },
        {
          key: 'min', name: text.chart.seriesWorstMin, tone: toneClass(1),
          points: s.freqs.map((fq, i) => [fq, s.worstMin[i]]),
        },
        {
          key: 'max', name: text.chart.seriesWorstMax, tone: toneClass(2),
          points: s.freqs.map((fq, i) => [fq, s.worstMax[i]]),
        },
      ]
    }
  }

  // Kararlar §3.3 — üç ana metrik AYRI grafiklerde, tek skor/sıralama YOK.
  // Her aday tek noktalı kendi serisidir: sıra yalnızca girilme sırasıdır,
  // konum bir rütbe taşımaz (bkz. metricChart.caption). Domine edilen aday
  // `tone-muted` alır — tablodaki soluklaştırmayla aynı görsel dil.
  const metricSeries = (pick) => (r.ok ? r.candidates.map((c, i) => ({
    key: i,
    name: i === 0 ? text.chart.seriesUndamped : text.chart.seriesCandidate(i),
    tone: c.dominated === true ? 'tone-muted' : toneClass(i),
    points: [[i, pick(c)]],
  })) : [])

  return (
    <>
      <LangLink className="backlink" to="/kategori/guc-termal">{text.backlink}</LangLink>

      <ToolHeader title={text.title} intro={text.intro} />

      <div className="tool-grid">
        {/* ---------- Sol: Girdiler ---------- */}
        <section className="panel">
          <h2>{ui.inputs}</h2>

          <EmcFilterSchematic ref={schematicRef} r={r} text={text.schematic} />

          <Segmented
            label={text.fields.topology.label}
            value={f.topology}
            onChange={set('topology')}
            options={[
              { value: TOPOLOGY_LC, label: text.fields.topologyLc },
              { value: TOPOLOGY_PI, label: text.fields.topologyPi },
              { value: TOPOLOGY_CM, label: text.fields.topologyCm },
            ]}
          />

          <NumberField
            label={text.fields.rSource.label} value={f.rSource} onChange={set('rSource')}
            units={RES_UNITS} unit={f.rSourceu} onUnit={set('rSourceu')}
          />
          <NumberField
            label={text.fields.lSource.label} value={f.lSource} onChange={set('lSource')}
            units={IND_UNITS} unit={f.lSourceu} onUnit={set('lSourceu')}
          />
          <NumberField
            label={text.fields.rLoad.label} value={f.rLoad} onChange={set('rLoad')}
            units={RES_UNITS} unit={f.rLoadu} onUnit={set('rLoadu')}
          />
          <NumberField
            label={text.fields.vIn.label} value={f.vIn} onChange={set('vIn')}
            units={VOLT_UNITS} unit={f.vInu} onUnit={set('vInu')}
          />
          <NumberField
            label={text.fields.pOut.label} value={f.pOut} onChange={set('pOut')}
            units={POW_UNITS} unit={f.pOutu} onUnit={set('pOutu')}
            hint={text.fields.pOut.hint}
          />
          <NumberField
            label={text.fields.efficiency.label} value={f.efficiency} onChange={set('efficiency')}
            units={['%']} unit="%" onUnit={() => {}}
          />
          <NumberField
            label={text.fields.vSource.label} value={f.vSource} onChange={set('vSource')}
            units={VOLT_UNITS} unit={f.vSourceu} onUnit={set('vSourceu')}
            hint={text.fields.vSource.hint}
          />

          <NumberField
            label={text.fields.fMin.label} value={f.fMin} onChange={set('fMin')}
            units={FREQ_UNITS} unit={f.fMinu} onUnit={set('fMinu')}
          />
          <NumberField
            label={text.fields.fMax.label} value={f.fMax} onChange={set('fMax')}
            units={FREQ_UNITS} unit={f.fMaxu} onUnit={set('fMaxu')}
          />
          <NumberField
            label={text.fields.fNoise.label} value={f.fNoise} onChange={set('fNoise')}
            units={FREQ_UNITS} unit={f.fNoiseu} onUnit={set('fNoiseu')}
          />

          <NumberField
            label={text.fields.requiredAttenuationDb.label}
            value={f.requiredAttenuationDb} onChange={set('requiredAttenuationDb')}
            units={['dB']} unit="dB" onUnit={() => {}}
          />
          <NumberField
            label={text.fields.dampingPowerMaxW.label} value={f.dampingPowerMaxW} onChange={set('dampingPowerMaxW')}
            units={POW_UNITS} unit={f.dampingPowerMaxWu} onUnit={set('dampingPowerMaxWu')}
          />
          <NumberField
            label={text.fields.gainPeakMaxDb.label} value={f.gainPeakMaxDb} onChange={set('gainPeakMaxDb')}
            units={['dB']} unit="dB" onUnit={() => {}}
          />
          <NumberField
            label={text.fields.impedanceRatioMax.label} value={f.impedanceRatioMax} onChange={set('impedanceRatioMax')}
            units={['']} unit="" onUnit={() => {}}
            hint={text.fields.impedanceRatioMax.hint}
          />
          <NumberField
            label={text.fields.componentTolerancePct.label}
            value={f.componentTolerancePct} onChange={set('componentTolerancePct')}
            units={['%']} unit="%" onUnit={() => {}}
          />

          <NumberField
            label={text.fields.dcr.label} value={f.dcr} onChange={set('dcr')}
            units={RES_UNITS} unit={f.dcru} onUnit={set('dcru')}
          />

          {!isCm && (
            <>
              <NumberField
                label={text.fields.L.label} value={f.L} onChange={set('L')}
                units={IND_UNITS} unit={f.Lu} onUnit={set('Lu')}
              />
              <NumberField
                label={text.fields.parallelC.label} value={f.parallelC} onChange={set('parallelC')}
                units={CAP_UNITS} unit={f.parallelCu} onUnit={set('parallelCu')}
              />
              <NumberField
                label={text.fields.C.label} value={f.C} onChange={set('C')}
                units={CAP_UNITS} unit={f.Cu} onUnit={set('Cu')}
              />
              <NumberField
                label={text.fields.esr.label} value={f.esr} onChange={set('esr')}
                units={RES_UNITS} unit={f.esru} onUnit={set('esru')}
              />
              <NumberField
                label={text.fields.esl.label} value={f.esl} onChange={set('esl')}
                units={IND_UNITS} unit={f.eslu} onUnit={set('eslu')}
              />
            </>
          )}

          {isPi && (
            <>
              <NumberField
                label={text.fields.C2.label} value={f.C2} onChange={set('C2')}
                units={CAP_UNITS} unit={f.C2u} onUnit={set('C2u')}
              />
              <NumberField
                label={text.fields.esr2.label} value={f.esr2} onChange={set('esr2')}
                units={RES_UNITS} unit={f.esr2u} onUnit={set('esr2u')}
              />
              <NumberField
                label={text.fields.esl2.label} value={f.esl2} onChange={set('esl2')}
                units={IND_UNITS} unit={f.esl2u} onUnit={set('esl2u')}
              />
            </>
          )}

          {isCm && (
            <>
              <NumberField
                label={text.fields.lLeak.label} value={f.lLeak} onChange={set('lLeak')}
                units={IND_UNITS} unit={f.lLeaku} onUnit={set('lLeaku')}
              />
              <NumberField
                label={text.fields.lCm.label} value={f.lCm} onChange={set('lCm')}
                units={IND_UNITS} unit={f.lCmu} onUnit={set('lCmu')}
              />
              <NumberField
                label={text.fields.cLL.label} value={f.cLL} onChange={set('cLL')}
                units={CAP_UNITS} unit={f.cLLu} onUnit={set('cLLu')}
              />
              <NumberField
                label={text.fields.esrLL.label} value={f.esrLL} onChange={set('esrLL')}
                units={RES_UNITS} unit={f.esrLLu} onUnit={set('esrLLu')}
              />
              <NumberField
                label={text.fields.eslLL.label} value={f.eslLL} onChange={set('eslLL')}
                units={IND_UNITS} unit={f.eslLLu} onUnit={set('eslLLu')}
              />
            </>
          )}
        </section>

        {/* ---------- Orta: Ana sonuç ---------- */}
        {/* İç `r.ok &&` kapısı gerekli: children JSX'i ResultPanel çizmese de
            burada kurulur — bkz. ReturnPathStitchingVia/VoltageDivider'daki
            aynı not. */}
        <ResultPanel r={r} reason={text.reasonText}>
          {r.ok && (
            <>
              <div className="big-result">
                <div className="label">{text.table.idealPair[r.idealPairs[0].key]}</div>
                <div className="value">{fmtHzShort(r.idealPairs[0].f0)}</div>
                <div className="alt">
                  {text.topoName(r.topology)} &nbsp;·&nbsp; Z0 {fmtRes(r.idealPairs[0].z0)}
                </div>
              </div>

              {status && <span className={`status ${status.cls}`}>{status.text}</span>}

              <table className="result-table">
                <tbody>
                  {r.idealPairs.map((p) => (
                    <tr key={p.key}>
                      <td>{text.table.idealPair[p.key]}</td>
                      <td>{fmtHzShort(p.f0)} · Z0 {fmtRes(p.z0)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td>{text.table.zIn}</td>
                    <td>{fmtRes(r.zIn.rInNeg)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.pIn}</td>
                    <td>{fmtWatt(r.zIn.pIn)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.zOutNoise}</td>
                    <td>{fmtRes(r.zOutAtNoise)}</td>
                  </tr>
                  {r.cm != null && (
                    <tr>
                      <td>{text.table.cmImpedance}</td>
                      <td>{fmtRes(r.cm)}</td>
                    </tr>
                  )}
                  {r.dm != null && (
                    <tr>
                      <td>{text.table.dmImpedance}</td>
                      <td>{fmtRes(r.dm)}</td>
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
              <li>{text.detail.noRounding}</li>
              <li>{text.detail.toleranceNote(r.componentTolerancePct)}</li>
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

      {/* ---------- Damping adayları — kararlar §3.3: tek skor/sıralama YOK ---------- */}
      <section className="panel panel-wide">
        <h2>{text.candidates.heading}</h2>

        <RowList
          label={text.candidates.heading}
          rows={f.candidates}
          onChange={(rows) => patch({ candidates: rows })}
          min={1}
          max={8}
          addLabel={text.candidates.add}
          rowLabel={text.fieldLabels.candidateRow}
          columns={[
            { key: 'rD', label: text.fields.rD.label, unitKey: 'rDu', units: RES_UNITS },
            { key: 'cD', label: text.fields.cD.label, unitKey: 'cDu', units: CAP_UNITS },
          ]}
        />

        {r.ok && (
          <>
            <p className="field-hint">
              {r.candidates.some((c) => c.meetsAll) ? text.candidates.tableCaption : text.candidates.noneSuitable}
            </p>
            <div className="scroll">
              <table className="result-table">
                <thead>
                  <tr>
                    <th>{text.candidates.col.candidate}</th>
                    <th>{text.candidates.col.rD}</th>
                    <th>{text.candidates.col.cD}</th>
                    <th>{text.candidates.col.gPeak}</th>
                    <th>{text.candidates.col.aTarget}</th>
                    <th>{text.candidates.col.pRD}</th>
                    <th>{text.candidates.col.kZ}</th>
                    <th>{text.candidates.col.f3db}</th>
                    <th>{text.candidates.col.inRegion}</th>
                  </tr>
                </thead>
                <tbody>
                  {r.candidates.map((c, i) => (
                    <tr
                      key={i}
                      className={c.dominated ? 'dim' : undefined}
                      title={c.dominated ? text.candidates.dominatedNote : undefined}
                    >
                      <td>{i === 0 ? text.candidates.undamped : text.candidates.candidateLabel(i)}</td>
                      <td>{c.damping ? fmtRes(c.damping.rD) : '—'}</td>
                      <td>{c.damping && c.damping.cD > 0 ? fmtFShort(c.damping.cD) : '—'}</td>
                      <td>{fmt(c.gPeakDb, 3)} dB</td>
                      <td>{fmt(c.aTargetDb, 3)} dB</td>
                      <td>{fmtWatt(c.pRD)}</td>
                      <td>{fmt(c.kZ, 4)}</td>
                      <td>{c.f3dbActual != null ? fmtHzShort(c.f3dbActual) : '—'}</td>
                      <td>
                        {c.meetsAll ? text.candidates.yes : text.candidates.no}
                        {c.dominated && <div className="field-hint">{text.candidates.dominatedNote}</div>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Üç ana metrik AYRI grafiklerde — kararlar §3.3'ün en kritik
                gereksinimi. Tek birleşik grafik ya da sıralama/skor sütunu
                YOK; her aday kendi tek-noktalı serisidir (bkz. metricSeries),
                domine edilenler `tone-muted` ile soluklaştırılır. */}
            <div className="metric-charts">
              {/* Alt başlık `h2.section`tir: panel başlığı kimliği (mono, büyük
                  harf, aralıklı, muted) yalnız `.panel h2` seçicisine bağlı —
                  `h3` o kuralların hiçbirini almaz ve 44 ekranın tek aykırısı olur. */}
              <h2 className="section">{text.metricChart.gPeakTitle}</h2>
              <ChartLegend
                items={metricSeries((c) => c.gPeakDb).map((sr) => ({ label: sr.name, tone: sr.tone, kind: 'line' }))}
              />
              <LineChart
                xScale="linear" yScale="linear"
                xLabel={text.metricChart.axisCandidate} yLabel={text.metricChart.axisDb}
                series={metricSeries((c) => c.gPeakDb)}
                formatX={axisInt} formatY={(v) => fmt(v, 3)}
                caption={text.metricChart.caption}
              />

              <h2 className="section">{text.metricChart.aTargetTitle}</h2>
              <ChartLegend
                items={metricSeries((c) => c.aTargetDb).map((sr) => ({ label: sr.name, tone: sr.tone, kind: 'line' }))}
              />
              <LineChart
                xScale="linear" yScale="linear"
                xLabel={text.metricChart.axisCandidate} yLabel={text.metricChart.axisDb}
                series={metricSeries((c) => c.aTargetDb)}
                formatX={axisInt} formatY={(v) => fmt(v, 3)}
                caption={text.metricChart.caption}
              />

              <h2 className="section">{text.metricChart.pRDTitle}</h2>
              <ChartLegend
                items={metricSeries((c) => c.pRD).map((sr) => ({ label: sr.name, tone: sr.tone, kind: 'line' }))}
              />
              <LineChart
                xScale="linear" yScale="linear"
                xLabel={text.metricChart.axisCandidate} yLabel={text.metricChart.axisWatt}
                series={metricSeries((c) => c.pRD)}
                formatX={axisInt} formatY={(v) => fmt(v, 4)}
                caption={text.metricChart.caption}
              />
            </div>
          </>
        )}
      </section>

      {/* ---------- Alt: Frekans sweep grafiği ---------- */}
      <section className="panel panel-chart">
        <div className="chart-head">
          <h2>{ui.chart}</h2>
          <Segmented
            label={ui.chart}
            value={chartParam}
            onChange={setChartParam}
            options={CHART_PARAMS.map((p) => ({ value: p, label: text.chart.paramLabel[p] }))}
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
              yScale={chartYScale}
              xLabel={text.chart.axisFreq}
              yLabel={chartParam === CHART_ZOUT ? text.chart.axisZ : text.chart.axisGainDb}
              series={chartSeries}
              refLines={chartRefLines}
              formatX={axisEng}
              formatY={(v) => fmt(v, 3)}
              caption={text.chart.caption[chartParam]}
            />

            <ChartDataTable
              xLabel={text.chart.axisFreq}
              series={chartSeries}
              every={10}
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
        toolKey="emc-filter-designer"
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
