import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import NumberField from '../../../components/NumberField'
import Segmented from '../../../components/Segmented'
import LineChart, { ChartLegend, ChartDataTable, toneClass } from '../../../components/LineChart'
import ReportDialog from '../../../components/ReportDialog'
import SaveToProject from '../../../components/SaveToProject'
import useToolForm from '../../../hooks/useToolForm'
import useSavedCalculation from '../../../hooks/useSavedCalculation'
import { useLang } from '../../../hooks/useLang'
import { commonText } from '../../../data/uiText'
import { fmt } from '../../../lib/num'
import TemperatureSchematic from './schematic'
import {
  INITIAL_FORM, MODES, MODE_DELTA, UNITS, SWEEP_PARAMS, SWEEP_F, SWEEP_K,
  compute, buildSweep,
} from './model'
import { getText } from './text'
import { buildReportSection } from './report'

const MARK = { ok: '✓', warn: '!', danger: '×' }
const LEVEL_RANK = { ok: 0, warn: 1, danger: 2 }

// Sıcaklık dört anlamlı basamakta okunaksız kalır (298.2 K gibi)
const SIG = 6

export default function TemperatureConverter() {
  const { f, set, patch } = useToolForm(INITIAL_FORM)

  // Kaydedilmiş hesabı geri yükler (?hesap=<id>) ve ekranı o kayda bağlar;
  // SaveToProject bağlı kayda yeni satır açmak yerine üzerine yazar.
  const saved = useSavedCalculation({
    toolKey: 'temp-conv', initialForm: INITIAL_FORM, patch,
  })
  const [sweep, setSweep] = useState(SWEEP_F)
  const { lang } = useLang()

  const text = useMemo(() => getText(lang), [lang])
  const ui = useMemo(() => commonText(lang), [lang])

  const r = useMemo(() => compute(f, text.fieldLabels), [f, text])
  const s = useMemo(() => buildSweep(r, sweep), [r, sweep])
  const notes = useMemo(() => text.commentary(r), [r, text])

  // Rapor bölümü SVG'siz kurulur; ReportDialog indirme anında canlı DOM'dan
  // (aşağıdaki ref'ler) şematik ve grafiği okuyup satır içine çevirir.
  const reportSection = useMemo(() => buildReportSection({ f, r, s, text }), [f, r, s, text])
  const schematicRef = useRef(null)
  const chartRef = useRef(null)

  const status = useMemo(() => {
    if (!r.ok || notes.length === 0) return null
    const worst = notes.reduce((acc, n) => (LEVEL_RANK[n.level] > LEVEL_RANK[acc] ? n.level : acc), 'ok')
    const count = notes.filter((n) => n.level === worst).length
    if (worst === 'ok') return { cls: 'ok', text: ui.statusOk }
    if (worst === 'warn') return { cls: 'warn', text: ui.statusWarn(count) }
    return { cls: 'danger', text: ui.statusDanger(count) }
  }, [r, notes, ui])

  const isDelta = f.mode === MODE_DELTA

  // Başlıkta girişin kendi ölçeği tekrar edilmez; diğer iki ölçek öne çıkar.
  const others = r.ok ? r.scales.filter((x) => x.unit !== r.unit) : []

  const seriesName = s
    ? (s.mode === MODE_DELTA
      ? (s.param === SWEEP_K ? 'ΔT_K' : 'ΔT_F')
      : (s.param === SWEEP_K ? 'T_K' : 'T_F'))
    : ''
  const chartSeries = s
    ? [{ key: 'scale', name: seriesName, tone: toneClass(0), points: s.points }]
    : []

  return (
    <>
      {/* 1) BAŞLIK */}
      <Link className="backlink" to="/kategori/donusturucular">{text.backlink}</Link>

      <div className="tool-header">
        <h1>{text.title}</h1>
        <p>{text.intro}</p>
      </div>

      {/* 2) ÜÇ PANEL */}
      <div className="tool-grid">
        {/* ---------- Sol: Girdiler ---------- */}
        <section className="panel">
          <h2>{ui.inputs}</h2>

          <TemperatureSchematic ref={schematicRef} r={r} text={text.schematic} />

          <Segmented
            value={f.mode}
            onChange={set('mode')}
            options={MODES.map((m) => ({ value: m, label: text.modeLabel[m] }))}
          />

          <NumberField
            label={isDelta ? text.fields.deltaLabel : text.fields.absLabel}
            value={f.T} onChange={set('T')}
            units={UNITS} unit={f.Tu} onUnit={set('Tu')}
            hint={isDelta ? text.fields.deltaHint : text.fields.absHint}
          />

          {isDelta && (
            <NumberField
              label={text.fields.ambLabel}
              value={f.amb} onChange={set('amb')}
              units={UNITS} unit={f.ambu} onUnit={set('ambu')}
              hint={text.fields.ambHint}
            />
          )}
        </section>

        {/* ---------- Orta: Sonuç ---------- */}
        <section className="panel">
          <h2>{ui.result}</h2>

          {!r.ok ? (
            r.ambiguous ? (
              <p className="empty-note warn">{ui.thousandsNote(r.ambiguous)}</p>
            ) : (
              <p className="empty-note">{text.reasonText(r.reason)}</p>
            )
          ) : (
            <>
              <div className="big-result">
                <div className="label">{text.bigLabel[r.mode]}</div>
                <div className="value">{fmt(others[0].value, SIG)} {others[0].unit}</div>
                <div className="alt">
                  {fmt(others[1].value, SIG)} {others[1].unit}
                  &nbsp;·&nbsp; {text.inputWord} {fmt(r.input, SIG)} {r.unit}
                </div>
              </div>

              {status && <span className={`status ${status.cls}`}>{status.text}</span>}

              <table className="result-table">
                <tbody>
                  <tr className="mini-head">
                    <td>{text.table.head[r.mode]}</td>
                    <td>{text.table.threeScales}</td>
                  </tr>
                  {r.scales.map((x) => (
                    <tr key={x.unit}>
                      <td>
                        {r.mode === MODE_DELTA
                          ? text.deltaScaleLabel[x.unit]
                          : text.scaleLabel[x.unit]}
                      </td>
                      <td>{fmt(x.value, SIG)} {x.unit}</td>
                    </tr>
                  ))}
                  {r.mode !== MODE_DELTA && (
                    <tr>
                      <td>{text.table.margin}</td>
                      <td>
                        {fmt(r.temp.marginK, SIG)} K{' '}
                        <span className="sub">{text.table.marginSub}</span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {r.mode === MODE_DELTA && r.final && (
                <>
                  <h2 className="section">{text.rise.heading}</h2>
                  <table className="result-table">
                    <tbody>
                      <tr className="mini-head">
                        <td>{text.rise.pointCol}</td>
                        <td>{text.rise.scalesCol}</td>
                      </tr>
                      <tr>
                        <td>{text.rise.ambient}</td>
                        <td>
                          {fmt(r.final.ambient.C, SIG)} · {fmt(r.final.ambient.F, SIG)} · {fmt(r.final.ambient.K, SIG)}
                        </td>
                      </tr>
                      <tr>
                        <td>{text.rise.delta}</td>
                        <td>
                          {fmt(r.delta.dC, SIG)} · {fmt(r.delta.dF, SIG)} · {fmt(r.delta.dK, SIG)}{' '}
                          <span className="sub">{text.rise.deltaSub}</span>
                        </td>
                      </tr>
                      <tr>
                        <td>{text.rise.final}</td>
                        <td>
                          {fmt(r.final.C, SIG)} · {fmt(r.final.F, SIG)} · {fmt(r.final.K, SIG)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </>
              )}

              {r.mode !== MODE_DELTA && (
                <>
                  <h2 className="section">{text.refs.heading}</h2>
                  <table className="result-table">
                    <tbody>
                      <tr className="mini-head">
                        <td>{text.refs.pointCol}</td>
                        <td>{text.refs.scalesCol}</td>
                      </tr>
                      {r.refs.map((p) => (
                        <tr key={p.key}>
                          <td>{text.refPointLabel[p.key]}</td>
                          <td>{fmt(p.C, SIG)} · {fmt(p.F, SIG)} · {fmt(p.K, SIG)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}

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

          <pre className="formula">{text.formula}</pre>

          {r.ok && (
            <ul className="detail-list">
              <li>{text.detail.input(r)}</li>
              <li>{text.detail.preserve}</li>
              <li>{r.mode === MODE_DELTA ? text.detail.deltaRule : text.detail.absZeroCheck}</li>
              <li>{text.detail.noRounding}</li>
            </ul>
          )}

          <h2 className="section">{ui.sources}</h2>
          <ul className="detail-list">
            {text.sourceNotes.map((n) => <li key={n}>{n}</li>)}
          </ul>

          <h2 className="section">{ui.validity}</h2>
          <ul className="detail-list">
            {text.validity.map((n) => <li key={n}>{n}</li>)}
          </ul>
        </section>
      </div>

      {/* 3) ALT: Parametrik grafik */}
      <section className="panel panel-chart">
        <div className="chart-head">
          <h2>{ui.chart}</h2>
          <Segmented
            value={sweep}
            onChange={setSweep}
            options={SWEEP_PARAMS.map((p) => ({ value: p, label: text.sweepLabel[p] }))}
          />
        </div>

        {s ? (
          <>
            <ChartLegend
              items={[
                { label: seriesName, tone: toneClass(0), kind: 'line' },
                ...s.refs.map((ref) => ({
                  label: text.chart.refLabel(ref.y, ref.unit), tone: 'tone-muted', kind: 'line',
                })),
              ]}
            />

            <LineChart
              ref={chartRef}
              xScale="linear"
              xLabel={text.chart.x(s.mode)}
              yLabel={text.chart.y(s.mode, s.param)}
              series={chartSeries}
              refLines={s.refs.map((ref) => ({
                key: ref.key, y: ref.y, label: text.chart.refLabel(ref.y, ref.unit),
              }))}
              marker={s.marker ? { ...s.marker, label: text.chart.marker } : null}
              formatX={(v) => fmt(v, 5)}
              formatY={(v) => fmt(v, 5)}
              caption={text.chart.caption(s.mode, s.param)}
            />

            <ChartDataTable
              xLabel={text.chart.x(s.mode)}
              series={chartSeries}
              every={5}
              formatX={(v) => `${fmt(v, 5)} °C`}
              formatY={(v) => `${fmt(v, 5)} ${s.param === SWEEP_K ? 'K' : '°F'}`}
            />
          </>
        ) : (
          <p className="empty-note">{ui.chartNeedsInput}</p>
        )}
      </section>

      <ReportDialog section={reportSection} schematicRef={schematicRef} chartRef={chartRef} />
      <SaveToProject
        toolKey="temp-conv"
        toolMode={f.mode}
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
