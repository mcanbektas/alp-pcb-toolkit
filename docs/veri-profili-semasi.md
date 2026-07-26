# Veri Profili Şeması

Lisanslı standart tabloları (akım/ısınma eğrileri, clearance ve creepage
tabloları, üretici yetenek limitleri) bu depoya konmaz. Bunun yerine kendi veri
setinizi JSON olarak hazırlar ve araç ekranından içe aktarırsınız. Profil
yalnızca tarayıcınızın `localStorage` alanında tutulur; hiçbir yere gönderilmez
ve depoya girmez.

Aşağıdakiler **boş iskeletlerdir** — içlerinde gerçek standart verisi yoktur.
Değerleri elinizdeki lisanslı dokümandan veya kendi ölçümlerinizden siz
doldurursunuz.

Doğrulama, içe aktarma ve saklama tek yerde yapılır: `src/lib/dataProfiles.js`.

---

## Ortak zarf

Her profil aynı dış yapıyı taşır:

```json
{
  "schema": "alp-pcb-profile",
  "schemaVersion": 1,
  "kind": "trace-current",
  "name": "",
  "source": "",
  "note": "",
  "data": {}
}
```

| Alan | Zorunlu | Açıklama |
| --- | --- | --- |
| `schema` | evet | Sabit: `"alp-pcb-profile"`. Yanlışsa dosya reddedilir. |
| `schemaVersion` | evet | Şu an `1`. Format ileride değişirse bu sayı artar; eski profil sessizce yanlış okunmaz, açık hata verir. |
| `kind` | evet | Profil türü — aşağıdaki dört değerden biri. |
| `name` | evet | Profilin görünen adı. Aynı tür + aynı ad tekrar aktarılırsa üzerine yazılır. |
| `source` | evet | Verinin hangi dokümandan ve **hangi revizyondan** geldiği. Boş bırakılamaz: sonucun neye dayandığı kayıtlı olmadan gösterilmemeli. |
| `note` | hayır | Serbest not — geçerlilik sınırı, ölçüm koşulu, kim hazırladı vb. |
| `data` | evet | Türe göre değişen içerik. Aşağıda ayrı ayrı. |

---

## `kind: "trace-current"`

İletken kesit alanı ↔ akım ↔ sıcaklık artışı veri noktaları. Trace genişliği ve
via akım kapasitesi ekranları interpolasyon için bunu kullanır.

```json
{
  "schema": "alp-pcb-profile",
  "schemaVersion": 1,
  "kind": "trace-current",
  "name": "",
  "source": "",
  "note": "",
  "data": {
    "rows": [
      {
        "areaMm2": 0,
        "currentA": 0,
        "tempRiseC": 0,
        "layer": "external",
        "copperUm": 35,
        "plane": "none",
        "boardThicknessMm": 1.6,
        "material": ""
      }
    ]
  }
}
```

`rows` içindeki her satır için:

| Alan | Zorunlu | Birim | Açıklama |
| --- | --- | --- | --- |
| `areaMm2` | evet | mm² | Bakır kesit alanı. |
| `currentA` | evet | A | Sürekli akım. |
| `tempRiseC` | evet | °C | Ortama göre sıcaklık artışı. |
| `layer` | hayır | — | `"external"` veya `"internal"`. Verilmezse tüm katmanlar için geçerli sayılır. |
| `copperUm` | hayır | µm | Bitmiş bakır kalınlığı. |
| `plane` | hayır | — | Referans düzlem yapılandırması, örn. `"none"`, `"single"`, `"dual"`. |
| `boardThicknessMm` | hayır | mm | Kart kalınlığı. |
| `material` | hayır | — | Malzeme adı. |

Zorunlu üç alan sayısal değilse dosya reddedilir. Veri noktaları arasında
logaritmik interpolasyon yapılır; **aralık dışına extrapolation yapılmaz**,
bunun yerine veri aralığı dışı uyarısı gösterilir.

En az iki satır verin — tek noktayla interpolasyon yapılamaz.

---

## `kind: "clearance"`

Gerilime göre minimum hava (clearance) ve yüzey (creepage) mesafeleri.

```json
{
  "schema": "alp-pcb-profile",
  "schemaVersion": 1,
  "kind": "clearance",
  "name": "",
  "source": "",
  "note": "",
  "data": {
    "rows": [
      {
        "voltageV": 0,
        "clearanceMm": 0,
        "creepageMm": 0,
        "pollutionDegree": 2,
        "materialGroup": "IIIa",
        "insulation": "basic",
        "coated": false,
        "altitudeM": 2000
      }
    ]
  }
}
```

| Alan | Zorunlu | Birim | Açıklama |
| --- | --- | --- | --- |
| `voltageV` | evet | V | Çalışma gerilimi — satırın geçerli olduğu üst sınır. |
| `clearanceMm` | evet | mm | Hava üzerinden minimum mesafe. |
| `creepageMm` | evet | mm | Yalıtkan yüzey boyunca minimum mesafe. |
| `pollutionDegree` | hayır | — | 1, 2 veya 3. |
| `materialGroup` | hayır | — | CTI malzeme grubu, örn. `"I"`, `"II"`, `"IIIa"`, `"IIIb"`. |
| `insulation` | hayır | — | `"functional"`, `"basic"`, `"reinforced"`. |
| `coated` | hayır | — | Yüzey kaplı mı. |
| `altitudeM` | hayır | m | Tablonun geçerli olduğu rakım. |

Ekran sonucu her zaman şu üçünün en büyüğüdür: profilden gelen değer, üretici
minimum değeri, kullanıcının şirket kuralı. Profil yüklü değilse yalnızca son
ikisi kullanılır ve sonuç standart tabanlı sayılmaz.

---

## `kind: "fab"`

Üretici yetenek sınırları. Hesabın alt sınırını belirler.

```json
{
  "schema": "alp-pcb-profile",
  "schemaVersion": 1,
  "kind": "fab",
  "name": "",
  "source": "",
  "note": "",
  "data": {
    "minTraceWidthMm": 0,
    "minSpacingMm": 0,
    "minDrillMm": 0,
    "minAnnularRingMm": 0,
    "maxAspectRatio": 0,
    "platingUm": 0,
    "drillPositionTolMm": 0,
    "etchTolMm": 0,
    "widthTolPct": 0,
    "copperTolPct": 0,
    "dielectricTolPct": 0,
    "epsToleranceAbs": 0
  }
}
```

`data` düz bir nesnedir; tüm alanlar sayısal olmalı, hepsi opsiyoneldir ama en
az biri bulunmalıdır. Kullanmadığınız alanı hiç yazmayın — `0` yazmak "sınır
yok" değil "sınır sıfır" anlamına gelir.

---

## `kind: "protocol"`

Empedans hedefi presetleri. Yalnızca form alanlarını doldurur; sonucun protokole
uygunluğunu **iddia etmez**.

```json
{
  "schema": "alp-pcb-profile",
  "schemaVersion": 1,
  "kind": "protocol",
  "name": "",
  "source": "",
  "note": "",
  "data": {
    "rows": [
      {
        "label": "",
        "targetOhm": 0,
        "tolerancePct": 0,
        "differential": true,
        "revision": ""
      }
    ]
  }
}
```

| Alan | Zorunlu | Açıklama |
| --- | --- | --- |
| `targetOhm` | evet | Hedef empedans, Ω. |
| `tolerancePct` | evet | İzin verilen sapma, %. |
| `label` | hayır | Preset adı. |
| `differential` | hayır | `true` diferansiyel, `false` tek uçlu. |
| `revision` | hayır | Kaynak doküman revizyonu. |

---

## Doğrulama hataları

İçe aktarma başarısız olursa ekran nedenini gösterir:

| Kod | Anlamı |
| --- | --- |
| `json` | Dosya geçerli JSON değil. |
| `schema` | `schema` alanı eksik veya yanlış. |
| `version` | `schemaVersion` bu sürümle uyuşmuyor. |
| `kind` | Bilinmeyen profil türü. |
| `field` | `name` veya `source` eksik. |
| `data` | `data` içeriği türün beklediği yapıda değil; mesaj hangi satır ve hangi alan olduğunu söyler. |
| `storage` | Tarayıcı depolaması kullanılamıyor veya kota doldu. |
