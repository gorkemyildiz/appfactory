# Gerçek AI revizyon doğrulaması — 25 Eylül 2026

Başlangıç: `main`, `8c929bd`. Çalışma ortamı Windows / Node.js 24.11.1 / pnpm 10.28.2. Lockfile ile kurulan Next.js sürümü 16.3.6; kurulu `dist/docs` içindeki Route Handler belgesi okundu.

## Gerçek çağrı sonucu

Mac'teki eski çıktı ve iş kayıtları bu klonda bulunmadığından mevcut Expo şablonuyla ayrı `revision-live-validation` test projesi oluşturuldu. Bu, eski cihazda doğrulanmış uygulamanın veya görselden Builder üretiminin yeniden doğrulaması değildir. Test projesi worker HTTP API üzerinden oluşturuldu; tarayıcı localStorage'ına eklenmedi. Panel üzerinden tıklayarak uçtan uca test yapılmadı.

- Kaynak iş: `c4f5164e-dff3-4147-9646-8ab05d90fa29`.
- Revizyon işi: `564dec5f-35c2-437f-ba5e-439ec3c2dbe9`.
- İstek: ana ekran boş mesajını “Listeniz henüz boş.” yap; fontSize 16, marginTop 12; diğer davranışları koru.
- Gerçek Responses API Builder çağrısı: **1**; manuel veya otomatik yeniden deneme yok.
- Kullanım tabanlı yerel maliyet hesabı: **$0.003140**. Belirsiz maliyet: **$0**. Bu tutar sağlayıcı faturası değildir.
- Koddan doğrulanan rezerv: $0.08; görev sınırı: $0.24; ilk çağrı + en fazla iki manuel yeniden deneme.
- Kaynak ve revizyon ayrı çıktı dizinlerinde. Kaynak dosyaların SHA-256 karşılaştırması değişiklik olmadığını doğruladı.
- Revizyonun gerçek TypeScript ve ESLint kontrolleri başarılı.
- AI yalnızca `app/index.tsx` dosyasını değiştirdi. Worker `builder-report.json` yazdı; npm kurulumu kilit dosyasındaki isteğe bağlı paket/metaveri kayıtlarını güncelledi. Expo ilk açılışta `tsconfig.json` include listesini güncelledi.
- Expo'nun dosya güncellemesinden sonra önizleme yeniden başlatıldı; oturum fingerprint'i güncel kaynakla eşleşiyor.
- SDK 57 iOS ve Android manifestleri ve JavaScript bundle istekleri HTTP 200 döndü. Her iki pakette revize edilen metin bulundu.
- QR: `workspace/tools/revision-preview.html` ve `workspace/tools/revision-preview.svg`. LAN adresi ve oturum bilgileri geçicidir; worker/Metro açık ve telefon aynı ağda olmalıdır.

## Sınırlar ve kalite bulgusu

AI, boş mesajda ortak `styles.text` stilini yerel stille değiştirdi: mevcut tema rengiyle aynı olan `#171717` değerini sabitledi ve `lineHeight: 24` değerini taşımadı. İstenen metin/üst boşluk değişti, ancak bu çıktı kusursuz stil koruması olarak değerlendirilmemelidir. Model çıktısı elle düzeltilmedi; gerçek çağrının sonucu olduğu gibi korundu. Sonraki Builder iyileştirmesi mevcut stilleri diziyle birleştirmeyi ve talep edilmeyen stil özelliklerini korumayı hedeflemeli.

Fiziksel iPhone/Android testi ve kullanıcı önizleme onayı **yapılmadı**. EAS build, iOS dağıtımı ve EAS Update başlatılmadı. Bu test görsel referans kullanmadı; görsel → Builder → cihaz akışının genel güvenilirliğini kanıtlamaz.

## Mock testler ve proje kontrolleri

Gerçek model çağrısından ayrı olarak **55/55 otomatik test geçti**. AI servis yanıtları testlerde mock'tur. Lint, monorepo typecheck ve production web/worker build başarılı. Cihaz başarısı bu sonuçlardan çıkarılamaz.

Windows'ta ortaya çıkan sorunlar düzeltildi:

- `shell: false` korunarak npm.cmd yerine Node ile npm CLI giriş dosyasını çalıştırma; gerekli Windows ortam dizinlerini kontrollü aktarma. AI/Expo anahtarları bu komut ortamına eklenmez.
- Üreticide kapalı ekran filtreleri için yol ayıraçlarını normalleştirme.
- Testlerde sabit `/tmp` yerine işletim sistemi geçici dizini, dizin bağlantısı testlerinde Windows junction ve CRLF uyumu.
- EAS test bekleyicisinin yalnızca durum değişimini değil, son kayıt yazımının ve işlem kilidinin bitmesini beklemesi. Gerçek EAS gönderimi yapılmadı.

Anahtarlar yazdırılmadı veya Git'e eklenmedi. Yerel çıktılar ve doğrulama araçları mevcut ignore kuralları kapsamında. Commit/push yapılmadı.
