import { useMemo, useRef } from 'react'
import LangLink from '../../../components/LangLink'
import NumberField from '../../../components/NumberField'
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
import {
  fmt, fmtEng, fmtRes, fmtVolt, fmtPct,
} from '../../../lib/num'
import PdnResonanceSchematic from './schematic'
import {
  INITIAL_FORM, compute, buildChartData,
  capColumnsCore, capColumnsParasitics, capColumnsTolerance,
} from './model'
import { getText } from './text'
import { buildReportSection } from './report'

const V_UNITS = ['V', 'mV']
const CURRENT_UNITS = ['A', 'mA']
const FREQ_UNITS = ['Hz', 'kHz', 'MHz', 'GHz']
const RES_UNITS = ['Ω', 'mΩ', 'kΩ']
const IND_UNITS = ['nH', 'pH', 'µH']
const CAP_UNITS = ['µF', 'nF', 'pF']
const TIME_UNITS = ['ns', 'µs', 'ms']

// Eksen tikleri dar; ön ek boşluksuz yazılır (1k, 10k, 1M) — ReturnPathStitchingVia
// ve VoltageDivider'daki axisEng/axisRes ile aynı desen.
const axisEng = (v) => fmtEng(v, '', 3).replace(' ', '')

export default function PdnResonanceAnalyzer() {
  const { f, set, patch } = useToolForm(INITIAL_FORM)

  // Kaydedilmiş hesabı geri yükler (?hesap=<id>) ve ekranı o kayda bağlar;
  // SaveToProject bağlı kayda yeni satır açmak yerine üzerine yazar.
  const saved = useSavedCalculation({
    toolKey: 'pdn-resonance-analyzer', initialForm: INITIAL_FORM, patch,
  })
  const { lang } = useLang()

  const text = useMemo(() => getText(lang), [lang])
  const ui = useMemo(() => commonText(lang), [lang])

  const r = useMemo(() => compute(f, text.fieldLabels), [f, text])
  const notes = useMemo(() => text.commentary(r), [r, text])
  const chartData = useMemo(() => buildChartData(r), [r])

  // Rapor bölümü SVG'siz kurulur; ReportDialog indirme anında canlı DOM'dan
  // (aşağıdaki ref'ler) şematik ve grafiği okuyup satır içine çevirir.
  const reportSection = useMemo(
    () => buildReportSection({
      f, r, chartData, text,
    }),
    [f, r, chartData, text],
  )
  const schematicRef = useRef(null)
  const chartRef = useRef(null)

  const status = useMemo(() => {
    if (!r.ok || notes.length === 0) return null
    const levels = notes.map((n) => n.level)
    const worst = worstLevel(levels)
    return statusChip(worst, countAtLevel(levels, worst), ui)
  }, [notes, ui])

  // Grafik serileri: toplam PDN her zaman ilk sırada; VRM/plane yalnız
  // etkinse eklenir; kondansatör grupları model.js'de MAX_GROUP_SERIES ile
  // zaten sınırlanmış olarak gelir (Decoupling'teki MAX_SERIES ile aynı
  // gerekçe — çok kollu ağda grafik okunaksızlaşmasın).
  const chartSeries = useMemo(() => {
    if (!chartData) return []
    const out = [
      { key: 'total', name: text.chart.seriesTotal, tone: toneClass(0), points: chartData.totalPoints },
    ]
    let idx = 1
    if (chartData.vrmPoints) {
      out.push({ key: 'vrm', name: text.chart.seriesVrm, tone: toneClass(idx), points: chartData.vrmPoints })
      idx += 1
    }
    chartData.groupSeries.forEach((g) => {
      out.push({
        key: `group${g.index}`,
        name: text.chart.seriesGroup(g.label, g.index),
        tone: toneClass(idx),
        points: g.points,
      })
      idx += 1
    })
    if (chartData.planePoints) {
      out.push({ key: 'plane', name: text.chart.seriesPlane, tone: toneClass(idx), points: chartData.planePoints })
      idx += 1
    }
    return out
  }, [chartData, text])

  const sortedPeaksValleys = useMemo(() => {
    if (!r.ok) return []
    return [...r.sweep.peaks, ...r.sweep.valleys].sort((a, b) => a.freq - b.freq)
  }, [r])

  return (
    <>
      <LangLink className="backlink" to="/kategori/guc-termal">{text.backlink}</LangLink>

      <ToolHeader title={text.title} intro={text.intro} />

      <div className="tool-grid">
        {/* ---------- Sol: Girdiler ---------- */}
        <section className="panel">
          <h2>{ui.inputs}</h2>

          <PdnResonanceSchematic ref={schematicRef} r={r} text={text.schematic} />

          <NumberField
            label={text.fields.Vrail.label}
            value={f.Vrail} onChange={set('Vrail')}
            units={V_UNITS} unit={f.Vrailu} onUnit={set('Vrailu')}
          />
          <NumberField
            label={text.fields.ripplePct.label}
            value={f.ripplePct} onChange={set('ripplePct')}
            units={['%']} unit="%" onUnit={() => {}}
            hint={text.fields.ripplePct.hint}
          />
          <NumberField
            label={text.fields.deltaVAllowed.label}
            value={f.deltaVAllowed} onChange={set('deltaVAllowed')}
            units={V_UNITS} unit={f.deltaVAllowedu} onUnit={set('deltaVAllowedu')}
            hint={text.fields.deltaVAllowed.hint}
          />
          <NumberField
            label={text.fields.deltaI.label}
            value={f.deltaI} onChange={set('deltaI')}
            units={CURRENT_UNITS} unit={f.deltaIu} onUnit={set('deltaIu')}
          />
          <NumberField
            label={text.fields.fMin.label}
            value={f.fMin} onChange={set('fMin')}
            units={FREQ_UNITS} unit={f.fMinu} onUnit={set('fMinu')}
          />
          <NumberField
            label={text.fields.fMax.label}
            value={f.fMax} onChange={set('fMax')}
            units={FREQ_UNITS} unit={f.fMaxu} onUnit={set('fMaxu')}
          />
          <NumberField
            label={text.fields.points.label}
            value={f.points} onChange={set('points')}
            units={['']} unit="" onUnit={() => {}}
            hint={text.fields.points.hint}
          />
          <NumberField
            label={text.fields.threshold.label}
            value={f.threshold} onChange={set('threshold')}
            units={['dB']} unit="dB" onUnit={() => {}}
            hint={text.fields.threshold.hint}
          />

          <label className="check-row">
            <input
              type="checkbox" checked={f.hasVrm}
              onChange={(e) => set('hasVrm')(e.target.checked)}
            />
            {text.fields.hasVrmCheck}
          </label>
          {f.hasVrm && (
            <>
              <NumberField
                label={text.fields.vrmR.label}
                value={f.vrmR} onChange={set('vrmR')}
                units={RES_UNITS} unit={f.vrmRu} onUnit={set('vrmRu')}
              />
              <NumberField
                label={text.fields.vrmL.label}
                value={f.vrmL} onChange={set('vrmL')}
                units={IND_UNITS} unit={f.vrmLu} onUnit={set('vrmLu')}
              />
              <NumberField
                label={text.fields.vrmC.label}
                value={f.vrmC} onChange={set('vrmC')}
                units={CAP_UNITS} unit={f.vrmCu} onUnit={set('vrmCu')}
                hint={text.fields.vrmC.hint}
              />
            </>
          )}

          <label className="check-row">
            <input
              type="checkbox" checked={f.hasPlane}
              onChange={(e) => set('hasPlane')(e.target.checked)}
            />
            {text.fields.hasPlaneCheck}
          </label>
          {f.hasPlane && (
            <>
              <NumberField
                label={text.fields.planeR.label}
                value={f.planeR} onChange={set('planeR')}
                units={RES_UNITS} unit={f.planeRu} onUnit={set('planeRu')}
              />
              <NumberField
                label={text.fields.planeL.label}
                value={f.planeL} onChange={set('planeL')}
                units={IND_UNITS} unit={f.planeLu} onUnit={set('planeLu')}
              />
              <NumberField
                label={text.fields.planeC.label}
                value={f.planeC} onChange={set('planeC')}
                units={CAP_UNITS} unit={f.planeCu} onUnit={set('planeCu')}
              />
            </>
          )}

          {/* Kondansatör grupları: üç RowList, hepsi aynı `f.capGroups` dizisine
              yazar (Pdn'nin bankA/bankB deseniyle aynı gerekçe — tek satıra
              sığmayan geniş sütun kümesi işlevine göre bölünür). */}
          <RowList
            label={text.rowList.core}
            rows={f.capGroups}
            columns={capColumnsCore(text.capCols)}
            onChange={set('capGroups')}
            rowLabel={text.rowList.rowLabel}
            addLabel={text.rowList.addLabel}
            hint={text.rowList.coreHint}
          />
          <RowList
            label={text.rowList.parasitics}
            rows={f.capGroups}
            columns={capColumnsParasitics(text.capCols)}
            onChange={set('capGroups')}
            rowLabel={text.rowList.rowLabel}
            addLabel={text.rowList.addLabel}
            hint={text.rowList.parasiticsHint}
          />

          <label className="check-row">
            <input
              type="checkbox" checked={f.hasTolerance}
              onChange={(e) => set('hasTolerance')(e.target.checked)}
            />
            {text.fields.hasToleranceCheck}
          </label>
          {f.hasTolerance && (
            <RowList
              label={text.rowList.tolerance}
              rows={f.capGroups}
              columns={capColumnsTolerance(text.capCols)}
              onChange={set('capGroups')}
              rowLabel={text.rowList.rowLabel}
              addLabel={text.rowList.addLabel}
              hint={text.rowList.toleranceHint}
            />
          )}

          <h2 className="section">{text.dropHeading}</h2>
          <NumberField
            label={text.fields.deltaT.label}
            value={f.deltaT} onChange={set('deltaT')}
            units={TIME_UNITS} unit={f.deltaTu} onUnit={set('deltaTu')}
            hint={text.fields.deltaT.hint}
          />
          <NumberField
            label={text.fields.tRise.label}
            value={f.tRise} onChange={set('tRise')}
            units={TIME_UNITS} unit={f.tRiseu} onUnit={set('tRiseu')}
            hint={text.fields.tRise.hint}
          />
          <NumberField
            label={text.fields.dropC.label}
            value={f.dropC} onChange={set('dropC')}
            units={CAP_UNITS} unit={f.dropCu} onUnit={set('dropCu')}
            hint={text.fields.dropC.hint}
          />
          <NumberField
            label={text.fields.dropESReq.label}
            value={f.dropESReq} onChange={set('dropESReq')}
            units={RES_UNITS} unit={f.dropESRequ} onUnit={set('dropESRequ')}
            hint={text.fields.dropESReq.hint}
          />
          <NumberField
            label={text.fields.dropLeq.label}
            value={f.dropLeq} onChange={set('dropLeq')}
            units={IND_UNITS} unit={f.dropLequ} onUnit={set('dropLequ')}
            hint={text.fields.dropLeq.hint}
          />
        </section>

        {/* ---------- Orta: Ana sonuç ---------- */}
        {/* İç `r.ok &&` kapısı gerekli: children JSX'i ResultPanel çizmese de
            burada kurulur — bkz. VoltageDivider/ReturnPathStitchingVia'daki
            aynı not. */}
        <ResultPanel r={r} reason={text.reasonText}>
          {r.ok && (
            <>
              <div className="big-result">
                <div className="label">{text.table.target}</div>
                <div className="value">{fmtRes(r.target.Ztarget)}</div>
                <div className="alt">
                  {text.table.maxImpedance} {fmtRes(r.maxImpedance)}
                </div>
              </div>

              {status && <span className={`status ${status.cls}`}>{status.text}</span>}

              <table className="result-table">
                <tbody>
                  <tr>
                    <td>{text.table.underTargetPct}</td>
                    <td>{text.pct(fmtPct(r.underTargetPct))}</td>
                  </tr>
                  <tr>
                    <td>{text.table.overBandsCount}</td>
                    <td>{r.overTargetBands.length}</td>
                  </tr>
                  <tr>
                    <td>{text.table.thresholdUsed}</td>
                    <td>{fmt(r.threshold, 3)} dB</td>
                  </tr>
                  {r.minLowFreqC != null && Number.isFinite(r.minLowFreqC) && (
                    <tr>
                      <td>{text.table.minLowFreqC}</td>
                      <td>{fmtEng(r.minLowFreqC, 'F', 4)}</td>
                    </tr>
                  )}
                  {r.droop && !r.droop.error && (
                    <>
                      <tr className="mini-head">
                        <td>{text.table.droopTotal}</td>
                        <td>{fmtVolt(r.droop.total)}</td>
                      </tr>
                      <tr>
                        <td>{text.table.droopC}</td>
                        <td>{fmtVolt(r.droop.dVC)}</td>
                      </tr>
                      <tr>
                        <td>{text.table.droopESR}</td>
                        <td>{fmtVolt(r.droop.dVESR)}</td>
                      </tr>
                      <tr>
                        <td>{text.table.droopESL}</td>
                        <td>{fmtVolt(r.droop.dVESL)}</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>

              <h2 className="section">{text.peakTable.heading}</h2>
              {sortedPeaksValleys.length === 0 ? (
                <p className="empty-note">{text.peakTable.none}</p>
              ) : (
                /* Beş sütun dar ekranda panele sığmıyor (min-content 405 px);
                   sarmalayıcı olmadan sayfanın kendisi yana kayıyordu. */
                <div className="scroll">
                  <table className="result-table">
                    <thead>
                      <tr>
                        <th>{text.peakTable.kind}</th>
                        <th>{text.peakTable.freq}</th>
                        <th>{text.peakTable.impedance}</th>
                        <th>{text.peakTable.ratio}</th>
                        <th>{text.peakTable.prominence}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedPeaksValleys.map((c) => (
                        <tr key={`${c.kind}-${c.startIndex}`}>
                          <td>{c.kind === 'peak' ? text.peakTable.kindPeak : text.peakTable.kindValley}</td>
                          <td>{fmtEng(c.freq, 'Hz', 4)}</td>
                          <td>{fmtRes(c.magnitude)}</td>
                          <td>{c.ratioToTarget != null ? `${fmt(c.ratioToTarget, 3)}×` : '—'}</td>
                          <td>{fmt(c.prominence, 3)} dB</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="method-note">
                {text.peakTable.candidateNote(
                  r.sweep.candidates.length,
                  r.sweep.peaks.length + r.sweep.valleys.length,
                )}
              </p>

              <h2 className="section">{text.srfTable.heading}</h2>
              <table className="result-table">
                <tbody>
                  {r.groupSrf.map((g) => (
                    <tr key={g.index}>
                      <td>{g.label || text.srfTable.defaultLabel(g.index)}</td>
                      <td>{Number.isFinite(g.srf) ? fmtEng(g.srf, 'Hz', 4) : text.srfTable.unresolved}</td>
                    </tr>
                  ))}
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
              <li>{text.detail.targetSource(r.target.fromRipplePct)}</li>
              <li>{text.detail.thresholdNote(r.threshold)}</li>
              <li>{text.detail.sameSweepAsReport}</li>
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

      {/* ---------- Alt: Grafik ---------- */}
      <section className="panel panel-chart">
        <div className="chart-head">
          <h2>{ui.chart}</h2>
        </div>

        {chartData ? (
          <>
            <ChartLegend
              items={[
                ...chartSeries.map((series) => ({ label: series.name, tone: series.tone, kind: 'line' })),
                ...(chartData.toleranceBand
                  ? [{ label: text.chart.toleranceBandLegend, tone: toneClass(chartSeries.length), faded: true }]
                  : []),
              ]}
            />

            <LineChart
              ref={chartRef}
              xScale="log"
              yScale="log"
              xLabel={text.chart.xLabel}
              yLabel={text.chart.yLabel}
              series={chartSeries}
              band={chartData.toleranceBand
                ? {
                  name: text.chart.toleranceBandLegend,
                  tone: toneClass(chartSeries.length),
                  points: chartData.toleranceBand,
                }
                : null}
              refLines={chartData.targetLine != null
                ? [{ key: 'target', y: chartData.targetLine, label: text.chart.targetRefLabel(chartData.targetLine) }]
                : []}
              marker={chartData.marker ? { ...chartData.marker, label: text.chart.worstAntiresonanceLabel } : null}
              formatX={axisEng}
              formatY={(v) => fmt(v, 3)}
              caption={text.chart.caption}
            />

            <ChartDataTable
              xLabel={text.chart.xLabel}
              series={chartSeries}
              every={Math.max(1, Math.round(r.sweep.freqs.length / 25))}
              formatX={(v) => fmtEng(v, 'Hz', 3)}
              formatY={(v) => fmtRes(v, 4)}
            />

            {chartData.hiddenGroupCount > 0 && (
              <p className="method-note">{text.chart.hiddenGroups(chartData.hiddenGroupCount)}</p>
            )}
          </>
        ) : (
          <p className="empty-note">{ui.chartNeedsInput}</p>
        )}
      </section>

      <ReportDialog section={reportSection} schematicRef={schematicRef} chartRef={chartRef} />
      <SaveToProject
        toolKey="pdn-resonance-analyzer"
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
