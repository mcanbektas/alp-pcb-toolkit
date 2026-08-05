// Metin yolu taramasının ortak parçası. İki bekçi kullanır:
// `textPaths.guard.test.js` (bütün ekranlar) ve `dfmTextPaths.test.js`
// (üretim/DFM ekranlarının ek boş-metin ve anahtar denetimleri).
//
// Ayrı dosyada durmasının nedeni, iki bekçinin AYNI iki kör noktayı ayrı ayrı
// öğrenmek zorunda kalmasıydı: yorum içinde geçen `text.js` sözü ve JSX
// prop'u olarak geçirilen fonksiyon. Tarama tek yerde durunca ikisi de aynı
// anda düzelir. Test dosyası DEĞİLDİR (`*.test.js` değil), vitest'in
// `test.include` deseni bunu almaz.

// `text.a.b.c` / `ui.x` / `dfm.a.b` yollarını yakalar. Köşeli parantezli
// dinamik erişim (`text.chart.metrics[metric]`) kasten dışarıda: anahtarı
// çalışma anında belli olur, statik olarak çözülemez.
const PATH_RE = /\b(text|ui|dfm)((?:\.[A-Za-z_$][\w$]*)+)\s*(\()?/g

// Yorumlar önce ayıklanır: "bkz. text.js" ya da "text.commentary(r) ile aynı"
// gibi bir AÇIKLAMA gerçek bir erişim değildir. Ayıklanmadığında dosya adı
// (`text.js`) tanımsız bir yol olarak raporlanıyordu.
export function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
}

export function collectPaths(source) {
  const found = []
  const clean = stripComments(source)
  let m = PATH_RE.exec(clean)
  while (m !== null) {
    // JSX prop'u olarak GEÇİRİLEN fonksiyon çağrılmadan yazılır ve bu doğrudur:
    // `reason={text.reasonText}` fonksiyonu ResultPanel'e verir, panel onu
    // kendi içinde çağırır (components/ResultPanel.jsx). Arity kuralı yalnız
    // ekranın KENDİ bastığı değere uygulanır.
    const oncesi = clean.slice(Math.max(0, m.index - 2), m.index)
    found.push({
      root: m[1],
      path: m[2].slice(1).split('.'),
      called: m[3] === '(',
      propOlarakGecirilen: oncesi.endsWith('={'),
    })
    m = PATH_RE.exec(clean)
  }
  return found
}

export function resolvePath(objects, root, path) {
  let node = objects[root]
  for (const key of path) {
    if (node === null || node === undefined) return { missing: true }
    node = node[key]
  }
  return { value: node, missing: node === undefined }
}

// Bir kaynak dosyadaki bütün yolları verilen kök nesneler üzerinde yürütür ve
// insan okunur sorun listesi döner. Boş dizi = temiz.
export function scanSource({ name, source, roots }) {
  const problems = []
  for (const { root, path, called, propOlarakGecirilen } of collectPaths(source)) {
    const { value, missing } = resolvePath(roots, root, path)
    if (missing) {
      problems.push(`${name}: ${root}.${path.join('.')} tanımsız`)
      continue
    }
    if (called && typeof value !== 'function') {
      problems.push(`${name}: ${root}.${path.join('.')} çağrılıyor ama fonksiyon değil`)
    }
    if (!called && !propOlarakGecirilen && typeof value === 'function') {
      problems.push(`${name}: ${root}.${path.join('.')} fonksiyon ama çağrılmadan basılıyor`)
    }
  }
  return problems
}
