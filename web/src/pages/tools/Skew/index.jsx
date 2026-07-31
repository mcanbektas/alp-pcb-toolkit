import { useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import NumberField from '../../../components/NumberField'
import Segmented from '../../../components/Segmented'
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
import SkewSchematic from './schematic'
import { INITIAL_FORM, LAYERS, LAYER_DIFFERENT, compute, buildSweep } from './model'
import { getText } from './text'
import { buildReportSection } from './report'

export default function Skew() {
  const { f, set, patch } = useToolForm(INITIAL_FORM)

  // Kaydedilmiş hesabı geri yükler (?hesap=<id>) ve ekranı o kayda bağlar;
  // SaveToProject bağlı kayda yeni satır açmak yerine üzerine yazar.
  const saved = useSavedCalculation({
    toolKey: 'skew', initialForm: INITIAL_FORM, patch,
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
    ? [
      { key: 'skew', name: text.chart.seriesSkew, tone: toneClass(0), points: s.points },
      ...(s.differentLayer
        ? [{ key: 'same', name: text.chart.seriesSame, tone: toneClass(1), points: s.samePoints }]
        : []),
    ]
    : []

  return (
    <>
      <Link className="backlink" to="/kategori/sinyal-butunlugu">{text.backlink}</Link>

      <ToolHeader title={text.title} intro={text.intro} />

      <div className="tool-grid">
        {/* ---------- Sol: Girdiler ---------- */}
        <section className="panel">
          <h2>{ui.inputs}</h2>

          <SkewSchematic ref={schematicRef} r={r} text={text.schematic} />

          <EpsEffFields f={f} set={set} />

          <Segmented
            value={f.layer}
            onChange={set('layer')}
            options={LAYERS.map((x) => ({ value: x, label: text.layerLabel[x] }))}
          />

          {f.layer === LAYER_DIFFERENT && (
            <NumberField
              label={text.fields.epsEffN.label}
              value={f.epsEffN} onChange={set('epsEffN')}
              units={['']} unit="" onUnit={() => {}}
              hint={text.fields.epsEffN.hint}
            />
          )}

          <NumberField
            label={text.fields.lengthP.label}
            value={f.lengthP} onChange={set('lengthP')}
            units={['mm', 'cm', 'm', 'mil', 'inch']} unit={f.lengthPu} onUnit={set('lengthPu')}
          />

          <NumberField
            label={text.fields.lengthN.label}
            value={f.lengthN} onChange={set('lengthN')}
            units={['mm', 'cm', 'm', 'mil', 'inch']} unit={f.lengthNu} onUnit={set('lengthNu')}
          />

          <NumberField
            label={text.fields.skewMax.label}
            value={f.skewMax} onChange={set('skewMax')}
            units={['ps', 'ns']} unit={f.skewMaxu} onUnit={set('skewMaxu')}
            hint={text.fields.skewMax.hint}
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
                <div className="value">{fmtEng(r.skew, 's', 4)}</div>
                <div className="alt">
                  ΔL = {fmtEng(r.deltaL, 'm', 4)} &nbsp;·&nbsp;{' '}
                  {r.addTo === null
                    ? text.delaysEqual
                    : text.longerLine(r.longer)}
                </div>
              </div>

              {status && <span className={`status ${status.cls}`}>{status.text}</span>}

              <p className="method-note">{text.methodNote}</p>
              <p className="method-note">{text.specNote}</p>

              <table className="result-table">
                <tbody>
                  <tr>
                    <td>{text.table.skew}</td>
                    <td>{fmtEng(r.skew, 's', 5)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.deltaL}</td>
                    <td>{fmtEng(r.deltaL, 'm', 5)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.delayP}</td>
                    <td>{fmtEng(r.delayP, 's', 5)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.delayN}</td>
                    <td>{fmtEng(r.delayN, 's', 5)}</td>
                  </tr>
                  <tr>
                    <td>t_pd (P)</td>
                    <td>{fmt(r.tpdPsPerMmP, 5)} ps/mm</td>
                  </tr>
                  <tr>
                    <td>t_pd (N)</td>
                    <td>{fmt(r.tpdPsPerMmN, 5)} ps/mm</td>
                  </tr>
                  <tr>
                    <td>{text.table.sameLayer}</td>
                    <td>{r.sameLayer ? text.yes : text.no}</td>
                  </tr>
                  <tr>
                    <td>{text.table.skewMax}</td>
                    <td>{fmtEng(r.skewMax, 's', 5)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.maxDeltaL}</td>
                    <td>{fmtEng(r.maxDeltaL, 'm', 5)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.addLength}</td>
                    <td>
                      {fmtEng(r.addLength, 'm', 5)}
                      {r.addTo ? text.table.addTarget(r.addTo) : ''}
                    </td>
                  </tr>
                  {r.differentLayer && (
                    <tr>
                      <td>{text.table.epsEffN}</td>
                      <td>{fmt(r.epsEffN, 5)}</td>
                    </tr>
                  )}
                  {r.differentLayer && Number.isFinite(r.sameEpsSkew) && (
                    <tr>
                      <td>{text.table.sameEpsSkew}</td>
                      <td>{fmtEng(r.sameEpsSkew, 's', 5)}</td>
                    </tr>
                  )}
                  {epsEffRows(r.eps, fmt, lang).map((row) => (
                    <tr key={row.label}>
                      <td>{row.label}</td>
                      <td>{row.value}</td>
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
              <li>{text.detail.epsSource(r.eps)}</li>
              <li>{text.detail.sameLayer(r.sameLayer)}</li>
              <li>{text.detail.maxDeltaL}</li>
              <li>{text.detail.addLength}</li>
              <li>{text.detail.budgetAlways}</li>
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
        </div>

        {s ? (
          <>
            <ChartLegend
              items={[
                { label: text.chart.seriesSkew, tone: toneClass(0), kind: 'line' },
                ...(s.differentLayer
                  ? [{ label: text.chart.seriesSame, tone: toneClass(1), kind: 'line' }]
                  : []),
                { label: text.chart.budgetLegend, tone: 'tone-muted', kind: 'line' },
              ]}
            />

            <LineChart
              ref={chartRef}
              xScale="linear"
              xLabel={text.chart.x}
              yLabel={text.chart.y}
              series={chartSeries}
              refLines={s.refs.map((ref) => ({
                key: ref.key,
                y: ref.y,
                label: text.chart.budgetRef(ref.y),
              }))}
              marker={{ ...s.marker, label: text.chart.operatingPoint }}
              formatX={(v) => fmt(v, 3)}
              formatY={(v) => fmt(v, 3)}
              caption={text.chart.caption}
            />

            <ChartDataTable
              xLabel={text.chart.x}
              series={chartSeries}
              every={6}
              formatX={(v) => `${fmt(v, 4)} mm`}
              formatY={(v) => `${fmt(v, 4)} ps`}
            />
          </>
        ) : (
          <p className="empty-note">{ui.chartNeedsInput}</p>
        )}
      </section>

      <ReportDialog section={reportSection} schematicRef={schematicRef} chartRef={chartRef} />
      <SaveToProject
        toolKey="skew"
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
