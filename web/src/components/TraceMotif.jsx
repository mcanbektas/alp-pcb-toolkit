// Başlıktaki devre yolu motifi — rampanın yeri ÖLÇÜLEREK bulunur.
//
// Çizgi soldan düz gelir, sağdaki grubun (Projelerim / Hesabım / dil düğmeleri)
// hemen öncesinde yukarı çıkar ve o hizada devam edip biter. Rampanın x'i sabit
// yazılamaz: grubun genişliği dile (`Projelerim` ↔ `Projects`), oturum durumuna
// (giriş yapılmamışken tek bağlantı) ve kullanıcının görünen adına göre değişir.
// Sabit bir değer bir dilde doğru, ötekinde yanlış olurdu.
//
// HYDRATION: ilk render her zaman aşağıdaki SABİT yolu çizer — prerender'lı HTML
// ile birebir aynı (docs/prerender-karari.md §2). Ölçüm mount'tan SONRA yapılır
// ve `d` özniteliği doğrudan DOM'a yazılır; state tutulmaz, yani yeniden render
// da yoktur. Ölçüm ilk render'da yapılsaydı sunucuda `getBoundingClientRect`
// yok, tarayıcıda var — ağaç ayrışırdı.
//
// Bu bileşen sunum kuralının bilinçli istisnasıdır: taşıdığı şey veri değil,
// öğenin KENDİ geometrisi. Ölçümü yukarı taşımak, ölçülen düğümü de yukarı
// taşımak demekti.

import { useEffect, useRef } from 'react'

// viewBox genişliği. `preserveAspectRatio="none"` ile x birimi başlığın
// yüzdesidir: 1080 → %90.
const VB_W = 1200
const VB_H = 26

// Çizginin bittiği nokta ve ucundaki pad. DEĞİŞTİRİLMEZ: dil düğmelerinin sağ
// kenarı bu x'e hizalanıyor (`.site-header .lang-switch:last-child`,
// `margin-right: calc(10vw - …)`). Biri değişirse öteki de değişmeli.
const SON_X = 1080
const PAD_X = 1092

const ALT_Y = 13
const UST_Y = 5

// Rampa, sağdaki grubun BAŞLADIĞI yerde biter — araya boşluk konmaz, ikisi
// aynı dikeyde hizalanır.
const BOSLUK_PX = 0

// Rampanın yatay uzunluğu. Piksel cinsinden ölçülür, sonra viewBox birimine
// çevrilir: viewBox biriminde sabit yazılsaydı `preserveAspectRatio="none"`
// yüzünden ekran genişledikçe uzayıp yayvanlaşırdı. Böylece eğim her
// genişlikte aynı görünür.
const RAMPA_PX = 28

// Ölçüm başarısız olursa ya da grup bulunamazsa kullanılan sabit yol —
// prerender çıktısındaki değerle BİREBİR aynı olmak zorunda.
const VARSAYILAN_D = `M0 ${ALT_Y} H760 L784 ${UST_Y} H${SON_X}`

export default function TraceMotif() {
  const svgRef = useRef(null)
  const pathRef = useRef(null)

  useEffect(() => {
    const svg = svgRef.current
    const path = pathRef.current
    if (!svg || !path) return undefined

    const baslik = svg.closest('.site-header')
    if (!baslik) return undefined

    function ciz() {
      const genislik = svg.getBoundingClientRect().width
      if (!genislik) return

      // Sağdaki küme: hesap alanı ve dil düğmeleri aynı sınıfı taşır. Oturum
      // çözülene kadar hesap alanı hiç basılmaz, o yüzden "ilki" varsayılmaz —
      // hangisi en soldaysa küme orada başlar.
      const gruplar = baslik.querySelectorAll('.lang-switch')
      if (!gruplar.length) return
      const basliklKutu = baslik.getBoundingClientRect()
      const kumeSol = Math.min(...[...gruplar].map((g) => g.getBoundingClientRect().left))

      const pxToVb = VB_W / genislik
      const rampaSonu = (kumeSol - basliklKutu.left - BOSLUK_PX) * pxToVb
      const rampaBasi = rampaSonu - RAMPA_PX * pxToVb

      // Dar ekranda küme sola kayar ve rampa çizginin başına dayanabilir.
      // Sıkışırsa düz çizgi kalır — kırık bir zikzak çizmektense.
      if (!Number.isFinite(rampaBasi) || rampaBasi <= 0 || rampaSonu >= SON_X) {
        path.setAttribute('d', `M0 ${ALT_Y} H${SON_X}`)
        return
      }

      path.setAttribute(
        'd',
        `M0 ${ALT_Y} H${rampaBasi.toFixed(1)} L${rampaSonu.toFixed(1)} ${UST_Y} H${SON_X}`,
      )
    }

    ciz()

    // Genişlik değişimi (pencere) VE içerik değişimi (giriş/çıkış, dil) ayrı
    // olaylar: ilki boyutu değiştirir, ikincisi değiştirmeden kümenin solunu
    // kaydırır. İkisi de izlenmezse motif bir durumda yanlış yerde kalır.
    const boyut = new ResizeObserver(ciz)
    boyut.observe(baslik)
    const icerik = new MutationObserver(ciz)
    icerik.observe(baslik, { childList: true, subtree: true, characterData: true })

    return () => {
      boyut.disconnect()
      icerik.disconnect()
    }
  }, [])

  return (
    <svg
      ref={svgRef}
      className="trace-motif"
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path ref={pathRef} d={VARSAYILAN_D} fill="none" stroke="var(--accent-dim)" strokeWidth="2" />
      <circle cx={PAD_X} cy={UST_Y} r="4.5" fill="var(--accent)" />
    </svg>
  )
}
