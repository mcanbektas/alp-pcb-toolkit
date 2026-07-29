// Efektif dielektrik sabiti giriş bloğu — sinyal bütünlüğü ekranlarının hepsi
// bunu kullanır (spec §7.1).
//
// İki kaynak: elle giriş ya da geometriden hesap. Geometri seçilirse
// lib/impedance.js çağrılır; ekranlar arasında paylaşılan durum yoktur, her
// ekran motoru kendi içinde çalıştırır.
//
// Alan adları `eps` ön ekli olduğu için ekranın kendi alanlarıyla çakışmaz.
//
// Metinler iki dillidir; bileşen dili doğrudan useLang'den okur ki dört
// tüketici ekran ayrı ayrı metin taşımasın.

import NumberField from './NumberField'
import SelectField from './SelectField'
import Segmented from './Segmented'
import { useLang } from '../hooks/useLang'
import { pick } from '../lib/i18n'
import {
  EPS_MANUAL, EPS_GEOMETRY,
  EPS_STRUCT_MICROSTRIP, EPS_STRUCT_STRIPLINE,
} from '../lib/epsEff'

const DIM_UNITS = ['mm', 'um', 'mil']

const TEXT = {
  sourceManual: { tr: 'Elle gir', en: 'Enter manually' },
  sourceGeometry: { tr: 'Geometriden hesapla', en: 'Compute from geometry' },
  structMicrostrip: { tr: 'Microstrip', en: 'Microstrip' },
  structStripline: {
    tr: 'Stripline (homojen dielektrik)',
    en: 'Stripline (homogeneous dielectric)',
  },
  epsEffLabel: { tr: 'Efektif dielektrik sabiti (εeff)', en: 'Effective dielectric constant (εeff)' },
  epsEffHint: {
    tr: 'Empedans aracından ya da üretici yığın raporundan',
    en: 'From the impedance tool or the fabricator stack-up report',
  },
  structLabel: { tr: 'Hat yapısı', en: 'Line structure' },
  epsRLabel: { tr: 'Dielektrik sabiti (εr)', en: 'Dielectric constant (εr)' },
  epsRHintMicrostrip: { tr: 'FR-4 için tipik 4.2–4.5', en: 'Typically 4.2–4.5 for FR-4' },
  epsRHintStripline: {
    tr: 'Stripline homojen dielektriktedir: εeff = εr',
    en: 'Stripline is in a homogeneous dielectric: εeff = εr',
  },
  widthLabel: { tr: 'Hat genişliği (W)', en: 'Trace width (W)' },
  heightLabel: { tr: 'Dielektrik yüksekliği (H)', en: 'Dielectric height (H)' },
  thicknessLabel: { tr: 'Bakır kalınlığı (t)', en: 'Copper thickness (t)' },
}

export default function EpsEffFields({ f, set }) {
  const { lang } = useLang()
  const t = (dict) => pick(dict, lang)
  const geometry = f.epsSource === EPS_GEOMETRY
  const microstrip = geometry && f.epsStructure === EPS_STRUCT_MICROSTRIP

  return (
    <>
      <Segmented
        value={f.epsSource}
        onChange={set('epsSource')}
        options={[
          { value: EPS_MANUAL, label: t(TEXT.sourceManual) },
          { value: EPS_GEOMETRY, label: t(TEXT.sourceGeometry) },
        ]}
      />

      {!geometry && (
        <NumberField
          label={t(TEXT.epsEffLabel)}
          value={f.epsEffManual} onChange={set('epsEffManual')}
          units={['']} unit="" onUnit={() => {}}
          hint={t(TEXT.epsEffHint)}
        />
      )}

      {geometry && (
        <>
          <SelectField
            label={t(TEXT.structLabel)}
            value={f.epsStructure} onChange={set('epsStructure')}
            options={[
              { value: EPS_STRUCT_MICROSTRIP, label: t(TEXT.structMicrostrip) },
              { value: EPS_STRUCT_STRIPLINE, label: t(TEXT.structStripline) },
            ]}
          />

          <NumberField
            label={t(TEXT.epsRLabel)}
            value={f.epsR} onChange={set('epsR')}
            units={['']} unit="" onUnit={() => {}}
            hint={microstrip ? t(TEXT.epsRHintMicrostrip) : t(TEXT.epsRHintStripline)}
          />

          {microstrip && (
            <>
              <NumberField
                label={t(TEXT.widthLabel)}
                value={f.epsW} onChange={set('epsW')}
                units={DIM_UNITS} unit={f.epsWu} onUnit={set('epsWu')}
              />
              <NumberField
                label={t(TEXT.heightLabel)}
                value={f.epsH} onChange={set('epsH')}
                units={DIM_UNITS} unit={f.epsHu} onUnit={set('epsHu')}
              />
              <NumberField
                label={t(TEXT.thicknessLabel)}
                value={f.epsT} onChange={set('epsT')}
                units={DIM_UNITS} unit={f.epsTu} onUnit={set('epsTu')}
              />
            </>
          )}
        </>
      )}
    </>
  )
}

const ROW_TEXT = {
  epsEff: { tr: 'Efektif dielektrik sabiti', en: 'Effective dielectric constant' },
  source: { tr: 'εeff kaynağı', en: 'εeff source' },
  homogeneous: { tr: 'geometri — homojen dielektrik', en: 'geometry — homogeneous dielectric' },
  geometryModel: { tr: 'geometri', en: 'geometry' },
  manual: { tr: 'elle girildi', en: 'entered manually' },
  sameGeometryZ0: { tr: 'Aynı geometrinin Z₀ değeri', en: 'Z₀ of the same geometry' },
}

// Sonuç panelinde εeff'in nereden geldiğini gösteren ortak satırlar.
// Ekranlar bunu kendi sonuç tablolarına ekler.
//
// `lang` zorunludur ve varsayılanı yoktur. Türkçe bir varsayılan, dili geçirmeyi
// unutan bir tüketicinin İngilizce arayüzde Türkçe satır basmasını meşrulaştırır;
// argüman imzada zorunlu durunca eksiklik gözden kaçmaz. (`pick` tasarım gereği
// yine Türkçeye düşer — burada amaçlanan, eksikliği gizleyen varsayılanı kaldırmak.)
export function epsEffRows(eps, fmt, lang) {
  if (!eps) return []
  const t = (dict) => pick(dict, lang)

  const rows = [
    { label: t(ROW_TEXT.epsEff), value: fmt(eps.epsEff, 5) },
  ]

  if (eps.source === EPS_GEOMETRY) {
    rows.push({
      label: t(ROW_TEXT.source),
      value: eps.structure === EPS_STRUCT_STRIPLINE
        ? t(ROW_TEXT.homogeneous)
        : `${t(ROW_TEXT.geometryModel)} — ${eps.model}`,
    })
    if (eps.Z0 != null) {
      rows.push({ label: t(ROW_TEXT.sameGeometryZ0), value: `${fmt(eps.Z0, 4)} Ω` })
    }
  } else {
    rows.push({ label: t(ROW_TEXT.source), value: t(ROW_TEXT.manual) })
  }

  return rows
}
