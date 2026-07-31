import { useMemo, useRef, useState } from 'react'
import LangLink from '../../../components/LangLink'
import NumberField from '../../../components/NumberField'
import SelectField from '../../../components/SelectField'
import Segmented from '../../../components/Segmented'
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
import { fmt, fmtEng, fmtOhm, fmtVolt, fmtWatt } from '../../../lib/num'
import { OZ_TABLE, rhoAt } from '../../../lib/traceCalc'
import { LENGTH } from '../../../lib/units'
import TraceSchematic from './schematic'
import {
  INITIAL_FORM, MODE_ANALYSIS, MODE_SYNTHESIS, compute, buildSweep,
} from './model'
import { getText } from './text'
import { buildReportSection } from './report'

// Gösterim dönüşümleri — hesaplar SI'de yapılır, yalnızca ekranda çevrilir
const mm = (m) => m / LENGTH.mm
const mil = (m) => m / LENGTH.mil
const axisMm = (v) => fmt(v, 3)

export default function TraceWidth() {
  const [mode, setMode] = useState(MODE_SYNTHESIS)
  const { f, set, patch } = useToolForm(INITIAL_FORM)

  // Kaydedilmiş hesabı geri yükler (?hesap=<id>) ve ekranı o kayda bağlar;
  // SaveToProject bağlı kayda yeni satır açmak yerine üzerine yazar.
  const saved = useSavedCalculation({
    toolKey: 'trace-width', initialForm: INITIAL_FORM, patch, setMode,
  })
  const { lang } = useLang()

  const text = useMemo(() => getText(lang), [lang])
  const ui = useMemo(() => commonText(lang), [lang])

  const r = useMemo(() => compute(mode, f, text.fieldLabels), [mode, f, text])
  const s = useMemo(() => buildSweep(r), [r])
  const notes = useMemo(() => text.commentary(r), [r, text])

  // Rapor bölümü SVG'siz kurulur; ReportDialog indirme anında canlı DOM'dan
  // (aşağıdaki ref'ler) şematik ve grafiği okuyup satır içine çevirir.
  const reportSection = useMemo(() => buildReportSection({ mode, f, r, s, text }), [mode, f, r, s, text])
  const schematicRef = useRef(null)
  const chartRef = useRef(null)

  // Durum çipi tek kurala bağlıdır: mühendislik yorumundaki bulguların en kötü
  // seviyesi gösterilir. Geçerlilik uyarıları da o listeye giriyor, bu yüzden
  // aralık dışı bir girdi artık "tüm kontroller geçti" diye görünmez.
  const status = useMemo(() => {
    if (!r.ok || notes.length === 0) return null
    const levels = notes.map((n) => n.level)
    const worst = worstLevel(levels)
    return statusChip(worst, countAtLevel(levels, worst), ui)
  }, [r, notes, ui])

  const otherLayer = r.ok ? (r.layer === 'external' ? 'internal' : 'external') : 'internal'
  const chartSeries = s
    ? [
        { key: 'now', name: text.layerSeries[r.layer], tone: toneClass(0), points: s.points },
        { key: 'other', name: text.layerSeries[otherLayer], tone: toneClass(1), points: s.otherPoints },
      ]
    : []

  return (
    <>
      <LangLink className="backlink" to="/kategori/akim-guc-bakir">{text.backlink}</LangLink>

      <ToolHeader title={text.title} intro={text.intro} />

      <div className="tool-grid">
        {/* ---------- Sol: Girdiler ---------- */}
        <section className="panel">
          <h2>{ui.inputs}</h2>

          <TraceSchematic ref={schematicRef} r={r} text={text.schematic} />

          <Segmented
            value={mode}
            onChange={setMode}
            options={[
              { value: MODE_SYNTHESIS, label: text.modeSynthesis },
              { value: MODE_ANALYSIS, label: text.modeAnalysis },
            ]}
          />

          <NumberField
            label={text.fields.I.label}
            value={f.I} onChange={set('I')}
            units={['A', 'mA']} unit={f.Iu} onUnit={set('Iu')}
          />

          {mode === MODE_ANALYSIS && (
            <NumberField
              label={text.fields.W.label}
              value={f.W} onChange={set('W')}
              units={['mm', 'mil']} unit={f.Wu} onUnit={set('Wu')}
            />
          )}

          <NumberField
            label={text.fields.dT.label}
            value={f.dT} onChange={set('dT')}
            units={['°C']} unit="°C" onUnit={() => {}}
            hint={text.fields.dT.hint}
          />

          <NumberField
            label={text.fields.Ta.label}
            value={f.Ta} onChange={set('Ta')}
            units={['°C']} unit="°C" onUnit={() => {}}
          />

          <SelectField
            label={text.fields.layer.label}
            value={f.layer} onChange={set('layer')}
            options={[
              { value: 'external', label: text.fields.layerExternal },
              { value: 'internal', label: text.fields.layerInternal },
            ]}
          />

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

          <NumberField
            label={text.fields.L.label}
            value={f.L} onChange={set('L')}
            units={['mm', 'cm', 'mil', 'inch']} unit={f.Lu} onUnit={set('Lu')}
            hint={text.fields.L.hint}
          />

          <NumberField
            label={text.fields.Vs.label}
            value={f.Vs} onChange={set('Vs')}
            units={['V']} unit="V" onUnit={() => {}}
            hint={text.fields.Vs.hint}
            placeholder={text.fields.Vs.placeholder}
          />

          {mode === MODE_SYNTHESIS && (
            <NumberField
              label={text.fields.margin.label}
              value={f.margin} onChange={set('margin')}
              units={['%']} unit="%" onUnit={() => {}}
              hint={text.fields.margin.hint}
            />
          )}

          <label className="check-row">
            <input type="checkbox" checked={f.tol} onChange={(e) => set('tol')(e.target.checked)} />
            {text.fields.tolCheck}
          </label>

          {f.tol && (
            <>
              <NumberField
                label={text.fields.wTol.label}
                value={f.wTol} onChange={set('wTol')}
                units={['%']} unit="%" onUnit={() => {}}
              />
              <NumberField
                label={text.fields.tTol.label}
                value={f.tTol} onChange={set('tTol')}
                units={['%']} unit="%" onUnit={() => {}}
              />
            </>
          )}
        </section>

        {/* ---------- Orta: Ana sonuç ---------- */}
        {/* İç `r.ok &&` kapısı gereksiz görünür ama değildir: children JSX'i
            ResultPanel çizmese de burada KURULUR ve ok-dışı durumda r.mode
            gibi alanlar okunurken patlardı. */}
        <ResultPanel r={r} reason={text.reasonText}>
          {r.ok && (
            <>
              {r.mode === MODE_SYNTHESIS ? (
                <div className="big-result">
                  <div className="label">{text.bigResultSyn(r.M)}</div>
                  <div className="value">{fmt(mm(r.Wrec_m))} mm</div>
                  <div className="alt">
                    = {fmt(mil(r.Wrec_m))} mil &nbsp;·&nbsp; {text.minimumWord} {fmt(mm(r.Wmin_m))} mm
                  </div>
                </div>
              ) : (
                <div className="big-result">
                  <div className="label">{text.bigResultAna(r.dT)}</div>
                  <div className="value">{fmt(r.Imax)} A</div>
                  <div className="alt">W = {fmt(mm(r.W_m))} mm ({fmt(mil(r.W_m))} mil)</div>
                </div>
              )}

              {status && <span className={`status ${status.cls}`}>{status.text}</span>}

              <p className="method-note">{text.methodNote}</p>

              <table className="result-table">
                <tbody>
                  <tr>
                    <td>{text.table.area}</td>
                    <td>{fmt(r.A_mm2)} mm² <span className="sub">({fmt(r.A_mil2)} mil²)</span></td>
                  </tr>
                  <tr>
                    <td>{text.table.r20}</td>
                    <td>{fmtOhm(r.e.R20)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.rAvg(r.e.Tavg)}</td>
                    <td>{fmtOhm(r.e.Ravg)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.rMax(r.e.Tmax)}</td>
                    <td>{fmtOhm(r.e.Rmax)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.vdropAvg}</td>
                    <td>
                      {fmtVolt(r.e.VdropAvg)}
                      {r.e.pctAvg !== null && (
                        <span className="sub"> {text.table.pctOfSupply(r.e.pctAvg)}</span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td>{text.table.vdropMax}</td>
                    <td>
                      {fmtVolt(r.e.VdropMax)}
                      {r.e.pctMax !== null && (
                        <span className="sub"> {text.table.pctOfSupply(r.e.pctMax)}</span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td>{text.table.ploss}</td>
                    <td>{fmtWatt(r.e.Ploss)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.perLength}</td>
                    <td>{fmtEng(r.e.PperLength, 'W/m', 3)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.j}</td>
                    <td>{fmt(r.e.J)} A/mm²</td>
                  </tr>
                  <tr>
                    <td>{text.table.tmax}</td>
                    <td>{fmt(r.e.Tmax, 3)} °C</td>
                  </tr>
                </tbody>
              </table>

              {r.tol && r.mode === MODE_SYNTHESIS && (
                <>
                  <h2 className="section">{text.tolSynHeading}</h2>
                  <table className="result-table">
                    <tbody>
                      <tr>
                        <td>{text.tolSyn.width}</td>
                        <td>{fmt(mm(r.tol.Wwc_m))} mm</td>
                      </tr>
                      <tr>
                        <td>{text.tolSyn.copper}</td>
                        <td>{fmt(r.tol.twc_um)} µm</td>
                      </tr>
                      <tr>
                        <td>{text.tolSyn.capacity}</td>
                        <td>
                          {fmt(r.tol.ImaxWc)} A{' '}
                          <span className="sub">
                            {r.tol.sufficient ? text.tolSyn.sufficient : text.tolSyn.insufficient}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </>
              )}

              {r.tol && r.mode === MODE_ANALYSIS && (
                <>
                  <h2 className="section">{text.tolAnaHeading}</h2>
                  <table className="result-table">
                    <tbody>
                      <tr>
                        <td>{text.tolAna.capacity}</td>
                        <td>{fmt(r.tol.ImaxMin)} · {fmt(r.Imax)} · {fmt(r.tol.ImaxMax)} A</td>
                      </tr>
                      <tr>
                        <td>{text.tolAna.r20}</td>
                        <td>{fmtOhm(r.tol.R20Min)} · {fmtOhm(r.e.R20)} · {fmtOhm(r.tol.R20Max)}</td>
                      </tr>
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

          <pre className="formula">{text.formula}</pre>

          {r.ok && (
            <ul className="detail-list">
              <li>{text.detail.method}</li>
              <li>{text.detail.kCoeff(r.k, r.layer)}</li>
              <li>{text.detail.thickness(r.t_um, r.t_mil)}</li>
              <li>
                {text.detail.rhoWord} @ T<sub>avg</sub>: {fmt(rhoAt(r.e.Tavg) * 1e8)} ×10⁻⁸ Ω·m.
              </li>
              <li>{text.detail.noRounding}</li>
            </ul>
          )}

          <h2 className="section">{ui.validity}</h2>
          <ul className="detail-list">
            {r.ok && r.warnings.map((w) => (
              <li key={w.code} className="w">{text.warningText(w)}</li>
            ))}
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
                { label: text.layerSeries[r.layer], tone: toneClass(0), kind: 'line' },
                { label: text.layerSeries[otherLayer], tone: toneClass(1), kind: 'line' },
                { label: text.chart.targetLegend(r.I), tone: 'tone-muted', kind: 'line' },
              ]}
            />

            <LineChart
              ref={chartRef}
              xScale="log"
              xLabel={text.chart.x}
              yLabel={text.chart.y}
              series={chartSeries}
              refLines={[{ key: 'target', y: s.target, label: text.chart.targetRef(r.I) }]}
              marker={{ ...s.marker, label: text.chart.operatingPoint }}
              formatX={axisMm}
              formatY={(v) => fmt(v, 3)}
              caption={text.chart.caption}
            />

            <ChartDataTable
              xLabel={text.chart.x}
              series={chartSeries}
              every={5}
              formatX={(v) => `${fmt(v, 3)} mm`}
              formatY={(v) => `${fmt(v, 3)} A`}
            />
          </>
        ) : (
          <p className="empty-note">{ui.chartNeedsInput}</p>
        )}
      </section>

      <ReportDialog section={reportSection} schematicRef={schematicRef} chartRef={chartRef} />
      <SaveToProject
        toolKey="trace-width"
        toolMode={mode}
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
