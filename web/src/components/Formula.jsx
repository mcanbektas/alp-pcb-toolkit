// Formül bloğu — tek aralıklı metni gerçek üst/alt simgeyle gösterir.
//
// Neden: formüller düz metin olarak yazılıyordu ve "10^(G/10)", "D_o", "π·t_p²"
// gibi ifadelerde şapka ile alt çizgi ekranda olduğu gibi görünüyordu. Gösterim
// dizgi kurallarına uymuyordu ve okunması zordu.
//
// Yöntem: KaTeX gibi bir dizgi kütüphanesi yerine <sup>/<sub> kullanılıyor.
// Gerekçe — bağımlılık ve paket boyutu eklemiyor, mevcut mono font korunuyor,
// hizalama bozulmuyor. Karşılığında gerçek kesir çizgisi ve büyüyen parantez
// yok; bunlar bu ekranlarda zaten kullanılmıyordu.
//
// Söz dizimi (yazarken):
//   A^2       → üst simge, tek karakter
//   10^(G/10) → üst simge, parantezli grup (parantez gösterilmez)
//   D_o       → alt simge, tek karakter
//   V_maks    → alt simge, sözcük (harf dizisi)
//   N_{I,V}   → alt simge, süslü parantezli grup
//   \^ \_     → şapka ve alt çizginin kendisi
//
// Zaten Unicode üst simge yazılmış ifadeler (², ³, ⁻¹) olduğu gibi geçer.

const SUP = 'sup'
const SUB = 'sub'

// Bir grup: parantezli "(...)" / süslü "{...}", sözcük, ya da tek karakter.
// Parantezli grupta iç parantez sayılır ki "10^((a+b)/c)" doğru kapansın.
function readGroup(src, start) {
  const open = src[start]
  if (open === '(' || open === '{') {
    const close = open === '(' ? ')' : '}'
    let depth = 1
    let i = start + 1
    while (i < src.length && depth > 0) {
      if (src[i] === open) depth++
      else if (src[i] === close) depth--
      i++
    }
    // Kapanmamış parantez: metni bozmak yerine olduğu gibi bırak
    if (depth > 0) return null
    return { text: src.slice(start + 1, i - 1), next: i }
  }

  // Sözcük ya da sayı: harf/rakam dizisi tek parça sayılır (V_maks, D_pad)
  const rest = src.slice(start)
  const word = /^[A-Za-zÀ-ÿĞğİıÖöŞşÜüÇç0-9]+/.exec(rest)
  if (word) return { text: word[0], next: start + word[0].length }

  if (start < src.length) return { text: src[start], next: start + 1 }
  return null
}

/**
 * Tek satırı parçalara ayırır: düz metin, üst simge ve alt simge.
 * Dönüş: [{ kind: 'text'|'sup'|'sub', text }]
 */
export function parseFormulaLine(line) {
  const parts = []
  let buf = ''
  let i = 0

  const flush = () => {
    if (buf) { parts.push({ kind: 'text', text: buf }); buf = '' }
  }

  while (i < line.length) {
    const ch = line[i]

    // Kaçış: \^ ve \_ işaretin kendisini yazar
    if (ch === '\\' && (line[i + 1] === '^' || line[i + 1] === '_')) {
      buf += line[i + 1]
      i += 2
      continue
    }

    if (ch === '^' || ch === '_') {
      const group = readGroup(line, i + 1)
      if (!group) { buf += ch; i++; continue }
      flush()
      parts.push({ kind: ch === '^' ? SUP : SUB, text: group.text })
      i = group.next
      continue
    }

    buf += ch
    i++
  }

  flush()
  return parts
}

// Çarpma işareti tek aralıklı yazıda kaybolacak kadar küçük kalıyor. Karakteri
// değiştirmiyoruz — değişken çarpımında orta nokta doğru yazım — yalnızca
// sarmalayıp CSS'te büyütüyor ve iki yanını açıyoruz.
function withMultiplier(text, keyBase) {
  const parts = text.split('·')
  if (parts.length === 1) return text
  return parts.flatMap((piece, i) => (
    i === 0 ? [piece] : [<span className="mul" key={`${keyBase}-m${i}`}>·</span>, piece]
  ))
}

function Line({ text }) {
  const parts = parseFormulaLine(text)
  return (
    <>
      {parts.map((p, i) => {
        if (p.kind === SUP) return <sup key={i}>{p.text}</sup>
        if (p.kind === SUB) return <sub key={i}>{p.text}</sub>
        return <span key={i}>{withMultiplier(p.text, i)}</span>
      })}
    </>
  )
}

/**
 * @param {object} props
 * @param {string} props.children  formül metni (satırlar \n ile ayrılır)
 * @param {string} [props.title]   blok başlığı
 */
export default function Formula({ children, title }) {
  const lines = String(children ?? '').replace(/\n+$/, '').split('\n')

  return (
    <div className="formula-block">
      {title && <h3 className="formula-title">{title}</h3>}
      <pre className="formula">
        {lines.map((line, i) => (
          // Boş satır kendi yüksekliğini korusun diye sıfır genişlikli boşluk
          <div className="formula-line" key={i}>
            {line.trim() === '' ? '​' : <Line text={line} />}
          </div>
        ))}
      </pre>
    </div>
  )
}
