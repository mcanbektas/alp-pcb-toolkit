import { useMemo, useRef } from 'react'
import LangLink from '../../../components/LangLink'
import NumberField from '../../../components/NumberField'
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
import { fmt, fmtEng, fmtRes, fmtAmp, fmtPow, fmtVolt, fmtPct } from '../../../lib/num'
import CircuitSchematic from './schematic'
import { INITIAL_FORM, compute, buildSweep } from './model'
import { getText } from './text'
import { buildReportSection } from './report'

export default function LedResistor() {
  const { f, set, patch } = useToolForm(INITIAL_FORM)

  // Kaydedilmiş hesabı geri yükler (?hesap=<id>) ve ekranı o kayda bağlar;
  // SaveToProject bağlı kayda yeni satır açmak yerine üzerine yazar.
  const saved = useSavedCalculation({
    toolKey: 'led-resistor', initialForm: INITIAL_FORM, patch,
  })
  const { lang } = useLang()

  const text = useMemo(() => getText(lang), [lang])
  const ui = useMemo(() => commonText(lang), [lang])

  const r = useMemo(() => compute(f, text.fieldLabels), [f, text])
  const s = useMemo(() => buildSweep(r), [r])
  const notes = useMemo(() => text.commentary(r), [r, text])

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
    ? [{ key: 'main', name: text.chart.y, tone: toneClass(0), points: s.points }]
    : []

  return (
    <>
      <LangLink className="backlink" to="/kategori/komponent">{text.backlink}</LangLink>

      <ToolHeader title={text.title} intro={text.intro} />

      <div className="tool-grid">
        {/* ---------- Sol: Girdiler ---------- */}
        <section className="panel">
          <h2>{ui.inputs}</h2>

          <CircuitSchematic ref={schematicRef} r={r} text={text.schematic} />

          <NumberField
            label={text.fields.Vs.label}
            value={f.Vs} onChange={set('Vs')}
            units={['V', 'mV']} unit={f.Vsu} onUnit={set('Vsu')}
          />
          <NumberField
            label={text.fields.Vf.label}
            value={f.Vf} onChange={set('Vf')}
            units={['V', 'mV']} unit={f.Vfu} onUnit={set('Vfu')}
            hint={text.fields.Vf.hint}
          />
          <NumberField
            label={text.fields.n.label}
            value={f.n} onChange={set('n')}
            units={[text.fields.countUnit]} unit={text.fields.countUnit} onUnit={() => {}}
          />
          <NumberField
            label={text.fields.Iled.label}
            value={f.Iled} onChange={set('Iled')}
            units={['mA', 'A']} unit={f.Iledu} onUnit={set('Iledu')}
          />
          <NumberField
            label={text.fields.derating.label}
            value={f.derating} onChange={set('derating')}
            units={['%']} unit="%" onUnit={() => {}}
            hint={text.fields.derating.hint}
          />
        </section>

        {/* ---------- Orta: Ana sonuç ---------- */}
        {/* İç `r.ok &&` kapısı gerekli: children JSX'i ResultPanel çizmese de
            burada kurulur — bkz. TraceWidth'teki aynı not. */}
        <ResultPanel
          r={r}
          reason={(code) => text.reasonText(code, r)}
        >
          {r.ok && (
            <>
              <div className="big-result">
                <div className="label">{text.big.ledLabel}</div>
                <div className="value">{fmtRes(r.R, 4)}</div>
                <div className="alt">
                  {text.big.ledAlt(fmtRes(r.e24.value, 4), fmtAmp(r.e24.I, 3))}
                </div>
              </div>
              {status && <span className={`status ${status.cls}`}>{status.text}</span>}
              <table className="result-table">
                <tbody>
                  <tr><td>{text.table.totalLedVoltage}</td><td>{fmtVolt(r.Vled)}</td></tr>
                  <tr><td>{text.table.headroom}</td><td>{fmtVolt(r.headroom)}</td></tr>
                  <tr><td>{text.table.idealResistance}</td><td>{fmtRes(r.R, 5)}</td></tr>
                  <tr><td>{text.table.resistorPower}</td><td>{fmtPow(r.P, 4)}</td></tr>
                  <tr>
                    <td>{text.table.ratedPower}</td>
                    <td>
                      {fmtPow(r.Prated, 4)}{' '}
                      <span className="sub">
                        {text.table.utilisation(text.pct(fmt(r.derating * 100, 3)))}
                      </span>
                    </td>
                  </tr>
                  <tr className="mini-head">
                    <td>{text.table.standardHead}</td>
                    <td>{text.table.standardHeadSub}</td>
                  </tr>
                  <tr>
                    <td>E24</td>
                    <td>
                      {fmtRes(r.e24.value, 4)} · {fmtAmp(r.e24.I, 3)} ·{' '}
                      {text.pct(fmtPct((100 * (r.e24.I - r.targetI)) / r.targetI))}
                    </td>
                  </tr>
                  <tr>
                    <td>E96</td>
                    <td>
                      {fmtRes(r.e96.value, 4)} · {fmtAmp(r.e96.I, 3)} ·{' '}
                      {text.pct(fmtPct((100 * (r.e96.I - r.targetI)) / r.targetI))}
                    </td>
                  </tr>
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
              {text.detail.led(r).map((line) => <li key={line}>{line}</li>)}
            </ul>
          )}

          <h2 className="section">{ui.validity}</h2>
          <ul className="detail-list">
            {text.validity.map((a) => <li key={a}>{a}</li>)}
            <li>{text.validityApproximate}</li>
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
                { label: text.chart.y, tone: toneClass(0), kind: 'line' },
                ...s.refs.map(() => ({
                  label: text.chart.targetLegend,
                  tone: 'tone-muted',
                  kind: 'line',
                })),
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
                label: text.chart.targetRef(fmtAmp(ref.y, 3)),
              }))}
              marker={{ ...s.marker, label: text.chart.marker }}
              formatX={(v) => fmtEng(v, '', 3).replace(' ', '')}
              formatY={(v) => fmt(v, 3)}
              caption={text.chart.caption}
            />

            <ChartDataTable
              xLabel={text.chart.x}
              series={chartSeries}
              every={6}
              formatX={(v) => fmtEng(v, '', 4)}
              formatY={(v) => fmt(v, 4)}
            />
          </>
        ) : (
          <p className="empty-note">{ui.chartNeedsInput}</p>
        )}
      </section>

      <ReportDialog section={reportSection} schematicRef={schematicRef} chartRef={chartRef} />
      <SaveToProject
        toolKey="led-resistor"
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
