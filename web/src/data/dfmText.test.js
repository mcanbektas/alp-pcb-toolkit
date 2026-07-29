import { describe, it, expect } from 'vitest'
import { dfmText } from './dfmText'
import { SUMMARY_LABEL_KEYS } from '../lib/dfmSummary'

// Özet üreteci bu anahtarların hepsini ister; biri eksikse düz metin özet
// "undefined" basardı. Sözlük ile motorun beklentisi burada bağlanır.
describe('dfmText — DFM özeti etiketleri', () => {
  it.each(['tr', 'en'])('%s dilinde bütün özet anahtarları dolu', (lang) => {
    const { summary } = dfmText(lang)
    const missing = SUMMARY_LABEL_KEYS.filter(
      (key) => typeof summary[key] !== 'string' || summary[key].trim() === '',
    )
    expect(missing).toEqual([])
  })
})
