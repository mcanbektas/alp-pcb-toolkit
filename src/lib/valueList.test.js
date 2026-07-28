import { describe, it, expect } from 'vitest'
import {
  parseValueList,
  VALUE_LIST_ERR_EMPTY, VALUE_LIST_ERR_INVALID, VALUE_LIST_ERR_THOUSANDS,
  VALUE_LIST_ERR_COMMA_SEPARATOR, VALUE_LIST_ERR_NEGATIVE,
} from './valueList'

describe('ondalık virgül', () => {
  // Bu testin varlık nedeni bir hesap hatası: ayrıştırıcı girdiyi önce virgülden
  // bölüyordu, "4,7k" 4 Ω ile 7 kΩ olarak okunuyordu ve paralel bağlamada eşdeğer
  // direnç 4700 Ω yerine ~4 Ω çıkıyordu. Hata sessizdi, sonuç geçerli görünüyordu.
  it('virgüllü ondalığı tek değer olarak okur', () => {
    expect(parseValueList('4,7k')).toEqual({ values: [4700] })
  })

  it('nokta ve virgül aynı sonucu verir', () => {
    expect(parseValueList('4.7k')).toEqual(parseValueList('4,7k'))
  })

  it('birden küçük ondalığı bölmez', () => {
    expect(parseValueList('0,25')).toEqual({ values: [0.25] })
  })

  it('listedeki her parçada ondalık virgül geçerlidir', () => {
    expect(parseValueList('4,7k; 10')).toEqual({ values: [4700, 10] })
  })
})

describe('ayırıcılar', () => {
  it('noktalı virgülle ayırır', () => {
    expect(parseValueList('10; 22; 47')).toEqual({ values: [10, 22, 47] })
  })

  it('boşlukla ayırır', () => {
    expect(parseValueList('10 22 47')).toEqual({ values: [10, 22, 47] })
  })

  it('satır sonuyla ayırır', () => {
    expect(parseValueList('10k\n22k')).toEqual({ values: [10000, 22000] })
  })

  it('tekrarlanan ayırıcı boş değer üretmez', () => {
    expect(parseValueList('10k;;22k')).toEqual({ values: [10000, 22000] })
  })

  it('baştaki ve sondaki boşluğu yok sayar', () => {
    expect(parseValueList('  10k  ')).toEqual({ values: [10000] })
  })

  // Virgül ayırıcı olarak yazıldığında sessizce yorumlanmaz: "10, 22" ile "1,022"
  // arasındaki fark tahminle kapatılamaz, kullanıcıya sorulur.
  it('virgülü ayırıcı sayan yazımı reddeder', () => {
    expect(parseValueList('10, 22')).toEqual({ error: VALUE_LIST_ERR_COMMA_SEPARATOR })
  })
})

describe('çarpan sonekleri', () => {
  it('k, M, G, T sonekini uygular', () => {
    expect(parseValueList('1k 2M 3G 4T')).toEqual({ values: [1e3, 2e6, 3e9, 4e12] })
  })

  it('sonek büyük/küçük harfe duyarsızdır', () => {
    expect(parseValueList('4,7K')).toEqual(parseValueList('4,7k'))
    // Küçük "m" burada mega demektir; mili değeri sonekle değil doğrudan yazılır.
    expect(parseValueList('2m')).toEqual(parseValueList('2M'))
  })

  it('soneksiz değeri olduğu gibi alır', () => {
    expect(parseValueList('220')).toEqual({ values: [220] })
  })
})

describe('geçersiz girdi sessizce düşmez', () => {
  it('boş girdi hata döner', () => {
    expect(parseValueList('')).toEqual({ error: VALUE_LIST_ERR_EMPTY })
    expect(parseValueList('   ')).toEqual({ error: VALUE_LIST_ERR_EMPTY })
    expect(parseValueList(null)).toEqual({ error: VALUE_LIST_ERR_EMPTY })
  })

  // Belirsiz binlik ayırıcı: "1.000" bin mi 1.0 mı belli değil. Ekranın diğer
  // alanları bunu zaten reddediyor, liste alanı da aynı davranır.
  it('belirsiz binlik ayırıcıyı reddeder', () => {
    expect(parseValueList('1.000')).toEqual({
      error: VALUE_LIST_ERR_THOUSANDS, at: '1.000',
    })
  })

  it('sayı olmayan parçayı bildirir', () => {
    expect(parseValueList('abc')).toEqual({ error: VALUE_LIST_ERR_INVALID, at: 'abc' })
  })

  it('negatif direnci reddeder', () => {
    expect(parseValueList('-5')).toEqual({ error: VALUE_LIST_ERR_NEGATIVE, at: '-5' })
  })

  it('hatalı parçayı adıyla bildirir, öncesini yutmaz', () => {
    // "2k2" yaygın bir yazım ama bu ekran onu desteklemiyor; sessizce 2 kΩ'a
    // düşmek yerine hangi parçanın anlaşılmadığını söyler.
    expect(parseValueList('1k 2k2')).toEqual({ error: VALUE_LIST_ERR_INVALID, at: '2k2' })
  })

  it('bilimsel gösterimi kabul etmez, hata kodu döner', () => {
    expect(parseValueList('1e3')).toEqual({ error: VALUE_LIST_ERR_INVALID, at: '1e3' })
  })
})
