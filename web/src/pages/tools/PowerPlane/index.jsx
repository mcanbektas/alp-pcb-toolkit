import { useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import NumberField from '../../../components/NumberField'
import SelectField from '../../../components/SelectField'
import RowList from '../../../components/RowList'
import LineChart, { ChartLegend, ChartDataTable, toneClass } from '../../../components/LineChart'
import ReportDialog from '../../../components/ReportDialog'
import SaveToProject from '../../../components/SaveToProject'
import useToolForm from '../../../hooks/useToolForm'
import { statusChip, worstLevel, countAtLevel } from '../../../lib/statusChip'
import useSavedCalculation from '../../../hooks/useSavedCalculation'
import { useLang } from '../../../hooks/useLang'
import { commonText } from '../../../data/uiText'
import { fmt, fmtEng, fmtOhm, fmtAmp, fmtVolt, fmtPow } from '../../../lib/num'
import { OZ_TABLE } from '../../../lib/traceCalc'
import PlaneSchematic from './schematic'
import {
  INITIAL_FORM, TOOLS, TOOL_PLANE,
  traceColumns, compute, buildSweep,
} from './model'
import { getText } from './text'
import { buildReportSection } from './report'

const MARK = { ok: '✓', warn: '!', danger: '×' }

export default function PowerPlane() {
  const { f, set, patch } = useToolForm(INITIAL_FORM)

  // Kaydedilmiş hesabı geri yükler (?hesap=<id>) ve ekranı o kayda bağlar;
  // SaveToProject bağlı kayda yeni satır açmak yerine üzerine yazar.
  const saved = useSavedCalculation({
    toolKey: 'power-plane', initialForm: INITIAL_FORM, patch,
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

  const isPlane = f.tool === TOOL_PLANE
  const chartMeta = s ? text.chart[s.kind] : null
  const chartSeries = s
    ? [{ key: 'main', name: chartMeta.y, tone: toneClass(0), points: s.points }]
    : []

  return (
    <>
      <Link className="backlink" to="/kategori/akim-guc-bakir">{text.backlink}</Link>

      <div className="tool-header">
        <h1>{text.title}</h1>
        <p>{text.intro}</p>
      </div>

      <div className="tool-grid">
        {/* ---------- Sol: Girdiler ---------- */}
        <section className="panel">
          <h2>{ui.inputs}</h2>

          <PlaneSchematic ref={schematicRef} r={r} form={f} text={text.schematic} />

          <SelectField
            label={text.fields.tool.label}
            value={f.tool} onChange={set('tool')}
            options={TOOLS.map((x) => ({ value: x, label: text.toolLabel[x] }))}
          />

          <NumberField
            label={text.fields.I.label}
            value={f.I} onChange={set('I')}
            units={['A', 'mA']} unit={f.Iu} onUnit={set('Iu')}
          />

          {isPlane ? (
            <>
              <NumberField
                label={text.fields.L.label}
                value={f.L} onChange={set('L')}
                units={['mm', 'cm', 'mil', 'inch']} unit={f.Lu} onUnit={set('Lu')}
                hint={text.fields.L.hint}
              />
              <NumberField
                label={text.fields.Wavg.label}
                value={f.Wavg} onChange={set('Wavg')}
                units={['mm', 'mil']} unit={f.Wavgu} onUnit={set('Wavgu')}
              />
              <NumberField
                label={text.fields.Wneck.label}
                value={f.Wneck} onChange={set('Wneck')}
                units={['mm', 'mil']} unit={f.Wnecku} onUnit={set('Wnecku')}
                hint={text.fields.Wneck.hint}
              />
            </>
          ) : (
            <RowList
              label={text.rowList.label}
              rows={f.traces}
              columns={traceColumns(text.fieldLabels)}
              onChange={set('traces')}
              rowLabel={text.fieldLabels.rowLabel}
              addLabel={text.rowList.addLabel}
              hint={text.rowList.hint}
            />
          )}

          <SelectField
            label={text.fields.oz.label}
            value={f.oz} onChange={set('oz')}
            options={OZ_TABLE.map((o) => ({
              value: o.key,
              label: o.key === 'custom' ? text.fields.ozCustom : o.label,
            }))}
          />

          {f.oz === 'custom' && (
            <NumberField
              label={text.fields.tCustom.label}
              value={f.tCustom} onChange={set('tCustom')}
              units={['µm']} unit="µm" onUnit={() => {}}
            />
          )}

          <SelectField
            label={text.fields.layer.label}
            value={f.layer} onChange={set('layer')}
            options={[
              { value: 'external', label: text.fields.layerExternal },
              { value: 'internal', label: text.fields.layerInternal },
            ]}
          />

          <NumberField
            label={text.fields.T.label}
            value={f.T} onChange={set('T')}
            units={['°C']} unit="°C" onUnit={() => {}}
            hint={text.fields.T.hint}
          />

          <NumberField
            label={text.fields.Vs.label}
            value={f.Vs} onChange={set('Vs')}
            units={['V', 'mV']} unit={f.Vsu} onUnit={set('Vsu')}
            hint={text.fields.Vs.hint}
          />
        </section>

        {/* ---------- Orta: Ana sonuç ---------- */}
        <section className="panel">
          <h2>{ui.result}</h2>

          {!r.ok ? (
            r.ambiguous ? (
              <p className="empty-note warn">{ui.thousandsNote(r.ambiguous)}</p>
            ) : (
              <p className="empty-note">{text.reasonText(r.reason, r)}</p>
            )
          ) : isPlane ? (
            <>
              <div className="big-result">
                <div className="label">{text.bigResultPlane}</div>
                <div className="value">{fmtOhm(r.neck.R)}</div>
                <div className="alt">
                  {text.bigResultPlaneAlt(fmtOhm(r.average.R), fmt(r.neckFactor, 3))}
                </div>
              </div>

              {status && <span className={`status ${status.cls}`}>{status.text}</span>}

              <table className="result-table">
                <tbody>
                  <tr className="mini-head">
                    <td>{text.planeTable.geometry}</td>
                    <td>{text.planeTable.geometryCols}</td>
                  </tr>
                  <tr>
                    <td>{text.planeTable.resistance}</td>
                    <td>{fmtOhm(r.neck.R)} · {fmtOhm(r.average.R)}</td>
                  </tr>
                  <tr>
                    <td>{text.planeTable.squares}</td>
                    <td>{fmt(r.neck.squares, 3)} · {fmt(r.average.squares, 3)}</td>
                  </tr>
                  <tr>
                    <td>{text.planeTable.vdrop}</td>
                    <td>{fmtVolt(r.neck.Vdrop)} · {fmtVolt(r.average.Vdrop)}</td>
                  </tr>
                  <tr>
                    <td>{text.planeTable.ploss}</td>
                    <td>{fmtPow(r.neck.Ploss, 3)} · {fmtPow(r.average.Ploss, 3)}</td>
                  </tr>
                  <tr>
                    <td>{text.planeTable.density}</td>
                    <td>{fmt(r.neck.J / 1e6, 3)} · {fmt(r.average.J / 1e6, 3)} A/mm²</td>
                  </tr>
                  {r.neck.pct != null && (
                    <tr>
                      <td>{text.planeTable.supplyShare}</td>
                      <td>{text.pct(fmt(r.neck.pct, 3))} · {text.pct(fmt(r.average.pct, 3))}</td>
                    </tr>
                  )}
                  <tr>
                    <td>{text.planeTable.sheet}</td>
                    <td>{fmtOhm(r.Rsheet)}/□</td>
                  </tr>
                  <tr>
                    <td>{text.planeTable.neckCapacity}</td>
                    <td>
                      {fmtAmp(r.neckCapacity, 3)}{' '}
                      <span className="sub">
                        {text.planeTable.utilisation(fmt(r.neckUtil * 100, 3))}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>

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
          ) : (
            <>
              <div className="big-result">
                <div className="label">{text.bigResultParallel}</div>
                <div className="value">{fmtOhm(r.Req)}</div>
                <div className="alt">
                  {text.bigResultParallelAlt(r.branches.length, fmtVolt(r.Vdrop))}
                  {r.pct != null && <> ({text.pct(fmt(r.pct, 3))})</>}
                </div>
              </div>

              {status && <span className={`status ${status.cls}`}>{status.text}</span>}

              <table className="pick-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>{text.branchCols.resistance}</th>
                    <th>{text.branchCols.current}</th>
                    <th>{text.branchCols.share}</th>
                    <th>{text.branchCols.capacity}</th>
                    <th>{text.branchCols.utilisation}</th>
                  </tr>
                </thead>
                <tbody>
                  {r.branches.map((b, i) => (
                    <tr key={i} className={b === r.worst ? 'on' : ''}>
                      <td>{i + 1}</td>
                      <td>{fmtOhm(b.R)}</td>
                      <td>{fmtAmp(b.I, 3)}</td>
                      <td>{text.pct(fmt(b.share * 100, 3))}</td>
                      <td>{fmtAmp(b.capacity, 3)}</td>
                      <td>
                        {text.pct(fmt(b.util * 100, 3))}
                        {b.util > 1 && <span className="flag"> !</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <table className="result-table">
                <tbody>
                  <tr>
                    <td>{text.parallelTable.totalLoss}</td>
                    <td>{fmtPow(r.Ploss, 3)}</td>
                  </tr>
                  <tr>
                    <td>{text.parallelTable.equalShare}</td>
                    <td>
                      {text.pct(fmt(r.equalShare * 100, 3))} ·{' '}
                      {fmtAmp(r.I / r.branches.length, 3)}
                    </td>
                  </tr>
                  <tr>
                    <td>{text.parallelTable.equivalentW}</td>
                    <td>{fmtEng(r.equivalentW, 'm', 3)}</td>
                  </tr>
                  <tr>
                    <td>{text.parallelTable.totalWidth}</td>
                    <td>{fmtEng(r.totalWidth, 'm', 3)}</td>
                  </tr>
                </tbody>
              </table>

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

          <pre className="formula">{text.formula[f.tool]}</pre>

          {r.ok && (
            <ul className="detail-list">
              <li>
                {text.detail.sheet(
                  fmtEng(r.t, 'm', 3),
                  fmtOhm(r.Rsheet ?? r.branches[0].Rsheet),
                  fmt(r.T, 3),
                )}
              </li>
              {isPlane && <li>{text.detail.neckRatio(fmt(r.average.W / r.neck.W, 3))}</li>}
              {!isPlane && <li>{text.detail.share}</li>}
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
                { label: chartMeta.y, tone: toneClass(0), kind: 'line' },
                ...s.refs.map((ref) => ({
                  label: text.chartRefLegend[ref.key],
                  tone: 'tone-muted',
                  kind: 'line',
                })),
              ]}
            />

            <LineChart
              ref={chartRef}
              xScale={isPlane ? 'log' : 'linear'}
              xLabel={chartMeta.x}
              yLabel={chartMeta.y}
              series={chartSeries}
              refLines={s.refs.map((ref) => ({
                key: ref.key,
                y: ref.y,
                label: text.chartRefLabel[ref.key](ref.y),
              }))}
              marker={{ ...s.marker, label: text.chartMarker[f.tool] }}
              formatX={(v) => fmt(v, 3)}
              formatY={(v) => fmtEng(v, '', 3)}
              caption={chartMeta.caption}
            />

            <ChartDataTable
              xLabel={chartMeta.x}
              series={chartSeries}
              every={isPlane ? 6 : 1}
              formatX={(v) => (isPlane ? `${fmt(v, 3)} mm` : `${fmt(v, 2)} ${text.branchUnit}`)}
              formatY={(v) => fmtOhm(v)}
            />
          </>
        ) : (
          <p className="empty-note">{ui.chartNeedsInput}</p>
        )}
      </section>

      <ReportDialog section={reportSection} schematicRef={schematicRef} chartRef={chartRef} />
      <SaveToProject
        toolKey="power-plane"
        toolMode={f.tool}
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
