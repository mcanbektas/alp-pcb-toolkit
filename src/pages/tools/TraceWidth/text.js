// Trace genişliği ekranının kullanıcıya görünen metinleri.

export function reasonText() {
  return 'Tüm zorunlu alanlara pozitif sayısal değer girin. Ondalık için nokta veya virgül kullanabilirsiniz (0.25 = 0,25).'
}

export const METHOD_NOTE = 'Klasik ampirik yöntem — veri tabanlı hesapla eşdeğer değildir.'

export const CHART_CAPTION =
  'Kesit alanı arttıkça akım kapasitesi artar; eğri ampirik ısınma denkleminden gelir. ' +
  'İkinci eğri diğer katman türünü gösterir — iç katman aynı genişlikte daha az akım taşır. ' +
  'Yatay çizgi hedef akımdır; çalışma noktası bunun üzerindeyse kapasite yeterlidir.'

export const LAYER_LABEL = { external: 'dış', internal: 'iç' }
