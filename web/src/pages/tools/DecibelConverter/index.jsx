import { useMemo, useRef } from 'react'
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
import { fmt, fmtEng, fmtOhm, fmtVolt } from '../../../lib/num'
import DecibelSchematic from './schematic'
import {
  INITIAL_FORM, MODES, DIRS,
  MODE_POWER, MODE_VOLTAGE, MODE_DBM,
  DIR_FORWARD,
  POWER_UNITS, VOLTAGE_UNITS,
  compute, buildSweep,
} from './model'
import { getText } from './text'
import { buildReportSection } from './report'

const MARK = { ok: '✓', warn: '!', danger: '×' }

export default function DecibelConverter() {
  const { f, set, patch } = useToolForm(INITIAL_FORM)

  // Kaydedilmiş hesabı geri yükler (?hesap=<id>) ve ekranı o kayda bağlar;
  // SaveToProject bağlı kayda yeni satır açmak yerine üzerine yazar.
  const saved = useSavedCalculation({
    toolKey: 'db-conv', initialForm: INITIAL_FORM, patch,
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

  const forward = f.dir === DIR_FORWARD
  const chart = s ? text.chart[s.kind] : null

  const chartSeries = !s
    ? []
    : s.kind === 'dbm'
      ? [{ key: 'dbm', name: chart.series, tone: toneClass(0), points: s.points }]
      : [
          { key: 'power', name: chart.power, tone: toneClass(0), points: s.points },
          { key: 'voltage', name: chart.voltage, tone: toneClass(1), points: s.voltagePoints },
        ]

  return (
    <>
      <Link className="backlink" to="/kategori/donusturucular">{text.backlink}</Link>

      <div className="tool-header">
        <h1>{text.title}</h1>
        <p>{text.intro}</p>
      </div>

      <div className="tool-grid">
        {/* ---------- Sol: Girdiler ---------- */}
        <section className="panel">
          <h2>{ui.inputs}</h2>

          <DecibelSchematic ref={schematicRef} r={r} text={text.schematic} />

          <Segmented
            value={f.mode}
            onChange={set('mode')}
            options={MODES.map((m) => ({ value: m, label: text.modeLabel[m] }))}
          />

          <SelectField
            label={text.fields.dir}
            value={f.dir}
            onChange={set('dir')}
            options={DIRS.map((d) => ({ value: d, label: text.dirLabel[f.mode][d] }))}
          />

          {f.mode === MODE_POWER && forward && (
            <>
              <NumberField
                label={text.fields.P1.label}
                value={f.P1} onChange={set('P1')}
                units={POWER_UNITS} unit={f.P1u} onUnit={set('P1u')}
              />
              <NumberField
                label={text.fields.P2.label}
                value={f.P2} onChange={set('P2')}
                units={POWER_UNITS} unit={f.P2u} onUnit={set('P2u')}
                hint={text.fields.P2.hint}
              />
            </>
          )}

          {f.mode === MODE_POWER && !forward && (
            <>
              <NumberField
                label={text.fields.dB.label}
                value={f.dB} onChange={set('dB')}
                units={['dB']} unit="dB" onUnit={() => {}}
                hint={text.fields.dB.hint}
              />
              <NumberField
                label={text.fields.P1.label}
                value={f.P1} onChange={set('P1')}
                units={POWER_UNITS} unit={f.P1u} onUnit={set('P1u')}
                hint={text.fields.P1Optional.hint}
              />
            </>
          )}

          {f.mode === MODE_VOLTAGE && forward && (
            <>
              <NumberField
                label={text.fields.V1.label}
                value={f.V1} onChange={set('V1')}
                units={VOLTAGE_UNITS} unit={f.V1u} onUnit={set('V1u')}
              />
              <NumberField
                label={text.fields.V2.label}
                value={f.V2} onChange={set('V2')}
                units={VOLTAGE_UNITS} unit={f.V2u} onUnit={set('V2u')}
                hint={text.fields.V2.hint}
              />
            </>
          )}

          {f.mode === MODE_VOLTAGE && !forward && (
            <>
              <NumberField
                label={text.fields.dB.label}
                value={f.dB} onChange={set('dB')}
                units={['dB']} unit="dB" onUnit={() => {}}
                hint={text.fields.dB.hint}
              />
              <NumberField
                label={text.fields.V1.label}
                value={f.V1} onChange={set('V1')}
                units={VOLTAGE_UNITS} unit={f.V1u} onUnit={set('V1u')}
                hint={text.fields.V1Optional.hint}
              />
            </>
          )}

          {f.mode === MODE_DBM && forward && (
            <NumberField
              label={text.fields.P.label}
              value={f.P} onChange={set('P')}
              units={POWER_UNITS} unit={f.Pu} onUnit={set('Pu')}
              hint={text.fields.P.hint}
            />
          )}

          {f.mode === MODE_DBM && !forward && (
            <NumberField
              label={text.fields.dBm.label}
              value={f.dBm} onChange={set('dBm')}
              units={['dBm']} unit="dBm" onUnit={() => {}}
              hint={text.fields.dBm.hint}
            />
          )}

          {f.mode === MODE_DBM && (
            <NumberField
              label={text.fields.Z.label}
              value={f.Z} onChange={set('Z')}
              units={['Ω']} unit="Ω" onUnit={() => {}}
              hint={text.fields.Z.hint}
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
          ) : r.mode === MODE_DBM ? (
            <>
              <div className="big-result">
                <div className="label">{text.bigDbm.label}</div>
                <div className="value">{fmt(r.dBm, 4)} dBm</div>
                <div className="alt">
                  {fmtEng(r.W, 'W', 4)} &nbsp;·&nbsp; {fmt(r.mW, 4)} mW
                  &nbsp;·&nbsp; {text.bigDbm.rms(fmtVolt(r.Vrms), fmtOhm(r.Z))}
                </div>
              </div>

              {status && <span className={`status ${status.cls}`}>{status.text}</span>}

              <table className="result-table">
                <tbody>
                  <tr className="mini-head">
                    <td>{text.dbmTable.head}</td>
                    <td>{text.dbmTable.headSub}</td>
                  </tr>
                  <tr><td>dBm</td><td>{fmt(r.dBm, 5)} dBm</td></tr>
                  <tr>
                    <td>{text.dbmTable.power}</td>
                    <td>{fmt(r.mW, 5)} mW <span className="sub">({fmtEng(r.W, 'W', 5)})</span></td>
                  </tr>
                  <tr>
                    <td>{text.dbmTable.ratio}</td>
                    <td>
                      {fmt(r.powerRatio, 5)}× <span className="sub">{text.dbmTable.ratioSub}</span>
                    </td>
                  </tr>
                </tbody>
              </table>

              <h2 className="section">{text.dbmTable.voltageHeading}</h2>
              <table className="result-table">
                <tbody>
                  <tr><td>{text.dbmTable.refZ}</td><td>{fmtOhm(r.Z)}</td></tr>
                  <tr>
                    <td>{text.dbmTable.vrms}</td>
                    <td>
                      {fmtVolt(r.Vrms)} <span className="sub">{text.dbmTable.vrmsSub}</span>
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
                <div className="label">{text.bigGain.label}</div>
                <div className="value">{fmt(r.dB, 4)} dB</div>
                <div className="alt">
                  {text.bigGain.alt(fmt(r.powerRatio, 4), fmt(r.voltageRatio, 4))}
                </div>
              </div>

              {status && <span className={`status ${status.cls}`}>{status.text}</span>}

              <table className="result-table">
                <tbody>
                  <tr className="mini-head">
                    <td>{text.gainTable.head}</td>
                    <td>{text.gainTable.headSub}</td>
                  </tr>
                  <tr>
                    <td>{text.gainTable.powerRatio}</td>
                    <td>{fmt(r.powerRatio, 5)}× <span className="sub">(10·log₁₀)</span></td>
                  </tr>
                  <tr>
                    <td>{text.gainTable.voltageRatio}</td>
                    <td>
                      {fmt(r.voltageRatio, 5)}×{' '}
                      <span className="sub">{text.gainTable.voltageSub}</span>
                    </td>
                  </tr>
                  <tr><td>{text.gainTable.gain}</td><td>{fmt(r.dB, 5)} dB</td></tr>
                </tbody>
              </table>

              {(r.P1 != null || r.V1 != null) && (
                <>
                  <h2 className="section">{text.gainTable.ioHeading}</h2>
                  <table className="result-table">
                    <tbody>
                      {r.P1 != null && (
                        <tr><td>{text.gainTable.P1}</td><td>{fmtEng(r.P1, 'W', 5)}</td></tr>
                      )}
                      {r.P2 != null && (
                        <tr><td>{text.gainTable.P2}</td><td>{fmtEng(r.P2, 'W', 5)}</td></tr>
                      )}
                      {r.V1 != null && (
                        <tr><td>{text.gainTable.V1}</td><td>{fmtVolt(r.V1)}</td></tr>
                      )}
                      {r.V2 != null && (
                        <tr><td>{text.gainTable.V2}</td><td>{fmtVolt(r.V2)}</td></tr>
                      )}
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
              {(r.mode === MODE_DBM ? text.detail.dbm(r) : text.detail.gain(r)).map((line) => (
                <li key={line}>{line}</li>
              ))}
              <li>{text.detail.noRounding}</li>
            </ul>
          )}

          <h2 className="section">{ui.sources}</h2>
          <ul className="detail-list">
            {text.sourceNotes.map((n) => <li key={n}>{n}</li>)}
          </ul>

          <h2 className="section">{ui.validity}</h2>
          <ul className="detail-list">
            {text.validity.map((n) => (
              <li key={n.text} className={n.warn ? 'w' : undefined}>{n.text}</li>
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
              items={chartSeries.map((x, i) => ({ label: x.name, tone: toneClass(i), kind: 'line' }))}
            />

            <LineChart
              ref={chartRef}
              xScale="log"
              xLabel={chart.x}
              yLabel={chart.y}
              series={chartSeries}
              marker={{ ...s.marker, label: text.chart.marker }}
              formatX={(v) => fmt(v, 3)}
              formatY={(v) => fmt(v, 3)}
              caption={chart.caption}
            />

            <ChartDataTable
              xLabel={chart.x}
              series={chartSeries}
              every={5}
              formatX={(v) => fmt(v, 3)}
              formatY={(v) => `${fmt(v, 3)} ${s.kind === 'dbm' ? 'dBm' : 'dB'}`}
            />
          </>
        ) : (
          <p className="empty-note">{ui.chartNeedsInput}</p>
        )}
      </section>

      <ReportDialog section={reportSection} schematicRef={schematicRef} chartRef={chartRef} />
      <SaveToProject
        toolKey="db-conv"
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
