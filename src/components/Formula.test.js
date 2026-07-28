import { describe, it, expect } from 'vitest'
import { parseFormulaLine } from './Formula'

const kinds = (line) => parseFormulaLine(line).map((p) => `${p.kind}:${p.text}`)

describe('üst simge', () => {
  it('tek karakteri alır', () => {
    expect(kinds('A^2')).toEqual(['text:A', 'sup:2'])
  })

  it('parantezli grubu alır, parantezi göstermez', () => {
    expect(kinds('10^(G/10)')).toEqual(['text:10', 'sup:G/10'])
  })

  it('iç içe parantezde doğru yerde kapanır', () => {
    expect(kinds('10^((a+b)/c)')).toEqual(['text:10', 'sup:(a+b)/c'])
  })

  it('sözcüğü tek parça sayar', () => {
    expect(kinds('e^jwt')).toEqual(['text:e', 'sup:jwt'])
  })
})

describe('alt simge', () => {
  it('tek karakteri alır', () => {
    expect(kinds('D_o')).toEqual(['text:D', 'sub:o'])
  })

  it('sözcüğü tek parça sayar — kesilmez', () => {
    expect(kinds('V_maks')).toEqual(['text:V', 'sub:maks'])
  })

  it('Türkçe harf içeren adı böler değil, bütün alır', () => {
    expect(kinds('T_aşındırma')).toEqual(['text:T', 'sub:aşındırma'])
  })

  it('süslü parantezli grubu alır', () => {
    expect(kinds('N_{I,V}')).toEqual(['text:N', 'sub:I,V'])
  })
})

describe('karışık ve sınır durumları', () => {
  it('bir satırda birden çok işaret', () => {
    expect(kinds('A = π·t_p·(D_f + t_p)')).toEqual([
      'text:A = π·t', 'sub:p', 'text:·(D', 'sub:f', 'text: + t', 'sub:p', 'text:)',
    ])
  })

  it('üst ve alt simge birlikte', () => {
    expect(kinds('R_th^2')).toEqual(['text:R', 'sub:th', 'sup:2'])
  })

  it('kaçış işareti karakterin kendisini yazar', () => {
    expect(kinds('a \\^ b')).toEqual(['text:a ^ b'])
    expect(kinds('x \\_ y')).toEqual(['text:x _ y'])
  })

  it('kapanmamış parantezde metni bozmaz', () => {
    // Ham metin korunur: yarım kalan grup yüzünden satır kaybolmasın
    expect(parseFormulaLine('10^(G/10').map((p) => p.text).join('')).toBe('10^(G/10')
  })

  it('işaretten sonra bir şey yoksa işareti düz metin sayar', () => {
    expect(kinds('A^')).toEqual(['text:A^'])
  })

  it('zaten Unicode üst simge olan ifadeye dokunmaz', () => {
    expect(kinds('π·t_p² kadar')).toEqual(['text:π·t', 'sub:p', 'text:² kadar'])
  })

  it('işaretsiz satır tek parça kalır', () => {
    expect(kinds('Aspect ratio: AR = H / D')).toEqual(['text:Aspect ratio: AR = H / D'])
  })

  it('boş satır boş dizi verir', () => {
    expect(parseFormulaLine('')).toEqual([])
  })
})
