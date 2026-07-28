import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import NumberField from '../../../components/NumberField'
import SelectField from '../../../components/SelectField'
import Segmented from '../../../components/Segmented'
import Formula from '../../../components/Formula'
import LineChart, { ChartLegend, ChartDataTable, toneClass } from '../../../components/LineChart'
import useToolForm from '../../../hooks/useToolForm'
import { useLang } from '../../../hooks/useLang'
import { commonText } from '../../../data/uiText'
import { fmt, fmtEng, fmtOhm, fmtAmp, fmtVolt, fmtPow, fmtRes } from '../../../lib/num'
import ViaSchematic from './schematic'
import {
  INITIAL_FORM, MODE_ANALYSIS, MODE_SYNTHESIS, BASIS_DRILL, BASIS_FINISHED,
  compute, buildSweep,
} from './model'
import { getText } from './text'

const MARK = { ok: '✓', warn: '!', danger: '×' }
const LEVEL_RANK = { ok: 0, warn: 1, danger: 2 }

const DIA_UNITS = ['mm', 'µm', 'mil']

export default function ViaProperties() {
  const [mode, setMode] = useState(MODE_ANALYSIS)
  const { f, set } = useToolForm(INITIAL_FORM)
  const { lang } = useLang()

  const text = useMemo(() => getText(lang), [lang])
  const ui = useMemo(() => commonText(lang), [lang])

  const r = useMemo(() => compute(mode, f, text.fieldLabels), [mode, f, text])
  const s = useMemo(() => buildSweep(r), [r])
  const notes = useMemo(() => text.commentary(r), [r, text])

  const status = useMemo(() => {
    if (!r.ok || notes.length === 0) return null
    const worst = notes.reduce((acc, n) => (LEVEL_RANK[n.level] > LEVEL_RANK[acc] ? n.level : acc), 'ok')
    const count = notes.filter((n) => n.level === worst).length
    if (worst === 'ok') return { cls: 'ok', text: ui.statusOk }
    if (worst === 'warn') return { cls: 'warn', text: ui.statusWarn(count) }
    return { cls: 'danger', text: ui.statusDanger(count) }
  }, [r, notes, ui])

  const chartSeries = s
    ? [{ key: 'vdrop', name: text.chart.seriesDrop, tone: toneClass(0), points: s.points }]
    : []

  return (
    <>
      <Link className="backlink" to="/kategori/via-padstack">{text.backlink}</Link>

      <div className="tool-header">
        <h1>{text.title}</h1>
        <p>{text.intro}</p>
      </div>

      <div className="tool-grid">
        {/* ---------- Sol: Girdiler ---------- */}
        <section className="panel">
          <h2>{ui.inputs}</h2>

          <ViaSchematic r={r} text={text.schematic} />

          <Segmented
            value={mode}
            onChange={setMode}
            options={[
              { value: MODE_ANALYSIS, label: text.modeAnalysis },
              { value: MODE_SYNTHESIS, label: text.modeSynthesis },
            ]}
          />

          <NumberField
            label={text.fields.Df.label}
            value={f.Df} onChange={set('Df')}
            units={DIA_UNITS} unit={f.Dfu} onUnit={set('Dfu')}
          />
          <NumberField
            label={text.fields.tp.label}
            value={f.tp} onChange={set('tp')}
            units={DIA_UNITS} unit={f.tpu} onUnit={set('tpu')}
            hint={text.fields.tp.hint}
          />
          <NumberField
            label={text.fields.H.label}
            value={f.H} onChange={set('H')}
            units={DIA_UNITS} unit={f.Hu} onUnit={set('Hu')}
          />
          <NumberField
            label={text.fields.I.label}
            value={f.I} onChange={set('I')}
            units={['A', 'mA']} unit={f.Iu} onUnit={set('Iu')}
          />
          <NumberField
            label={text.fields.T.label}
            value={f.T} onChange={set('T')}
            units={['°C']} unit="°C" onUnit={() => {}}
          />

          {mode === MODE_SYNTHESIS && (
            <>
              <NumberField
                label={text.fields.VdropMax.label}
                value={f.VdropMax} onChange={set('VdropMax')}
                units={['mV', 'V']} unit={f.VdropMaxu} onUnit={set('VdropMaxu')}
              />
              <NumberField
                label={text.fields.IsingleMax.label}
                value={f.IsingleMax} onChange={set('IsingleMax')}
                units={['A', 'mA']} unit={f.IsingleMaxu} onUnit={set('IsingleMaxu')}
                hint={text.fields.IsingleMax.hint}
              />
              <NumberField
                label={text.fields.Nmin.label}
                value={f.Nmin} onChange={set('Nmin')}
                units={[text.countUnit]} unit={text.countUnit} onUnit={() => {}}
              />
            </>
          )}

          <h2 className="section">{text.sections.padstack}</h2>
          <NumberField
            label={text.fields.Dpad.label}
            value={f.Dpad} onChange={set('Dpad')}
            units={DIA_UNITS} unit={f.Dpadu} onUnit={set('Dpadu')}
          />
          <NumberField
            label={text.fields.Ddrill.label}
            value={f.Ddrill} onChange={set('Ddrill')}
            units={DIA_UNITS} unit={f.Ddrillu} onUnit={set('Ddrillu')}
            hint={text.fields.Ddrill.hint}
          />
          <NumberField
            label={text.fields.posTol.label}
            value={f.posTol} onChange={set('posTol')}
            units={DIA_UNITS} unit={f.posTolu} onUnit={set('posTolu')}
          />
          <NumberField
            label={text.fields.etchTol.label}
            value={f.etchTol} onChange={set('etchTol')}
            units={DIA_UNITS} unit={f.etchTolu} onUnit={set('etchTolu')}
          />
          <SelectField
            label={text.fields.basis.label}
            value={f.basis} onChange={set('basis')}
            options={[
              { value: BASIS_DRILL, label: text.fields.basis.drill },
              { value: BASIS_FINISHED, label: text.fields.basis.finished },
            ]}
          />

          <h2 className="section">{text.sections.parasitics}</h2>
          <NumberField
            label={text.fields.Dantipad.label}
            value={f.Dantipad} onChange={set('Dantipad')}
            units={DIA_UNITS} unit={f.Dantipadu} onUnit={set('Dantipadu')}
          />
          <NumberField
            label={text.fields.epsR.label}
            value={f.epsR} onChange={set('epsR')}
            units={['']} unit="" onUnit={() => {}}
            hint={text.fields.epsR.hint}
          />
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
                <div className="label">
                  {r.mode === MODE_SYNTHESIS ? text.bigResult.synthesis : text.bigResult.analysis}
                </div>
                <div className="value">
                  {r.mode === MODE_SYNTHESIS ? r.N : fmtOhm(r.R)}
                </div>
                <div className="alt">
                  {r.mode === MODE_SYNTHESIS
                    ? <>{text.bigResult.drop} {fmtVolt(r.VdropParallel)} &nbsp;·&nbsp; {text.bigResult.perVia} {fmtAmp(r.IperVia, 3)}</>
                    : <>{text.bigResult.drop} {fmtVolt(r.Vdrop)} &nbsp;·&nbsp; {text.bigResult.loss} {fmtPow(r.Ploss, 3)}</>}
                </div>
              </div>

              {status && <span className={`status ${status.cls}`}>{status.text}</span>}

              <table className="result-table">
                <tbody>
                  <tr>
                    <td>{text.table.Do}</td>
                    <td>{fmtEng(r.Do, 'm', 4)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.area}</td>
                    <td>
                      {fmt(r.area * 1e6, 4)} mm²{' '}
                      <span className="sub">({text.table.thinApprox} {fmt(r.thinApprox * 1e6, 4)})</span>
                    </td>
                  </tr>
                  <tr>
                    <td>{text.table.resistanceAt(r.T)}</td>
                    <td>{fmtOhm(r.R)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.vdrop}</td>
                    <td>{fmtVolt(r.Vdrop)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.ploss}</td>
                    <td>{fmtPow(r.Ploss, 4)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.density}</td>
                    <td>{fmt(r.J / 1e6, 4)} A/mm²</td>
                  </tr>
                </tbody>
              </table>

              {r.mode === MODE_SYNTHESIS && (
                <>
                  <h2 className="section">{text.sections.parallelVia}</h2>
                  <table className="result-table">
                    <tbody>
                      <tr>
                        <td>{text.table.fromCurrent}</td>
                        <td>{r.Ncurrent} {text.pcsWord}</td>
                      </tr>
                      <tr>
                        <td>{text.table.fromVoltage}</td>
                        <td>{r.Nvoltage} {text.pcsWord}</td>
                      </tr>
                      <tr>
                        <td>{text.table.userMin}</td>
                        <td>{r.limits.Nmin} {text.pcsWord}</td>
                      </tr>
                      <tr>
                        <td>{text.table.deciding}</td>
                        <td>{r.N} {text.pcsWord}</td>
                      </tr>
                      <tr>
                        <td>{text.table.parallelR}</td>
                        <td>{fmtOhm(r.Rparallel)}</td>
                      </tr>
                      <tr>
                        <td>{text.table.totalDropLoss}</td>
                        <td>{fmtVolt(r.VdropParallel)} · {fmtPow(r.PlossParallel, 3)}</td>
                      </tr>
                      <tr>
                        <td>{text.table.perViaCurrent}</td>
                        <td>{fmtAmp(r.IperVia, 3)} · {fmt(r.JperVia / 1e6, 3)} A/mm²</td>
                      </tr>
                    </tbody>
                  </table>
                </>
              )}

              <h2 className="section">{text.sections.padstack}</h2>
              <table className="result-table">
                <tbody>
                  <tr>
                    <td>{text.table.nominalRing}</td>
                    <td>{fmtEng(r.ring.nominal, 'm', 4)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.worstRing}</td>
                    <td>
                      {fmtEng(r.ring.worst, 'm', 4)}
                      {r.ring.breakout && <span className="flag"> !</span>}
                    </td>
                  </tr>
                  <tr>
                    <td>{text.table.aspect}</td>
                    <td>
                      {fmt(r.aspect.ratio, 4)}{' '}
                      <span className="sub">({text.basisLabel[r.aspect.basis]})</span>
                    </td>
                  </tr>
                </tbody>
              </table>

              <h2 className="section">{text.sections.approxParasitics}</h2>
              <table className="result-table">
                <tbody>
                  <tr>
                    <td>{text.table.L}</td>
                    <td>{fmtEng(r.L, 'H', 4)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.C}</td>
                    <td>{fmtEng(r.C, 'F', 4)}</td>
                  </tr>
                  {r.disc && (
                    <>
                      <tr>
                        <td>{text.table.discZ}</td>
                        <td>{fmtRes(r.disc.Z, 4)}</td>
                      </tr>
                      <tr>
                        <td>{text.table.discDelay}</td>
                        <td>{fmtEng(r.disc.delay, 's', 4)}</td>
                      </tr>
                    </>
                  )}
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

          {/* Formüller tam genişlik bölümde — dar panelde satır kırmak gerekiyordu */}

          {r.ok && (
            <ul className="detail-list">
              <li>{text.detail.ratio(r.ratio, r.thinErrorPct)}</li>
              <li>{text.detail.fullAnnulus}</li>
              <li>{text.detail.aspectBasis(r.aspect.basis)}</li>
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
      <section className="formula-wide">
        <h2>{ui.equations}</h2>
        <div className="formula-grid">
          <Formula title={text.formulas.geometry.title}>{text.formulas.geometry.body}</Formula>

          <Formula title={text.formulas.parallel.title}>{text.formulas.parallel.body}</Formula>

          <Formula title={text.formulas.ring.title}>{text.formulas.ring.body}</Formula>

          <Formula title={text.formulas.parasitics.title}>{text.formulas.parasitics.body}</Formula>
        </div>
      </section>

      <section className="panel panel-chart">
        <div className="chart-head">
          <h2>{ui.chart}</h2>
        </div>

        {s ? (
          <>
            <ChartLegend
              items={[
                { label: text.chart.seriesDrop, tone: toneClass(0), kind: 'line' },
                ...s.refs.map(() => ({ label: text.chart.allowedDrop, tone: 'tone-muted', kind: 'line' })),
              ]}
            />

            <LineChart
              xScale="linear"
              xLabel={text.chart.x}
              yLabel={text.chart.y}
              series={chartSeries}
              refLines={s.refs.map((ref) => ({ key: ref.key, y: ref.y, label: text.chart.refLimit(ref.y) }))}
              marker={{ ...s.marker, label: `${r.N} ${text.countUnit}` }}
              formatX={(v) => fmt(v, 3)}
              formatY={(v) => fmtEng(v, '', 3)}
              caption={text.chart.caption}
            />

            <ChartDataTable
              xLabel={text.chart.x}
              series={chartSeries}
              every={2}
              formatX={(v) => `${fmt(v, 2)} ${text.countUnit}`}
              formatY={(v) => fmtVolt(v)}
            />
          </>
        ) : (
          <p className="empty-note">{ui.chartNeedsInput}</p>
        )}
      </section>

    </>
  )
}
