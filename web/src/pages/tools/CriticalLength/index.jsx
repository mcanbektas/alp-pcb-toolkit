import { useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import NumberField from '../../../components/NumberField'
import SelectField from '../../../components/SelectField'
import EpsEffFields, { epsEffRows } from '../../../components/EpsEffFields'
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
import CriticalLengthSchematic from './schematic'
import {
  INITIAL_FORM, DIVISORS, LENGTH_UNITS, RISE_UNITS,
  compute, buildSweep,
} from './model'
import { getText } from './text'
import { buildReportSection } from './report'

export default function CriticalLength() {
  const { f, set, patch } = useToolForm(INITIAL_FORM)

  // Kaydedilmiş hesabı geri yükler (?hesap=<id>) ve ekranı o kayda bağlar;
  // SaveToProject bağlı kayda yeni satır açmak yerine üzerine yazar.
  const saved = useSavedCalculation({
    toolKey: 'critical-length', initialForm: INITIAL_FORM, patch,
  })
  const { lang } = useLang()

  const text = useMemo(() => getText(lang), [lang])
  const ui = useMemo(() => commonText(lang), [lang])

  const r = useMemo(() => compute(f, text.fieldLabels), [f, text])
  const s = useMemo(() => buildSweep(r), [r])
  const notes = useMemo(() => text.commentary(r), [r, text])

  // Rapor bölümü SVG'siz kurulur; ReportDialog indirme anında canlı DOM'dan
  // (aşağıdaki ref'ler) şematik ve grafiği okuyup satır içine çevirir.
  const reportSection = useMemo(
    () => buildReportSection({ f, r, s, text, lang }),
    [f, r, s, text, lang],
  )
  const schematicRef = useRef(null)
  const chartRef = useRef(null)

  const status = useMemo(() => {
    if (!r.ok || notes.length === 0) return null
    const levels = notes.map((n) => n.level)
    const worst = worstLevel(levels)
    return statusChip(worst, countAtLevel(levels, worst), ui)
  }, [r, notes, ui])

  const chartSeries = s
    ? s.series.map((ser, i) => ({
        key: `d${ser.divisor}`,
        name: `1/${ser.divisor}`,
        tone: toneClass(i),
        points: ser.points,
      }))
    : []

  return (
    <>
      <Link className="backlink" to="/kategori/sinyal-butunlugu">{text.backlink}</Link>

      <ToolHeader title={text.title} intro={text.intro} />

      <div className="tool-grid">
        {/* ---------- Sol: Girdiler ---------- */}
        <section className="panel">
          <h2>{ui.inputs}</h2>

          <CriticalLengthSchematic ref={schematicRef} r={r} text={text.schematic} />

          <EpsEffFields f={f} set={set} />

          <NumberField
            label={text.fields.tr.label}
            value={f.tr} onChange={set('tr')}
            units={RISE_UNITS} unit={f.tru} onUnit={set('tru')}
            hint={text.fields.tr.hint}
          />

          <SelectField
            label={text.fields.divisor.label}
            value={f.divisor} onChange={set('divisor')}
            options={DIVISORS.map((d) => ({ value: String(d), label: text.divisorLabel[d] }))}
            hint={text.fields.divisor.hint}
          />

          <NumberField
            label={text.fields.k.label}
            value={f.k} onChange={set('k')}
            units={['']} unit="" onUnit={() => {}}
            hint={text.fields.k.hint}
          />

          <NumberField
            label={text.fields.length.label}
            value={f.length} onChange={set('length')}
            units={LENGTH_UNITS} unit={f.lengthu} onUnit={set('lengthu')}
            hint={text.fields.length.hint}
          />
        </section>

        {/* ---------- Orta: Ana sonuç ---------- */}
        {/* İç `r.ok &&` kapısı gerekli: children JSX'i ResultPanel çizmese de
            burada kurulur — bkz. TraceWidth'teki aynı not. */}
        <ResultPanel r={r} reason={text.reasonText}>
          {r.ok && (
            <>
              <div className="big-result">
                <div className="label">{text.bigLabel}</div>
                <div className="value">{fmtEng(r.critical, 'm', 4)}</div>
                <div className="alt">
                  {text.bigAltCriterion} {text.divisorShort(r.divisor)} &nbsp;·&nbsp;
                  t&apos;_pd = {fmt(r.tpdPsPerMm, 4)} ps/mm
                </div>
              </div>

              {status && <span className={`status ${status.cls}`}>{status.text}</span>}

              <p className="method-note">{text.methodNote}</p>
              <p className="method-note">{text.legacyMethodNote}</p>
              <p className="method-note">{text.levelSourceNote}</p>

              <table className="result-table">
                <tbody>
                  <tr>
                    <td>{text.table.criticalSelected}</td>
                    <td>{fmtEng(r.critical, 'm', 5)}</td>
                  </tr>
                  {r.byDivisor.map((b) => (
                    <tr key={b.divisor}>
                      <td>{text.table.criticalWith(b.divisor)}</td>
                      <td>{fmtEng(b.critical, 'm', 5)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td>{text.table.tpd}</td>
                    <td>{fmt(r.tpdPsPerMm, 5)} ps/mm</td>
                  </tr>
                  <tr>
                    <td>{text.table.riseTime}</td>
                    <td>{fmtEng(r.tr, 's', 5)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.fBW}</td>
                    <td>{fmtEng(r.bw.fBW, 'Hz', 5)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.k}</td>
                    <td>{fmt(r.bw.k, 3)}</td>
                  </tr>
                  {epsEffRows(r.eps, fmt, lang).map((row) => (
                    <tr key={row.label}>
                      <td>{row.label}</td>
                      <td>{row.value}</td>
                    </tr>
                  ))}

                  {r.hasLength && (
                    <>
                      <tr>
                        <td>{text.table.length}</td>
                        <td>{fmtEng(r.length, 'm', 5)}</td>
                      </tr>
                      <tr>
                        <td>{text.table.delay}</td>
                        <td>{fmtEng(r.delay, 's', 5)}</td>
                      </tr>
                      <tr>
                        <td>{text.table.delayFraction}</td>
                        <td>{fmt(r.delayFraction, 5)}</td>
                      </tr>
                      <tr>
                        <td>{text.table.ratio}</td>
                        <td>{fmt(r.ratio, 5)}</td>
                      </tr>
                      <tr>
                        <td>{text.table.transmissionLine}</td>
                        <td>
                          {r.transmissionLine
                            ? text.table.transmissionLineYes
                            : text.table.transmissionLineNo}
                        </td>
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

          <pre className="formula">{text.formula}</pre>

          {r.ok && (
            <ul className="detail-list">
              <li>{text.detail.epsSource(r.eps)}</li>
              <li>{text.detail.sqrtEps(fmt(Math.sqrt(r.eps.epsEff), 5))}</li>
              <li>{text.detail.divisorScale}</li>
              <li>{text.detail.sharedTpd}</li>
              <li>{text.detail.fbwInfo}</li>
              <li>{text.detail.noRounding}</li>
            </ul>
          )}

          <h2 className="section">{ui.validity}</h2>
          <ul className="detail-list">
            {text.validity.map((line, i) => (
              <li key={i}>
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
                ...s.series.map((ser, i) => ({
                  label: text.chart.criterionLegend(ser.divisor),
                  tone: toneClass(i),
                  kind: 'line',
                })),
                ...s.refs.map(() => ({ label: text.chart.lengthLegend, tone: 'tone-muted', kind: 'line' })),
              ]}
            />

            <LineChart
              ref={chartRef}
              xScale="log"
              xLabel={text.chart.x}
              yLabel={text.chart.y}
              series={chartSeries}
              refLines={s.refs.map((ref) => ({
                key: ref.key,
                y: ref.y,
                label: text.chart.lengthRef(ref.y),
              }))}
              marker={{ ...s.marker, label: text.chart.operatingPoint }}
              formatX={(v) => fmtEng(v, '', 3).replace(' ', '')}
              formatY={(v) => fmt(v, 3)}
              caption={text.chart.caption}
            />

            <ChartDataTable
              xLabel={text.chart.x}
              series={chartSeries}
              every={6}
              formatX={(v) => fmtEng(v, 's', 4)}
              formatY={(v) => `${fmt(v, 4)} mm`}
            />
          </>
        ) : (
          <p className="empty-note">{ui.chartNeedsInput}</p>
        )}
      </section>

      <ReportDialog section={reportSection} schematicRef={schematicRef} chartRef={chartRef} />
      <SaveToProject
        toolKey="critical-length"
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
