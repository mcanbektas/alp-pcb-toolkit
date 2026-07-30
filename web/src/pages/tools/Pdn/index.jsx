import { useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import NumberField from '../../../components/NumberField'
import SelectField from '../../../components/SelectField'
import Segmented from '../../../components/Segmented'
import RowList from '../../../components/RowList'
import LineChart, { ChartLegend, ChartDataTable, toneClass } from '../../../components/LineChart'
import ReportDialog from '../../../components/ReportDialog'
import SaveToProject from '../../../components/SaveToProject'
import useToolForm from '../../../hooks/useToolForm'
import { statusChip, worstLevel, countAtLevel } from '../../../lib/statusChip'
import useSavedCalculation from '../../../hooks/useSavedCalculation'
import { useLang } from '../../../hooks/useLang'
import { commonText } from '../../../data/uiText'
import { fmt, fmtEng, fmtRes, fmtVolt } from '../../../lib/num'
import PdnSchematic from './schematic'
import {
  INITIAL_FORM, SOURCES, SRC_TOLERANCE, TOGGLES, ON,
  capColumnsA, capColumnsB, compute, buildSweep,
} from './model'
import { getText } from './text'
import { buildReportSection } from './report'

const MARK = { ok: '✓', warn: '!', danger: '×' }

export default function Pdn() {
  const { f, set, patch } = useToolForm(INITIAL_FORM)

  // Kaydedilmiş hesabı geri yükler (?hesap=<id>) ve ekranı o kayda bağlar;
  // SaveToProject bağlı kayda yeni satır açmak yerine üzerine yazar.
  const saved = useSavedCalculation({
    toolKey: 'pdn', initialForm: INITIAL_FORM, patch,
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

  const colsA = useMemo(() => capColumnsA(text.capCols), [text])
  const colsB = useMemo(() => capColumnsB(text.capCols), [text])

  const status = useMemo(() => {
    if (!r.ok || notes.length === 0) return null
    const levels = notes.map((n) => n.level)
    const worst = worstLevel(levels)
    return statusChip(worst, countAtLevel(levels, worst), ui)
  }, [r, notes, ui])

  const chartSeries = s
    ? [
        { key: 'pdn', name: text.chart.seriesPdn, tone: toneClass(0), points: s.points },
        ...(s.hasCaps
          ? [{ key: 'caps', name: text.chart.seriesCaps, tone: toneClass(1), points: s.capPoints }]
          : []),
      ]
    : []

  return (
    <>
      <Link className="backlink" to="/kategori/guc-termal">{text.backlink}</Link>

      <div className="tool-header">
        <h1>{text.title}</h1>
        <p>{text.intro}</p>
      </div>

      <div className="tool-grid">
        {/* ---------- Sol: Girdiler ---------- */}
        <section className="panel">
          <h2>{ui.inputs}</h2>

          <PdnSchematic ref={schematicRef} r={r} text={text.schematic} />

          <Segmented
            value={f.source}
            onChange={set('source')}
            options={SOURCES.map((x) => ({ value: x, label: text.sourceLabel[x] }))}
          />

          {f.source === SRC_TOLERANCE ? (
            <>
              <NumberField
                label={text.fields.Vrail.label}
                value={f.Vrail} onChange={set('Vrail')}
                units={['V', 'mV']} unit={f.Vrailu} onUnit={set('Vrailu')}
              />
              <NumberField
                label={text.fields.tolerancePct.label}
                value={f.tolerancePct} onChange={set('tolerancePct')}
                units={['%']} unit="%" onUnit={() => {}}
                hint={text.fields.tolerancePct.hint}
              />
            </>
          ) : (
            <NumberField
              label={text.fields.deltaV.label}
              value={f.deltaV} onChange={set('deltaV')}
              units={['mV', 'V']} unit={f.deltaVu} onUnit={set('deltaVu')}
              hint={text.fields.deltaV.hint}
            />
          )}

          <NumberField
            label={text.fields.deltaI.label}
            value={f.deltaI} onChange={set('deltaI')}
            units={['A', 'mA']} unit={f.deltaIu} onUnit={set('deltaIu')}
            hint={text.fields.deltaI.hint}
          />

          <SelectField
            label={text.fields.curve.label}
            value={f.curve} onChange={set('curve')}
            options={TOGGLES.map((x) => ({ value: x, label: text.toggleLabel[x] }))}
            hint={text.fields.curve.hint}
          />

          {f.curve === ON && (
            <>
              <NumberField
                label={text.fields.fOp.label}
                value={f.fOp} onChange={set('fOp')}
                units={['MHz', 'kHz', 'GHz', 'Hz']} unit={f.fOpu} onUnit={set('fOpu')}
                hint={text.fields.fOp.hint}
              />

              <NumberField
                label={text.fields.vrmR.label}
                value={f.vrmR} onChange={set('vrmR')}
                units={['mΩ', 'Ω']} unit={f.vrmRu} onUnit={set('vrmRu')}
                hint={text.fields.vrmR.hint}
              />
              <NumberField
                label={text.fields.vrmL.label}
                value={f.vrmL} onChange={set('vrmL')}
                units={['nH', 'pH']} unit={f.vrmLu} onUnit={set('vrmLu')}
                hint={text.fields.vrmL.hint}
              />

              <RowList
                label={text.rowList.bankA}
                rows={f.caps}
                columns={colsA}
                onChange={set('caps')}
                rowLabel={text.rowList.rowLabel}
                addLabel={text.rowList.addLabel}
                hint={text.rowList.hintA}
              />

              <RowList
                label={text.rowList.bankB}
                rows={f.caps}
                columns={colsB}
                onChange={set('caps')}
                rowLabel={text.rowList.rowLabel}
                addLabel={text.rowList.addLabel}
                hint={text.rowList.hintB}
              />

              <SelectField
                label={text.fields.plane.label}
                value={f.plane} onChange={set('plane')}
                options={TOGGLES.map((x) => ({ value: x, label: text.toggleLabel[x] }))}
              />

              {f.plane === ON && (
                <>
                  <NumberField
                    label={text.fields.area.label}
                    value={f.area} onChange={set('area')}
                    units={['cm²', 'mm²', 'm²']} unit={f.areau} onUnit={set('areau')}
                  />
                  <NumberField
                    label={text.fields.d.label}
                    value={f.d} onChange={set('d')}
                    units={['mm', 'µm']} unit={f.du} onUnit={set('du')}
                  />
                  <NumberField
                    label={text.fields.epsR.label}
                    value={f.epsR} onChange={set('epsR')}
                    units={['']} unit="" onUnit={() => {}}
                  />
                </>
              )}
            </>
          )}

          <SelectField
            label={text.fields.loop.label}
            value={f.loop} onChange={set('loop')}
            options={TOGGLES.map((x) => ({ value: x, label: text.toggleLabel[x] }))}
            hint={text.fields.loop.hint}
          />

          {f.loop === ON && (
            <>
              <NumberField
                label={text.fields.eslComp.label}
                value={f.eslComp} onChange={set('eslComp')}
                units={['nH', 'pH']} unit={f.eslCompu} onUnit={set('eslCompu')}
              />
              <NumberField
                label={text.fields.Lmount.label}
                value={f.Lmount} onChange={set('Lmount')}
                units={['nH', 'pH']} unit={f.Lmountu} onUnit={set('Lmountu')}
              />
              <NumberField
                label={text.fields.Lvia.label}
                value={f.Lvia} onChange={set('Lvia')}
                units={['nH', 'pH']} unit={f.Lviau} onUnit={set('Lviau')}
              />
              <NumberField
                label={text.fields.Lspread.label}
                value={f.Lspread} onChange={set('Lspread')}
                units={['nH', 'pH']} unit={f.Lspreadu} onUnit={set('Lspreadu')}
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
          ) : (
            <>
              <div className="big-result">
                <div className="label">{text.bigResultLabel}</div>
                <div className="value">{fmtRes(r.Ztarget, 4)}</div>
                <div className="alt">
                  ΔV = {fmtVolt(r.deltaV)} &nbsp;·&nbsp; ΔI = {fmtEng(r.deltaI, 'A', 4)}
                </div>
              </div>

              {status && <span className={`status ${status.cls}`}>{status.text}</span>}

              <p className="method-note">{text.flatTargetNote}</p>
              {r.curve && <p className="method-note">{text.mountingNote}</p>}

              <table className="result-table">
                <tbody>
                  <tr>
                    <td>{text.table.Ztarget}</td>
                    <td>{fmtRes(r.Ztarget, 5)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.deltaV}</td>
                    <td>{fmtVolt(r.deltaV)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.deltaVSource}</td>
                    <td>{r.fromTolerance ? text.table.deltaVFromTol : text.table.deltaVDirect}</td>
                  </tr>
                  <tr>
                    <td>{text.table.deltaI}</td>
                    <td>{fmtEng(r.deltaI, 'A', 5)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.Vrail}</td>
                    <td>{r.Vrail != null ? fmtVolt(r.Vrail) : '—'}</td>
                  </tr>
                  <tr>
                    <td>{text.table.tolerance}</td>
                    <td>{r.tolerancePct != null ? text.pct(fmt(r.tolerancePct, 4)) : '—'}</td>
                  </tr>
                  <tr>
                    <td>{text.table.profile}</td>
                    <td>{r.flatTarget ? text.table.profileNone : '—'}</td>
                  </tr>
                </tbody>
              </table>

              {r.plane && (
                <>
                  <h2 className="section">{text.sections.plane}</h2>
                  <table className="result-table">
                    <tbody>
                      <tr>
                        <td>{text.table.planeC}</td>
                        <td>{fmtEng(r.plane.C, 'F', 5)}</td>
                      </tr>
                      <tr>
                        <td>{text.table.planeArea}</td>
                        <td>{fmt(r.plane.area * 1e4, 4)} cm²</td>
                      </tr>
                      <tr>
                        <td>{text.table.planeD}</td>
                        <td>{fmtEng(r.plane.d, 'm', 4)}</td>
                      </tr>
                      <tr>
                        <td>{text.table.planeEps}</td>
                        <td>{fmt(r.plane.epsR, 4)}</td>
                      </tr>
                      <tr>
                        <td>{text.table.fringing}</td>
                        <td>{r.plane.fringingIncluded ? text.yes : text.no}</td>
                      </tr>
                    </tbody>
                  </table>
                </>
              )}

              {r.loop && (
                <>
                  <h2 className="section">{text.sections.loop}</h2>
                  <table className="result-table">
                    <tbody>
                      <tr>
                        <td>{text.table.loopTotal}</td>
                        <td>{fmtEng(r.loop.total, 'H', 5)}</td>
                      </tr>
                      <tr>
                        <td>{text.table.loopComponent}</td>
                        <td>
                          {fmtEng(r.loop.eslComponent, 'H', 4)}{' '}
                          <span className="sub">({text.pct(fmt(r.loop.shares.component * 100, 3))})</span>
                        </td>
                      </tr>
                      <tr>
                        <td>{text.table.loopMount}</td>
                        <td>
                          {fmtEng(r.loop.Lmount, 'H', 4)}{' '}
                          <span className="sub">({text.pct(fmt(r.loop.shares.mount * 100, 3))})</span>
                        </td>
                      </tr>
                      <tr>
                        <td>{text.table.loopVia}</td>
                        <td>
                          {fmtEng(r.loop.Lvia, 'H', 4)}{' '}
                          <span className="sub">({text.pct(fmt(r.loop.shares.via * 100, 3))})</span>
                        </td>
                      </tr>
                      <tr>
                        <td>{text.table.loopSpread}</td>
                        <td>
                          {fmtEng(r.loop.Lspread, 'H', 4)}{' '}
                          <span className="sub">({text.pct(fmt(r.loop.shares.spread * 100, 3))})</span>
                        </td>
                      </tr>
                      <tr>
                        <td>{text.table.loopDominant}</td>
                        <td>{text.loopTermLabel[r.dominant]}</td>
                      </tr>
                    </tbody>
                  </table>
                </>
              )}

              {r.curve && (
                <>
                  <h2 className="section">{text.sections.curve}</h2>
                  <table className="result-table">
                    <tbody>
                      <tr>
                        <td>{text.table.fOp}</td>
                        <td>{fmtEng(r.curve.fOp, 'Hz', 5)}</td>
                      </tr>
                      <tr>
                        <td>{text.table.zAtFop}</td>
                        <td>{fmtRes(r.curve.z.mag, 5)}</td>
                      </tr>
                      <tr>
                        <td>{text.table.belowTarget}</td>
                        <td>{r.belowTarget ? text.yes : text.no}</td>
                      </tr>
                      <tr>
                        <td>{text.table.capsOnly}</td>
                        <td>{r.curve.z.capsMag != null ? fmtRes(r.curve.z.capsMag, 5) : '—'}</td>
                      </tr>
                      <tr>
                        <td>{text.table.inductiveAtFop}</td>
                        <td>{r.curve.z.inductive ? text.yes : text.no}</td>
                      </tr>
                      <tr>
                        <td>{text.table.worstPoint}</td>
                        <td>
                          {r.curve.sweep.worst ? (
                            <>
                              {fmtRes(r.curve.sweep.worst.mag, 4)}{' '}
                              <span className="sub">@ {fmtEng(r.curve.sweep.worst.f, 'Hz', 3)}</span>
                            </>
                          ) : '—'}
                          {!r.curve.fOpInSweep && (
                            <>
                              {' '}
                              <span className="sub">({text.fopOutsideNote})</span>
                            </>
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td>{text.table.exceedBands}</td>
                        <td>
                          {fmt(r.curve.sweep.bands.length, 2)}{' '}
                          <span className="sub">
                            ({fmt(r.curve.sweep.exceedCount, 3)} / {fmt(r.curve.sweep.total, 3)}{' '}
                            {text.table.pointsWord})
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td>{text.table.loopIncluded}</td>
                        <td>{r.curve.z.mountingIncluded ? text.yes : text.no}</td>
                      </tr>
                      <tr>
                        <td>{text.table.losslessPlane}</td>
                        <td>{r.curve.z.losslessPlane ? text.yes : text.table.noPlane}</td>
                      </tr>
                      <tr>
                        <td>{text.table.capCount}</td>
                        <td>{fmt(r.curve.capCount, 4)} {text.table.pcsWord}</td>
                      </tr>
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
              <li>{text.detail.flat}</li>
              <li>{text.detail.deltaVSource(r.fromTolerance)}</li>
              {r.plane && <li>{text.detail.plane}</li>}
              {r.curve && <li>{text.detail.sweep(r.curve.sweep.total)}</li>}
              {r.curve && <li>{text.detail.vrm(Boolean(r.curve.vrm))}</li>}
              {r.loop && <li>{text.detail.loop}</li>}
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
                { label: text.chart.seriesPdn, tone: toneClass(0), kind: 'line' },
                ...(s.hasCaps
                  ? [{ label: text.chart.seriesCaps, tone: toneClass(1), kind: 'line' }]
                  : []),
                { label: text.chart.legendTarget, tone: 'tone-muted', kind: 'line' },
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
                label: text.chart.refTarget(ref.real),
              }))}
              marker={s.marker ? { ...s.marker, label: text.chart.marker } : null}
              formatX={(v) => fmtEng(v, 'Hz', 3)}
              formatY={(v) => fmtRes(Math.pow(10, v), 3)}
              caption={text.chart.caption}
            />

            <ChartDataTable
              xLabel={text.chart.x}
              series={chartSeries}
              every={8}
              formatX={(v) => fmtEng(v, 'Hz', 3)}
              formatY={(v) => fmtRes(Math.pow(10, v), 4)}
            />
          </>
        ) : (
          <p className="empty-note">{text.chartEmpty}</p>
        )}
      </section>

      <ReportDialog section={reportSection} schematicRef={schematicRef} chartRef={chartRef} />
      <SaveToProject
        toolKey="pdn"
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
