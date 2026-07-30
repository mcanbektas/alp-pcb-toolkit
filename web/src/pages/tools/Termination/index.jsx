import { Fragment, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import NumberField from '../../../components/NumberField'
import SelectField from '../../../components/SelectField'
import Segmented from '../../../components/Segmented'
import LineChart, { ChartLegend, ChartDataTable, toneClass } from '../../../components/LineChart'
import ReportDialog from '../../../components/ReportDialog'
import SaveToProject from '../../../components/SaveToProject'
import useToolForm from '../../../hooks/useToolForm'
import { statusChip, worstLevel, countAtLevel } from '../../../lib/statusChip'
import useSavedCalculation from '../../../hooks/useSavedCalculation'
import { useLang } from '../../../hooks/useLang'
import { commonText } from '../../../data/uiText'
import { fmt, fmtRes, fmtPct, fmtVolt, fmtAmp, fmtWatt } from '../../../lib/num'
import TerminationSchematic from './schematic'
import {
  INITIAL_FORM, TERM_TYPES, TERM_SERIES, TERM_PARALLEL, TERM_THEVENIN,
  THEVENIN_ESERIES_OPTIONS,
  compute, buildSweep,
} from './model'
import { getText } from './text'
import { buildReportSection } from './report'

const MARK = { ok: '✓', warn: '!', danger: '×' }
const VOLT_UNITS = ['V', 'mV', 'kV']

// Bulgu listesi iki yerde kullanılır: sonuç varken ve seri terminasyonun
// geçersiz kaldığı durumda (hesap yok ama gerekçe danger seviyesinde yazılır).
// Başlık ortak metinden gelir, bu yüzden prop olarak taşınır.
function Commentary({ heading, notes }) {
  if (notes.length === 0) return null
  return (
    <>
      <h2 className="section">{heading}</h2>
      <ul className="commentary">
        {notes.map((n) => (
          <li key={n.text} className={n.level}>
            <span className="mark" aria-hidden="true">{MARK[n.level]}</span>
            <span>{n.text}</span>
          </li>
        ))}
      </ul>
    </>
  )
}

export default function Termination() {
  const [type, setType] = useState(TERM_SERIES)
  const { f, set, patch } = useToolForm(INITIAL_FORM)

  // Kaydedilmiş hesabı geri yükler (?hesap=<id>) ve ekranı o kayda bağlar;
  // SaveToProject bağlı kayda yeni satır açmak yerine üzerine yazar.
  const saved = useSavedCalculation({
    toolKey: 'termination', initialForm: INITIAL_FORM, patch, setMode: setType,
  })
  const { lang } = useLang()

  const text = useMemo(() => getText(lang), [lang])
  const ui = useMemo(() => commonText(lang), [lang])

  const r = useMemo(() => compute(type, f, text.fieldLabels), [type, f, text])
  const s = useMemo(() => buildSweep(r), [r])
  const notes = useMemo(() => text.commentary(r), [r, text])

  // Rapor bölümü SVG'siz kurulur; ReportDialog indirme anında canlı DOM'dan
  // (aşağıdaki ref'ler) şematik ve grafiği okuyup satır içine çevirir.
  const reportSection = useMemo(
    () => buildReportSection({
      type, f, r, s, text,
    }),
    [type, f, r, s, text],
  )
  const schematicRef = useRef(null)
  const chartRef = useRef(null)

  // Durum çipi tek kurala bağlıdır: bulguların en kötü seviyesi gösterilir.
  const status = useMemo(() => {
    if (notes.length === 0) return null
    const levels = notes.map((n) => n.level)
    const worst = worstLevel(levels)
    return statusChip(worst, countAtLevel(levels, worst), ui)
  }, [notes, ui])

  const meta = text.chart[type]
  const chartSeries = s
    ? s.series.map((serie, i) => ({
        key: serie.key,
        name: meta.names[serie.key],
        tone: toneClass(i),
        points: serie.points,
      }))
    : []

  const isPower = type === TERM_PARALLEL
  const formatValue = (v) => (isPower ? fmtWatt(v) : fmtRes(v, 4))

  return (
    <>
      <Link className="backlink" to="/kategori/sinyal-butunlugu">{text.backlink}</Link>

      <div className="tool-header">
        <h1>{text.title}</h1>
        <p>{text.intro}</p>
      </div>

      <div className="tool-grid">
        {/* ---------- Sol: Girdiler ---------- */}
        <section className="panel">
          <h2>{ui.inputs}</h2>

          <TerminationSchematic ref={schematicRef} r={r} text={text.schematic} />

          <Segmented
            value={type}
            onChange={setType}
            options={TERM_TYPES.map((x) => ({ value: x, label: text.typeLabel[x] }))}
          />

          <NumberField
            label={text.fields.Z0.label}
            value={f.Z0} onChange={set('Z0')}
            units={['Ω']} unit="Ω" onUnit={() => {}}
            hint={text.fields.Z0.hint}
          />

          {type === TERM_SERIES && (
            <NumberField
              label={text.fields.Rdriver.label}
              value={f.Rdriver} onChange={set('Rdriver')}
              units={['Ω']} unit="Ω" onUnit={() => {}}
              hint={text.fields.Rdriver.hint}
            />
          )}

          {type === TERM_PARALLEL && (
            <>
              <NumberField
                label={text.fields.V.label}
                value={f.V} onChange={set('V')}
                units={VOLT_UNITS} unit={f.Vu} onUnit={set('Vu')}
                hint={text.fields.V.hint}
              />
              <NumberField
                label={text.fields.duty.label}
                value={f.duty} onChange={set('duty')}
                units={['%']} unit="%" onUnit={() => {}}
                hint={text.fields.duty.hint}
              />
            </>
          )}

          {type === TERM_THEVENIN && (
            <>
              <NumberField
                label={text.fields.Vcc.label}
                value={f.Vcc} onChange={set('Vcc')}
                units={VOLT_UNITS} unit={f.Vccu} onUnit={set('Vccu')}
              />
              <NumberField
                label={text.fields.Vbias.label}
                value={f.Vbias} onChange={set('Vbias')}
                units={VOLT_UNITS} unit={f.Vbiasu} onUnit={set('Vbiasu')}
                hint={text.fields.Vbias.hint}
              />
              <SelectField
                label={text.fields.eseries.label}
                value={f.eseries} onChange={set('eseries')}
                options={THEVENIN_ESERIES_OPTIONS.map((x) => ({ value: x, label: x }))}
                hint={text.fields.eseries.hint}
              />
            </>
          )}
        </section>

        {/* ---------- Orta: Ana sonuç ---------- */}
        <section className="panel">
          <h2>{ui.result}</h2>

          {!r.ok ? (
            <>
              {r.ambiguous ? (
                <p className="empty-note warn">{ui.thousandsNote(r.ambiguous)}</p>
              ) : (
                <p className="empty-note">
                  {text.reasonText(r.reason)}
                  {r.invalid && r.invalid.length > 0 && text.invalidFields(r.invalid)}
                </p>
              )}

              {status && <span className={`status ${status.cls}`}>{status.text}</span>}
              <Commentary heading={ui.commentary} notes={notes} />
            </>
          ) : (
            <>
              <div className="big-result">
                <div className="label">
                  {r.type === TERM_SERIES && text.bigLabel[TERM_SERIES]}
                  {r.type === TERM_PARALLEL && text.bigLabel[TERM_PARALLEL]}
                  {r.type === TERM_THEVENIN && text.bigLabel[TERM_THEVENIN](r.series)}
                </div>
                <div className="value">
                  {r.type === TERM_SERIES && fmtRes(r.Rs, 4)}
                  {r.type === TERM_PARALLEL && fmtRes(r.RT, 4)}
                  {r.type === TERM_THEVENIN
                    && `${fmtRes(r.standard.Rtop, 3)} / ${fmtRes(r.standard.Rbottom, 3)}`}
                </div>
                <div className="alt">
                  {r.type === TERM_SERIES && (r.std
                    ? (
                      <>
                        {text.bigAlt.seriesNearest(r.eseries, fmtRes(r.std.value, 4))}
                        &nbsp;·&nbsp; {text.bigAlt.seriesSource(fmtRes(r.withStandard, 4))}
                      </>
                    )
                    : text.bigAlt.seriesMatched)}
                  {r.type === TERM_PARALLEL && (
                    <>
                      {text.bigAlt.parallelDc(fmtWatt(r.Pdc))}
                      &nbsp;·&nbsp; {text.bigAlt.parallelAvg(fmtWatt(r.Pavg))}
                    </>
                  )}
                  {r.type === TERM_THEVENIN && (
                    <>
                      {text.bigAlt.theveninPar(fmtRes(r.standard.Rpar, 4), text.pct(fmtPct(r.standard.zErr)))}
                      &nbsp;·&nbsp;{' '}
                      {text.bigAlt.theveninBias(fmtVolt(r.standard.bias), text.pct(fmtPct(r.standard.vErr)))}
                    </>
                  )}
                </div>
              </div>

              {status && <span className={`status ${status.cls}`}>{status.text}</span>}

              <p className="method-note">{text.methodNote}</p>
              {r.type === TERM_SERIES && <p className="method-note">{text.seriesEseriesNote}</p>}
              {r.type === TERM_THEVENIN && <p className="method-note">{text.theveninIdcNote}</p>}

              <table className="result-table">
                <tbody>
                  {r.type === TERM_SERIES && (
                    <>
                      <tr>
                        <td>{text.table.Rs}</td>
                        <td>{fmtRes(r.Rs, 5)}</td>
                      </tr>
                      {r.nearest.map((n, i) => (
                        <tr key={n.value}>
                          <td>{text.table.nearest(r.eseries, i + 1)}</td>
                          <td>{fmtRes(n.value, 4)} <span className="sub">({text.pct(fmtPct(n.errorPct))})</span></td>
                        </tr>
                      ))}
                      <tr>
                        <td>{text.table.withStandard}</td>
                        <td>
                          {r.withStandard != null ? fmtRes(r.withStandard, 5) : text.none}
                          {r.stdErrPct != null && (
                            <span className="sub"> ({text.pct(fmtPct(r.stdErrPct))})</span>
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td>{text.table.total}</td>
                        <td>{fmtRes(r.total, 5)}</td>
                      </tr>
                      <tr>
                        <td>{text.table.Rdriver}</td>
                        <td>{fmtRes(r.Rdriver, 5)}</td>
                      </tr>
                      <tr>
                        <td>{text.table.Z0}</td>
                        <td>{fmtRes(r.Z0, 5)}</td>
                      </tr>
                    </>
                  )}

                  {r.type === TERM_PARALLEL && (
                    <>
                      <tr>
                        <td>{text.table.RT}</td>
                        <td>{fmtRes(r.RT, 5)}</td>
                      </tr>
                      <tr>
                        <td>{text.table.IdcParallel}</td>
                        <td>{fmtAmp(r.Idc, 5)}</td>
                      </tr>
                      <tr>
                        <td>{text.table.PdcParallel}</td>
                        <td>{fmtWatt(r.Pdc)}</td>
                      </tr>
                      <tr>
                        <td>{text.table.Pavg}</td>
                        <td>{fmtWatt(r.Pavg)}</td>
                      </tr>
                      <tr>
                        <td>{text.table.duty}</td>
                        <td>{text.pct(fmt(r.duty * 100, 4))}</td>
                      </tr>
                      <tr>
                        <td>{text.table.V}</td>
                        <td>{fmtVolt(r.V)}</td>
                      </tr>
                      <tr>
                        <td>{text.table.Z0}</td>
                        <td>{fmtRes(r.Z0, 5)}</td>
                      </tr>
                    </>
                  )}

                  {r.type === TERM_THEVENIN && (
                    <>
                      <tr>
                        <td>{text.table.idealRtop}</td>
                        <td>{fmtRes(r.ideal.Rtop, 5)}</td>
                      </tr>
                      <tr>
                        <td>{text.table.idealRbottom}</td>
                        <td>{fmtRes(r.ideal.Rbottom, 5)}</td>
                      </tr>
                      <tr>
                        <td>{text.table.biasRatio}</td>
                        <td>{fmt(r.ideal.a, 5)}</td>
                      </tr>
                      <tr>
                        <td>{text.table.standardPair}</td>
                        <td>{fmtRes(r.standard.Rtop, 4)} / {fmtRes(r.standard.Rbottom, 4)}</td>
                      </tr>
                      <tr>
                        <td>{text.table.Rpar}</td>
                        <td>{fmtRes(r.standard.Rpar, 5)}</td>
                      </tr>
                      <tr>
                        <td>{text.table.zErr}</td>
                        <td>{text.pct(fmtPct(r.standard.zErr))}</td>
                      </tr>
                      <tr>
                        <td>{text.table.bias}</td>
                        <td>{fmtVolt(r.standard.bias)}</td>
                      </tr>
                      <tr>
                        <td>{text.table.vErr}</td>
                        <td>{text.pct(fmtPct(r.standard.vErr))}</td>
                      </tr>
                      <tr>
                        <td>{text.table.Idc}</td>
                        <td>{fmtAmp(r.Idc, 5)}</td>
                      </tr>
                      <tr>
                        <td>{text.table.Pdc}</td>
                        <td>{fmtWatt(r.Pdc)}</td>
                      </tr>
                      <tr>
                        <td>{text.table.eseries}</td>
                        <td>{r.series}</td>
                      </tr>
                      <tr>
                        <td>{text.table.Z0}</td>
                        <td>{fmtRes(r.Z0, 5)}</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>

              <Commentary heading={ui.commentary} notes={notes} />
            </>
          )}
        </section>

        {/* ---------- Sağ: Teknik detay ---------- */}
        <section className="panel panel-detail">
          <h2>{ui.technicalDetail}</h2>

          <pre className="formula">{text.formula}</pre>

          <ul className="detail-list">
            <li>{text.typeNote[type]}</li>

            {r.ok && r.type === TERM_SERIES && (
              <>
                <li>{text.detail.seriesEngine(r.eseries)}</li>
                <li>
                  {text.detail.seriesTotals(
                    fmtRes(r.total, 5),
                    r.withStandard != null ? fmtRes(r.withStandard, 5) : text.none,
                  )}
                </li>
              </>
            )}

            {r.ok && r.type === TERM_PARALLEL && (
              <>
                <li>{text.detail.parallelFreedom}</li>
                <li>{text.detail.parallelDuty}</li>
              </>
            )}

            {r.ok && r.type === TERM_THEVENIN && (
              <>
                <li>{text.detail.theveninSearch(r.series)}</li>
                <li>{text.detail.theveninIdeal}</li>
              </>
            )}

            <li>{text.detail.devThresholds}</li>
            <li>{text.detail.noRounding}</li>
          </ul>

          <h2 className="section">{ui.validity}</h2>
          <ul className="detail-list">
            {text.validity.map((item, i) => (
              <li key={i}>
                {item.strong && <><strong>{item.strong}</strong>{' '}</>}
                {item.text}
                {/* Vurgu cümlenin ortasındaysa madde sıralı parçalarla gelir. */}
                {item.parts && item.parts.map((part, j) => (
                  part.strong
                    ? <strong key={j}>{part.strong}</strong>
                    : <Fragment key={j}>{part.text}</Fragment>
                ))}
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
                ...chartSeries.map((serie) => ({
                  label: serie.name, tone: serie.tone, kind: 'line',
                })),
                ...s.refs.map((ref) => ({
                  label: text.chart.refLabel[ref.key], tone: 'tone-muted', kind: 'line',
                })),
              ]}
            />

            <LineChart
              ref={chartRef}
              xScale="linear"
              xLabel={meta.x}
              yLabel={meta.y}
              series={chartSeries}
              refLines={s.refs.map((ref) => ({
                key: ref.key, y: ref.y, label: text.chart.refLabel[ref.key],
              }))}
              marker={{ ...s.marker, label: text.chart.operatingPoint }}
              formatX={(v) => fmt(v, 3)}
              formatY={(v) => fmt(v, 3)}
              caption={meta.caption}
            />

            <ChartDataTable
              xLabel={meta.x}
              series={chartSeries}
              every={6}
              formatX={(v) => `${fmt(v, 4)} Ω`}
              formatY={formatValue}
            />
          </>
        ) : (
          <p className="empty-note">{ui.chartNeedsInput}</p>
        )}
      </section>

      <ReportDialog section={reportSection} schematicRef={schematicRef} chartRef={chartRef} />
      <SaveToProject
        toolKey="termination"
        toolMode={type}
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
