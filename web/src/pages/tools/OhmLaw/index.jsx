import { useMemo, useRef } from 'react'
import LangLink from '../../../components/LangLink'
import NumberField from '../../../components/NumberField'
import SelectField from '../../../components/SelectField'
import TextField from '../../../components/TextField'
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
import {
  INITIAL_FORM, TOOLS, TOOL_OHM, TOOL_COMBO,
  COMBO_SERIES, COMBO_PARALLEL,
  REASON_VALUE_LIST,
  compute, buildSweep,
} from './model'
import { getText } from './text'
import { buildReportSection } from './report'

export default function OhmLaw() {
  const { f, set, patch } = useToolForm(INITIAL_FORM)

  // Kaydedilmiş hesabı geri yükler (?hesap=<id>) ve ekranı o kayda bağlar;
  // SaveToProject bağlı kayda yeni satır açmak yerine üzerine yazar.
  const saved = useSavedCalculation({
    toolKey: 'ohm-law', initialForm: INITIAL_FORM, patch,
  })
  const { lang } = useLang()

  const text = useMemo(() => getText(lang), [lang])
  const ui = useMemo(() => commonText(lang), [lang])

  const r = useMemo(() => compute(f.tool, f, text.fieldLabels), [f, text])
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

  const chartMeta = s ? text.chart[s.kind] : null
  const chartSeries = s
    ? [{ key: 'main', name: chartMeta.y, tone: toneClass(0), points: s.points }]
    : []

  return (
    <>
      <LangLink className="backlink" to="/kategori/komponent">{text.backlink}</LangLink>

      <ToolHeader title={text.title} intro={text.intro} />

      <div className="tool-grid">
        {/* ---------- Sol: Girdiler ---------- */}
        <section className="panel">
          <h2>{ui.inputs}</h2>

          <CircuitSchematic ref={schematicRef} r={r} form={f} text={text.schematic} />

          <SelectField
            label={text.fields.tool}
            value={f.tool} onChange={set('tool')}
            options={TOOLS.map((x) => ({ value: x, label: text.toolLabel[x] }))}
          />

          {f.tool === TOOL_OHM && (
            <>
              <p className="method-note">{text.ohmNote}</p>
              <NumberField
                label={text.fields.V.label}
                value={f.V} onChange={set('V')}
                units={['V', 'mV', 'kV']} unit={f.Vu} onUnit={set('Vu')}
                placeholder={text.fields.blankPlaceholder}
              />
              <NumberField
                label={text.fields.I.label}
                value={f.I} onChange={set('I')}
                units={['A', 'mA', 'µA']} unit={f.Iu} onUnit={set('Iu')}
                placeholder={text.fields.blankPlaceholder}
              />
              <NumberField
                label={text.fields.R.label}
                value={f.R} onChange={set('R')}
                units={['Ω', 'kΩ', 'MΩ']} unit={f.Ru} onUnit={set('Ru')}
                placeholder={text.fields.blankPlaceholder}
              />
              <NumberField
                label={text.fields.P.label}
                value={f.P} onChange={set('P')}
                units={['W', 'mW', 'kW']} unit={f.Pu} onUnit={set('Pu')}
                placeholder={text.fields.blankPlaceholder}
              />
            </>
          )}

          {f.tool === TOOL_COMBO && (
            <>
              <SelectField
                label={text.fields.combo}
                value={f.combo} onChange={set('combo')}
                options={[
                  { value: COMBO_PARALLEL, label: text.comboLabel[COMBO_PARALLEL] },
                  { value: COMBO_SERIES, label: text.comboLabel[COMBO_SERIES] },
                ]}
              />
              <TextField
                label={text.fields.values.label}
                value={f.values} onChange={set('values')}
                hint={text.fields.values.hint}
              />
            </>
          )}
        </section>

        {/* ---------- Orta: Ana sonuç ---------- */}
        {/* İç `r.ok &&` kapısı gerekli: children JSX'i ResultPanel çizmese de
            burada kurulur — bkz. TraceWidth'teki aynı not. */}
        <ResultPanel
          r={r}
          reason={(code) => (code === REASON_VALUE_LIST
            ? text.valueListError(r.valueList, r.at)
            : text.reasonText(code))}
        >
          {r.ok && (
            <>
              {r.tool === TOOL_OHM && (
                <>
                  <div className="big-result">
                    <div className="label">{text.big.ohmLabel}</div>
                    <div className="value">{fmtPow(r.P, 4)}</div>
                    <div className="alt">
                      V = {fmtVolt(r.V)} &nbsp;·&nbsp; I = {fmtAmp(r.I)} &nbsp;·&nbsp; R = {fmtRes(r.R)}
                    </div>
                  </div>
                  {status && <span className={`status ${status.cls}`}>{status.text}</span>}
                  <table className="result-table">
                    <tbody>
                      <tr><td>{text.table.voltage}</td><td>{fmtVolt(r.V)}</td></tr>
                      <tr><td>{text.table.current}</td><td>{fmtAmp(r.I)}</td></tr>
                      <tr><td>{text.table.resistance}</td><td>{fmtRes(r.R)}</td></tr>
                      <tr><td>{text.table.power}</td><td>{fmtPow(r.P)}</td></tr>
                      {r.inconsistency != null && (
                        <tr>
                          <td>{text.table.inconsistency}</td>
                          <td>{text.pct(fmt(r.inconsistency * 100, 3))}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </>
              )}

              {r.tool === TOOL_COMBO && (
                <>
                  <div className="big-result">
                    <div className="label">{text.big.comboLabel(r.combo)}</div>
                    <div className="value">{fmtRes(r.equivalent, 4)}</div>
                    <div className="alt">
                      {text.big.comboAlt(
                        r.values.length,
                        fmtRes(r.nearestE24.value, 4),
                        text.pct(fmtPct(r.nearestE24.errorPct)),
                      )}
                    </div>
                  </div>
                  {status && <span className={`status ${status.cls}`}>{status.text}</span>}
                  <table className="result-table">
                    <tbody>
                      <tr className="mini-head">
                        <td>{text.table.shareHead}</td>
                        <td>
                          {r.combo === COMBO_SERIES
                            ? text.table.shareSeries
                            : text.table.shareParallel}
                        </td>
                      </tr>
                      {r.values.map((x, i) => (
                        <tr key={`${x}-${i}`}>
                          <td>{fmtRes(x, 4)}</td>
                          <td>{text.pct(fmt(r.shares[i] * 100, 3))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}

              <Commentary items={notes} />
            </>
          )}
        </ResultPanel>

        {/* ---------- Sağ: Teknik detay ---------- */}
        <section className="panel panel-detail">
          <h2>{ui.technicalDetail}</h2>

          <pre className="formula">{text.formula[f.tool]}</pre>

          {r.ok && r.tool === TOOL_OHM && (
            <ul className="detail-list">
              {text.detail.ohm(r).map((line) => <li key={line}>{line}</li>)}
            </ul>
          )}

          <h2 className="section">{ui.validity}</h2>
          <ul className="detail-list">
            {text.validity[f.tool].map((a) => <li key={a}>{a}</li>)}
            <li>{text.validity.approximate}</li>
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
                { label: chartMeta.y, tone: toneClass(0), kind: 'line' },
              ]}
            />

            <LineChart
              ref={chartRef}
              xScale="log"
              xLabel={chartMeta.x}
              yLabel={chartMeta.y}
              series={chartSeries}
              marker={{ ...s.marker, label: text.chart.marker }}
              formatX={(v) => fmtEng(v, '', 3).replace(' ', '')}
              formatY={(v) => fmt(v, 3)}
              caption={chartMeta.caption}
            />

            <ChartDataTable
              xLabel={chartMeta.x}
              series={chartSeries}
              every={6}
              formatX={(v) => fmtEng(v, '', 4)}
              formatY={(v) => fmt(v, 4)}
            />
          </>
        ) : (
          <p className="empty-note">
            {f.tool === TOOL_COMBO ? text.chart.comboNote : ui.chartNeedsInput}
          </p>
        )}
      </section>

      <ReportDialog section={reportSection} schematicRef={schematicRef} chartRef={chartRef} />
      <SaveToProject
        toolKey="ohm-law"
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
