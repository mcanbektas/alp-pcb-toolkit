// Uygulama geneli motor sürüm sabiti — elle, bilinçli olarak artırılır.
//
// Bir hesap motorunun matematiği (docs/spec.md'ye bağlı bir denklem, sabit
// ya da yöntem) değiştiğinde bu sayı bir artırılır. Kaydedilmiş bir hesabın
// `engineVersion` alanı bu sabitten gerideyse, o kayıt eski bir motorla
// hesaplanmış demektir — sunucu ya da ekran tarafı bunu "bayatlamış motor"
// diye işaretleyebilir. Araç başına ayrı bir sürümleme yoktur; tek, düz
// sayaç yeterli kabul edildi.
export const ENGINE_VERSION = '1'
