import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import NumberField from '../../../components/NumberField'
import Segmented from '../../../components/Segmented'
import RowList from '../../../components/RowList'
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
import { fmt, fmtEng, fmtRes, fmtVolt } from '../../../lib/num'
import { VOLTAGE, fromSI } from '../../../lib/units'
import DecouplingSchematic from './schematic'
import {
  INITIAL_FORM, MODE_MIN, MODE_NETWORK, capColumns, compute, buildSweep,
} from './model'
import { getText } from './text'
import { buildReportSection } from './report'

export default function Decoupling() {
  const [mode, setMode] = useState(MODE_MIN)
  const { f, set, patch } = useToolForm(INITIAL_FORM)

  // Kaydedilmiş hesabı geri yükler (?hesap=<id>) ve ekranı o kayda bağlar;
  // SaveToProject bağlı kayda yeni satır açmak yerine üzerine yazar.
  const saved = useSavedCalculation({
    toolKey: 'decoupling', initialForm: INITIAL_FORM, patch, setMode,
  })
  const { lang } = useLang()

  const text = useMemo(() => getText(lang), [lang])
  const ui = useMemo(() => commonText(lang), [lang])

  const r = useMemo(() => compute(mode, f, text.fieldLabels), [mode, f, text])
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

  const isMin = mode === MODE_MIN
  const chartX = isMin ? text.chart.minX : text.chart.netX
  const chartY = isMin ? text.chart.minY : text.chart.netY

  const chartSeries = !s
    ? []
    : s.kind === MODE_MIN
      ? [{ key: 'cmin', name: 'C_min', tone: toneClass(0), points: s.points }]
      : [
          { key: 'net', name: text.chart.seriesNet, tone: toneClass(0), points: s.points },
          ...s.series.map((x) => ({
            key: `row${x.index}`,
            name: text.chart.seriesRow(x.index),
            tone: toneClass(x.index + 1),
            points: x.points,
          })),
        ]

  // Minimum kapasite modunda x ekseni SI (V) gelir; gösterim birimine çevrim
  // burada, units.js tablosundan yapılır. Birim adı eksen etiketiyle aynı
  // sabitten (text.chart.minXUnit) gelir.
  const toChartX = (v) => fromSI(v, text.chart.minXUnit, VOLTAGE)

  const formatY = isMin
    ? (v) => fmtEng(v, 'F', 3)
    : (v) => fmtRes(Math.pow(10, v), 3)
  const formatX = isMin
    ? (v) => fmt(toChartX(v), 3)
    : (v) => fmtEng(v, 'Hz', 3)

  return (
    <>
      <Link className="backlink" to="/kategori/guc-termal">{text.backlink}</Link>

      <ToolHeader title={text.title} intro={text.intro} />

      <div className="tool-grid">
        {/* ---------- Sol: Girdiler ---------- */}
        <section className="panel">
          <h2>{ui.inputs}</h2>

          <DecouplingSchematic ref={schematicRef} r={r} mode={mode} text={text.schematic} />

          <Segmented
            value={mode}
            onChange={setMode}
            options={[
              { value: MODE_MIN, label: text.modeLabel[MODE_MIN] },
              { value: MODE_NETWORK, label: text.modeLabel[MODE_NETWORK] },
            ]}
          />

          {isMin ? (
            <>
              <NumberField
                label={text.fields.dI.label}
                value={f.dI} onChange={set('dI')}
                units={['A', 'mA']} unit={f.dIu} onUnit={set('dIu')}
                hint={text.fields.dI.hint}
              />
              <NumberField
                label={text.fields.dT.label}
                value={f.dT} onChange={set('dT')}
                units={['ns', 'µs', 'ms', 's']} unit={f.dTu} onUnit={set('dTu')}
                hint={text.fields.dT.hint}
              />
              <NumberField
                label={text.fields.dV.label}
                value={f.dV} onChange={set('dV')}
                units={['mV', 'V']} unit={f.dVu} onUnit={set('dVu')}
                hint={text.fields.dV.hint}
              />
            </>
          ) : (
            <>
              <RowList
                label={text.rowList.label}
                rows={f.caps}
                columns={capColumns(text.capCols)}
                onChange={set('caps')}
                rowLabel={text.rowList.rowLabel}
                addLabel={text.rowList.addLabel}
                hint={text.rowList.hint}
              />
              <NumberField
                label={text.fields.fEval.label}
                value={f.fEval} onChange={set('fEval')}
                units={['kHz', 'MHz', 'GHz']} unit={f.fEvalu} onUnit={set('fEvalu')}
                hint={text.fields.fEval.hint}
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
              <p className="empty-note">{text.reasonText(r.reason)}</p>
            )
          ) : isMin ? (
            <>
              <div className="big-result">
                <div className="label">{text.bigMin.label}</div>
                <div className="value">{fmtEng(r.C, 'F', 4)}</div>
                <div className="alt">
                  ΔQ = {fmtEng(r.charge, 'C', 4)} &nbsp;·&nbsp; ΔV = {fmtVolt(r.deltaV)}
                </div>
              </div>

              {status && <span className={`status ${status.cls}`}>{status.text}</span>}

              <p className="method-note">{text.noteMin}</p>

              <table className="result-table">
                <tbody>
                  <tr>
                    <td>{text.tableMin.cmin}</td>
                    <td>{fmtEng(r.C, 'F', 5)}</td>
                  </tr>
                  <tr>
                    <td>{text.tableMin.charge}</td>
                    <td>{fmtEng(r.charge, 'C', 5)}</td>
                  </tr>
                  <tr>
                    <td>{text.tableMin.dI}</td>
                    <td>{fmtEng(r.deltaI, 'A', 4)}</td>
                  </tr>
                  <tr>
                    <td>{text.tableMin.dT}</td>
                    <td>{fmtEng(r.deltaT, 's', 4)}</td>
                  </tr>
                  <tr>
                    <td>{text.tableMin.dV}</td>
                    <td>{fmtVolt(r.deltaV)}</td>
                  </tr>
                  <tr>
                    <td>{text.tableMin.includesEsrEsl}</td>
                    <td>{text.words.yesNo(r.includesEsrEsl)}</td>
                  </tr>
                </tbody>
              </table>

              <Commentary items={notes} />
            </>
          ) : (
            <>
              <div className="big-result">
                <div className="label">{text.bigNet.label(r.f)}</div>
                <div className="value">{fmtRes(r.mag, 4)}</div>
                <div className="alt">
                  R = {fmtRes(r.re, 3)} &nbsp;·&nbsp; X = {fmtRes(r.im, 3)} (
                  {text.words.reactive(r.inductive)})
                </div>
              </div>

              {status && <span className={`status ${status.cls}`}>{status.text}</span>}

              <p className="method-note">{text.noteNetwork}</p>

              <table className="result-table">
                <tbody>
                  {r.items.map((it, i) => (
                    <tr key={i}>
                      <td>{text.tableNet.rowCell(i, it)}</td>
                      <td>
                        {fmtRes(it.group ? it.group.mag : NaN, 3)}
                        <span className="sub">
                          {' '}· SRF {it.srf != null ? fmtEng(it.srf, 'Hz', 3) : text.words.dash} ·{' '}
                          {it.single
                            ? text.words.reactive(it.single.aboveSrf)
                            : text.words.dash}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <p className="method-note">{text.noteRowImpedance}</p>

              <h2 className="section">{text.tableNet.bankHeading}</h2>
              <table className="result-table">
                <tbody>
                  {r.items.map((it, i) => (
                    <tr key={i}>
                      <td>{text.tableNet.bankCell(i, it)}</td>
                      <td>
                        {fmtEng(it.bank ? it.bank.Ceq : NaN, 'F', 3)}
                        <span className="sub">
                          {' '}· ESR {fmtRes(it.bank ? it.bank.ESReq : NaN, 3)} ·
                          ESL {fmtEng(it.bank ? it.bank.ESLeq : NaN, 'H', 3)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <h2 className="section">{text.tableNet.totalHeading}</h2>
              <table className="result-table">
                <tbody>
                  <tr>
                    <td>{text.tableNet.mag}</td>
                    <td>{fmtRes(r.mag, 5)}</td>
                  </tr>
                  <tr>
                    <td>{text.tableNet.re}</td>
                    <td>{fmtRes(r.re, 4)}</td>
                  </tr>
                  <tr>
                    <td>{text.tableNet.im}</td>
                    <td>
                      {fmtRes(r.im, 4)}{' '}
                      <span className="sub">({text.words.reactive(r.inductive)})</span>
                    </td>
                  </tr>
                  <tr>
                    <td>{text.tableNet.count}</td>
                    <td>{fmt(r.count, 4)}</td>
                  </tr>
                  <tr>
                    <td>{text.tableNet.aboveCount}</td>
                    <td>{fmt(r.aboveCount, 3)} / {fmt(r.items.length, 3)}</td>
                  </tr>
                  <tr>
                    <td>{text.tableNet.noEslCount}</td>
                    <td>
                      {fmt(r.noEslCount, 3)} / {fmt(r.items.length, 3)}
                      {r.noEslCount > 0 && (
                        <span className="sub">{text.tableNet.noEslSub}</span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td>{text.tableNet.peak}</td>
                    <td>
                      {r.peak
                        ? <>{fmtEng(r.peak.f, 'Hz', 4)} · {fmtRes(r.peak.mag, 4)}</>
                        : text.words.noPeak}
                    </td>
                  </tr>
                  {r.peak && r.peakWorstSingle != null && (
                    <tr>
                      <td>{text.tableNet.peakWorstSingle}</td>
                      <td>
                        {fmtRes(r.peakWorstSingle, 4)}{' '}
                        <span className="sub">
                          ({text.tableNet.peakCompare(r.peakAbove)})
                        </span>
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td>{text.tableNet.idealSharing}</td>
                    <td>{text.words.yesNo(r.idealSharing)}</td>
                  </tr>
                  <tr>
                    <td>{text.tableNet.mountingIncluded}</td>
                    <td>{text.words.yesNo(false)}</td>
                  </tr>
                </tbody>
              </table>

              <Commentary items={notes} />
            </>
          )}
        </section>

        {/* ---------- Sağ: Teknik detay ---------- */}
        <section className="panel panel-detail">
          <h2>{ui.technicalDetail}</h2>

          <pre className="formula">{text.formula[mode]}</pre>

          {r.ok && (
            <ul className="detail-list">
              {(isMin ? text.detail.min(r) : text.detail.network(r)).map((line) => (
                <li key={line}>{line}</li>
              ))}
              <li>{text.detail.noRounding}</li>
            </ul>
          )}

          <h2 className="section">{ui.validity}</h2>
          <ul className="detail-list">
            {text.validity.map((line, i) => (
              <li key={i}>
                {line.lead}
                {line.strong && <strong>{line.strong}</strong>}
                {line.rest}
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
                ...chartSeries.map((x) => ({ label: x.name, tone: x.tone, kind: 'line' })),
                ...s.refs.map(() => ({
                  label: isMin ? text.chart.legendCmin : text.chart.legendPeak,
                  tone: 'tone-muted',
                  kind: 'line',
                })),
              ]}
            />

            <LineChart
              ref={chartRef}
              xScale="log"
              xLabel={chartX}
              yLabel={chartY}
              series={chartSeries}
              refLines={s.refs.map((ref) => ({
                key: ref.key,
                y: ref.y,
                label: isMin
                  ? text.chart.refCmin(r.C)
                  : text.chart.refPeak(r.peak ? r.peak.mag : NaN),
              }))}
              marker={{
                ...s.marker,
                label: isMin ? text.chart.markerMin : text.chart.markerNet,
              }}
              formatX={formatX}
              formatY={formatY}
              caption={isMin
                ? text.chart.minCaption
                : text.netCaption(s.hidden, r.peak, r.peakAbove, r.peakWorstSingle)}
            />

            <ChartDataTable
              xLabel={chartX}
              series={chartSeries}
              every={isMin ? 6 : 20}
              formatX={isMin
                ? (v) => `${fmt(toChartX(v), 4)} ${text.chart.minXUnit}`
                : (v) => fmtEng(v, 'Hz', 4)}
              formatY={isMin ? (v) => fmtEng(v, 'F', 4) : (v) => fmtRes(Math.pow(10, v), 4)}
            />
          </>
        ) : (
          <p className="empty-note">{ui.chartNeedsInput}</p>
        )}
      </section>

      <ReportDialog section={reportSection} schematicRef={schematicRef} chartRef={chartRef} />
      <SaveToProject
        toolKey="decoupling"
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
