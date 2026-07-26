// Efektif dielektrik sabiti giriş bloğu — sinyal bütünlüğü ekranlarının hepsi
// bunu kullanır (spec §7.1).
//
// İki kaynak: elle giriş ya da geometriden hesap. Geometri seçilirse
// lib/impedance.js çağrılır; ekranlar arasında paylaşılan durum yoktur, her
// ekran motoru kendi içinde çalıştırır.
//
// Alan adları `eps` ön ekli olduğu için ekranın kendi alanlarıyla çakışmaz.

import NumberField from './NumberField'
import SelectField from './SelectField'
import Segmented from './Segmented'
import {
  EPS_MANUAL, EPS_GEOMETRY,
  EPS_STRUCT_MICROSTRIP, EPS_STRUCT_STRIPLINE,
} from '../lib/epsEff'

const DIM_UNITS = ['mm', 'um', 'mil']

export const EPS_SOURCE_LABEL = {
  [EPS_MANUAL]: 'Elle gir',
  [EPS_GEOMETRY]: 'Geometriden hesapla',
}

export const EPS_STRUCT_LABEL = {
  [EPS_STRUCT_MICROSTRIP]: 'Microstrip',
  [EPS_STRUCT_STRIPLINE]: 'Stripline (homojen dielektrik)',
}

export default function EpsEffFields({ f, set }) {
  const geometry = f.epsSource === EPS_GEOMETRY
  const microstrip = geometry && f.epsStructure === EPS_STRUCT_MICROSTRIP

  return (
    <>
      <Segmented
        value={f.epsSource}
        onChange={set('epsSource')}
        options={[
          { value: EPS_MANUAL, label: EPS_SOURCE_LABEL[EPS_MANUAL] },
          { value: EPS_GEOMETRY, label: EPS_SOURCE_LABEL[EPS_GEOMETRY] },
        ]}
      />

      {!geometry && (
        <NumberField
          label="Efektif dielektrik sabiti (εeff)"
          value={f.epsEffManual} onChange={set('epsEffManual')}
          units={['']} unit="" onUnit={() => {}}
          hint="Empedans aracından ya da üretici yığın raporundan"
        />
      )}

      {geometry && (
        <>
          <SelectField
            label="Hat yapısı"
            value={f.epsStructure} onChange={set('epsStructure')}
            options={[
              { value: EPS_STRUCT_MICROSTRIP, label: EPS_STRUCT_LABEL[EPS_STRUCT_MICROSTRIP] },
              { value: EPS_STRUCT_STRIPLINE, label: EPS_STRUCT_LABEL[EPS_STRUCT_STRIPLINE] },
            ]}
          />

          <NumberField
            label="Dielektrik sabiti (εr)"
            value={f.epsR} onChange={set('epsR')}
            units={['']} unit="" onUnit={() => {}}
            hint={microstrip
              ? 'FR-4 için tipik 4.2–4.5'
              : 'Stripline homojen dielektriktedir: εeff = εr'}
          />

          {microstrip && (
            <>
              <NumberField
                label="Hat genişliği (W)"
                value={f.epsW} onChange={set('epsW')}
                units={DIM_UNITS} unit={f.epsWu} onUnit={set('epsWu')}
              />
              <NumberField
                label="Dielektrik yüksekliği (H)"
                value={f.epsH} onChange={set('epsH')}
                units={DIM_UNITS} unit={f.epsHu} onUnit={set('epsHu')}
              />
              <NumberField
                label="Bakır kalınlığı (t)"
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

// Sonuç panelinde εeff'in nereden geldiğini gösteren ortak satırlar.
// Ekranlar bunu kendi sonuç tablolarına ekler.
export function epsEffRows(eps, fmt) {
  if (!eps) return []

  const rows = [
    { label: 'Efektif dielektrik sabiti', value: fmt(eps.epsEff, 5) },
  ]

  if (eps.source === EPS_GEOMETRY) {
    rows.push({
      label: 'εeff kaynağı',
      value: eps.structure === EPS_STRUCT_STRIPLINE
        ? 'geometri — homojen dielektrik'
        : `geometri — ${eps.model}`,
    })
    if (eps.Z0 != null) {
      rows.push({ label: 'Aynı geometrinin Z₀ değeri', value: `${fmt(eps.Z0, 4)} Ω` })
    }
  } else {
    rows.push({ label: 'εeff kaynağı', value: 'elle girildi' })
  }

  return rows
}
