# Brif İnceleme Notları — "Birinci ve İkinci Paket Araçlarının Geliştirilmesi"

Doküman baştan sona incelendi, repo ile çapraz kontrol edildi ve 10 test örneğinin
tamamı bağımsız hesapla doğrulandı. **Sayısal içerik tümüyle doğru** — hiçbir formülün
fiziği ya da test değeri değişmeyecek. Aşağıdakiler uygulamaya başlamadan önce
dokümanda düzeltilmesi / netleştirilmesi gerekenler.

---

## A. Formül bloklarının onarımı (en kritik iş)

Doküman Google Docs → Markdown dönüşümünde bozulmuş. İki bozulma türü var:

1. **~115 formül bloğunda `=` işareti düşmüş.** Desen hep aynı: formülün açılış
   `\[` satırı `# **\[**` başlığına dönüşmüş, formülün sol tarafı (örn. `l_stub`)
   ayrı bir `# **...**` başlık satırı olmuş, eşittir işareti kaybolmuş.
2. **7 blokta eksi işaretleri tamamen silinmiş.** Kendi satırında duran `−` işaretli
   terimler başlık satırına dönüşürken işareti yutulmuş (`+` işaretleri `\+` olarak
   hayatta kalıyor, `−` işaretleri kayboluyor). Bu bloklar yanlışlıkla toplama olarak
   okunursa sonuç tersine döner.

**İstenen düzeltme:** Dokümanı kaynağından (Word/Google Docs) formüller düz metin ya da
düzgün LaTeX olacak şekilde yeniden dışa aktar; bu mümkün değilse en azından aşağıdaki
7 bloğu elle düzelt ve işaretleri açıkça yaz.

### İşaret kaybı olan 7 blok — bağlamdan çıkardığımız hâli, lütfen teyit et

| Bölüm | Formül (bizim okuduğumuz hâli) | Dayanak |
|---|---|---|
| §5.8 | `l_nominal,target = l_residual,max − Δl_fabrication − l_safety` | Üstteki cümle "üretim toleransı çıkarıldıktan sonra"; altta "negatif sonuçta hata ver" |
| §6.7 | `R_g,ext,on = R_total,on,target − R_drv,src − R_g,int − R_trace` | "Negatif direnç sonucu driver'ın yavaş kaldığını gösterir" cümlesi |
| §7.5 | `R_source,max = R_eq,max − R_switch − R_series − R_driver` | Aynı bölümdeki `R_eq` toplam tanımının tersine çözümü; "negatif sonuç buffer gerektirir" |
| §8.5 | `L_max = (t_sample − t_fixed_delays) / (2 · t_pd,per_meter)` | §8.4'teki marj formülüyle tutarlılık |
| §13.5 | `I_L,min = I_out − ΔI_L/2` | İkiz formül `I_L,peak = I_out + ΔI_L/2`'de `+` hayatta; CCM sınırı tanımı |
| §14.5 | `I = (V_surge − V_clamp(I)) / (R_source + R_series)` | §14.4'te aynı denklemin bozulmamış hâli mevcut |
| §17 | `f_k = 10^{ log10(f_min) + (k/(N−1)) · [ log10(f_max) − log10(f_min) ] }` | Standart log-uzay interpolasyonu; `+` işareti blokta hayatta |

Yedisi de ÇIKARMA olarak çözüldü; niyet farklıysa mutlaka belirt.

---

## B. Tanımsız bırakılmış kararlar — değer/politika iste

Bu beş nokta dokümanda "yapılmalı" diye geçiyor ama nasıl yapılacağı tanımsız.
Test beklentileri bunlar sabitlenmeden yazılamaz:

1. **§10.9 PDN tepe tespiti — prominence eşiği.** "Minimum prominence eşiği
   kullanılmalıdır" deniyor; eşiğin değeri ve tanımı yok. Mutlak dB mi, komşu
   minimuma oran mı? Varsayılan değer ne? Kullanıcı değiştirebilsin mi?
2. **§14.4–14.5 TVS iteratif clamp çözümü.** Yakınsama toleransı, maksimum iterasyon
   sayısı ve yakınsamama durumunun hata kodu tanımsız. §18 hata listesine
   `TVS_SOLVER_NO_CONVERGENCE` gibi bir kod eklenmeli mi?
3. **§12.8 damping "en iyi bölge".** Parametrik sweep ile peak empedans / attenuation /
   güç kaybı arasında "en iyi bölgeyi göster" deniyor — amaç fonksiyonu tanımsız.
   Üç eğri yan yana gösterilip karar kullanıcıya mı bırakılacak, yoksa ağırlıklı bir
   skor mu istenirsin? (Önerimiz: skor uydurma, üç eğriyi göster.)
4. **§8.5 `t_fixed delays` tanımı.** Bu terim dokümanda hiç tanımlanmıyor. §8.4'teki
   bileşenlerden `t_fixed = t_controller + t_TX + t_isolator,TX + t_RX + t_isolator,RX`
   (yani `t_loop − t_round_trip`) olarak mı türetilecek? Bir cümleyle tanımla.
5. **§16 Monte Carlo — PRNG politikası.** "Deterministik seed" şart koşuluyor ama
   üreteç tanımsız. `Math.random` kullanılamaz; seed'li saf bir üreteç (örn.
   mulberry32/xorshift) kabul mü? Seed'i kullanıcı mı girer, sabit mi?

---

## C. Doküman içi tutarsızlıklar

1. **ESL_total iki farklı sembolle tanımlı:** §4.7'de `L_vias`, §10.4'te `L_via`.
   Fizik aynı; tek sembol seç (ortak motorda tek tanım olacak).
2. **§2 ile §10.10 gerilimi:** §2 "yalnızca empedans büyüklüklerini toplayarak PDN
   hesabı yapılmamalıdır" der; §10.10 ise `ΔV_approx ≈ ΔV_C + ΔV_ESR + ΔV_ESL`
   cebirsel toplamını ister. Niyet belli (worst-case istisnası) ama §10.10'a açıkça
   "bu, §2'deki kuralın bilinçli worst-case istisnasıdır; ana Z_total hesabı her zaman
   kompleks kalır" cümlesi eklenirse çelişki kapanır.
3. **Araç adları giriş listesi ile bölüm başlıkları arasında kayıyor** (örn. giriş:
   "Power Plane Rezonans ve Düzlem Kapasitansı", §11: "Power Plane Rezonansı ve
   Düzlem Kapasitansı"). §1 "araç anahtarı, rota, rapor anahtarı birebir uyumlu olmalı"
   dediği için her aracın TEK resmi Türkçe adı + İngilizce adı net yazılmalı.
   12 araç için iki dilli kesin ad listesi eklenirse en iyisi olur.

---

## D. Repo gerçekleriyle uyum (küçük ama gerekli)

1. **İsim çakışması:** Sitede hâlihazırda "Güç Düzlemi ve Paralel Yol" (`power-plane`)
   adında bir araç var — DC akım kapasitesi hesabı, rezonansla ilgisiz. Yeni §11 aracının
   adı ve URL kimliği bununla karışmayacak biçimde seçilmeli (örn. "Düzlem Kavite
   Rezonansı ve Kapasitansı" gibi ayırt edici bir ad öner).
2. **Dosya yolları:** Dokümandaki `src/...` yolları gerçekte `web/src/...` (repo
   web + api olarak ikiye ayrık). Ayrıca `src/pages/tools/<ToolName>/` yapısı beş değil
   altı dosya içeriyor: `report.test.js` de zorunlu. §1'deki yapı şablonuna eklenebilir.
3. **Mevcut PDN araçları hakkında:** §10.1 "Mevcut PDN Target Impedance ve Decoupling
   araçlarını silme" talimatı repo durumuyla uyumlu — ikisi de aktif, dokunulmayacak.
   Bu madde değişiklik istemez, sadece teyit.
4. **§18 hata kodları:** B-2'deki TVS yakınsama koduna ek olarak, log eksende
   sıfır/negatif değer durumu (§17) için de bir kod düşünülebilir
   (örn. `LOG_AXIS_NONPOSITIVE`). Zorunlu değil, öneri.

---

## E. Değişiklik GEREKTİRMEYENLER (teyit)

- 10 test örneğinin tamamı bağımsız hesapla doğrulandı, hepsi doğru:
  §4.12 (1.30 nH / 4.08 Ω), §5.11 (7.495 / 14.99 GHz), §6.12 (4 mA / 40 mW / 0.5 A / 20 ns),
  §7.12 (5.55 kΩ), §9.11 (3.22 mA / 0.5 W), §11.11 (3.54 nF / 749.5 MHz),
  §12.12 (15.915 kHz / 1 Ω), §13.16 (D=0.5 / 20 µH / 5.75 A / 2.5 A / 18.75 µF),
  §14.12 (33.5 A / 1105.5 W), §15.13 (2.4 mm / %4.17).
- Mimari kurallar (saf motor, iki dil, SI, lazy load, kompleks hesap zorunluluğu)
  projenin mevcut kurallarıyla birebir uyumlu — değişiklik istemez.
- Paket sıralaması (ortak motorlar → paket 1 → paket 2 → entegrasyon) uygun.

---

*Özet: A bölümü (formül onarımı) olmadan doküman uygulama kaynağı olarak kullanılamaz;
B bölümündeki beş karar test yazımını blokluyor; C ve D küçük ama ucuz düzeltmeler.
Bunlar gelince geliştirme başlayabilir.*
