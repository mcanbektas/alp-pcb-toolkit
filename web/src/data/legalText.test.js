import { describe, it, expect } from 'vitest'
import { LANGS } from '../lib/i18n'
import { staticPath } from '../lib/routes'
import { LEGAL_DOCS, legalDoc } from './legalPages'
import { CONTROLLER, legalText } from './legalText'

// Yasal sayfaların değişmezleri. Buradaki hataların hepsi build'den ve tip
// denetiminden KAÇAR: sonuçları boş çizilen bir sayfa, çevrilmemiş bir bölüm
// ya da yalnız tek dilde var olan bir belgedir — üçü de sessizdir.
//
// `toolKeys.test.js` ve `dfmTextPaths.test.js` ile aynı teknik: bileşen
// render edilmez, veri yapısının kendisi denetlenir.

describe('yasal sayfa kayıtları', () => {
  it('boş değil', () => {
    expect(LEGAL_DOCS.length).toBeGreaterThan(0)
  })

  it('her belgenin iki dilde de rotası var ve rotalar benzersiz', () => {
    const paths = []
    for (const doc of LEGAL_DOCS) {
      for (const lang of LANGS) {
        const path = staticPath(doc.key, lang)
        // staticPath bilinmeyen anahtarda null döner: LEGAL_DOCS anahtarı
        // STATIC_ROUTES'a eklenmeyi unutulmuşsa burada yakalanır.
        expect(path, `${doc.key} (${lang}) rotası yok`).toBeTruthy()
        paths.push(path)
      }
    }
    expect(new Set(paths).size).toBe(paths.length)
  })

  it('anahtarlar benzersiz ve legalDoc ile bulunabilir', () => {
    const keys = LEGAL_DOCS.map((d) => d.key)
    expect(new Set(keys).size).toBe(keys.length)
    for (const key of keys) expect(legalDoc(key)?.key).toBe(key)
  })

  it('bilinmeyen anahtar null döner', () => {
    expect(legalDoc('yok-boyle-bir-belge')).toBeNull()
  })
})

describe('yasal metin', () => {
  for (const lang of LANGS) {
    describe(lang, () => {
      const text = legalText(lang)

      it('her kayıtlı belgenin gövdesi var', () => {
        for (const doc of LEGAL_DOCS) {
          const body = text.docs[doc.key]
          // Kayıt ile metnin ayrışması sayfayı boş çizerdi.
          expect(body, `${doc.key} gövdesi yok`).toBeTruthy()
          expect(typeof body.lead).toBe('string')
          expect(body.lead.length).toBeGreaterThan(0)
          expect(body.sections.length).toBeGreaterThan(0)
        }
      })

      it('metinde fazladan belge yok', () => {
        const known = new Set(LEGAL_DOCS.map((d) => d.key))
        for (const key of Object.keys(text.docs)) expect(known.has(key)).toBe(true)
      })

      it('her bölüm başlıklı ve dolu', () => {
        for (const doc of LEGAL_DOCS) {
          for (const section of text.docs[doc.key].sections) {
            expect(typeof section.heading).toBe('string')
            expect(section.heading.length).toBeGreaterThan(0)
            // Başlığı olup içeriği olmayan bölüm, çeviri sırasında düşmüş
            // bir gövdenin tipik izidir.
            const filled = (section.body?.length ?? 0) + (section.list?.length ?? 0)
            expect(filled, `${doc.key} → "${section.heading}" boş`).toBeGreaterThan(0)
          }
        }
      })

      it('kimlik bloğunun her satırı etiketli', () => {
        for (const key of Object.keys(CONTROLLER)) {
          expect(text.controllerLabels[key], `${key} etiketi yok`).toBeTruthy()
        }
      })
    })
  }

  // Kopyala-yapıştır ile tek dilde bırakılmış metni yakalar: iki dilin aynı
  // dizeyi vermesi çeviri atlandığının işaretidir. Kısa ortak parçalar
  // (tarih gibi) bilerek dışarıda.
  it('bölüm başlıkları iki dilde farklı', () => {
    const tr = legalText('tr')
    const en = legalText('en')
    for (const doc of LEGAL_DOCS) {
      expect(tr.docs[doc.key].lead).not.toBe(en.docs[doc.key].lead)
      const trHeadings = tr.docs[doc.key].sections.map((s) => s.heading)
      const enHeadings = en.docs[doc.key].sections.map((s) => s.heading)
      expect(trHeadings.length).toBe(enHeadings.length)
      trHeadings.forEach((heading, i) => {
        expect(heading, `${doc.key} → "${heading}" çevrilmemiş`).not.toBe(enHeadings[i])
      })
    }
  })

  it('başlık ve açıklama iki dilde de dolu', () => {
    for (const doc of LEGAL_DOCS) {
      for (const lang of LANGS) {
        expect(doc.title[lang]?.length).toBeGreaterThan(0)
        expect(doc.desc[lang]?.length).toBeGreaterThan(0)
      }
    }
  })
})
