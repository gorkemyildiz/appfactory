# App Factory V1

Kişisel kullanım için düşük maliyetli mobil uygulama üretim paneli. Panel Türkçedir. Sprint 3’te düzenlenebilir plan/ekran/tasarım, sürüm takibi, Expo şablon üretimi ve kod kontrolleri bağlıdır; AI Planner isteğe bağlıdır; görsel referanslı Builder bağlıdır; APK derlemesi henüz kapalıdır.

## Çalıştırma

Node.js 22.14+ ve pnpm 10.28.2 gerekir.

```sh
corepack enable
pnpm install
pnpm dev
```

Ayrı terminalde:

```sh
pnpm dev:worker
```

Panel: http://127.0.0.1:3000 · Worker: http://127.0.0.1:4001/health.

Supabase veya AI anahtarı gerekmez. `WORKER_PORT` değiştirilirse hem web hem worker aynı değeri kullanmalıdır. Web için `apps/web/.env.local`, worker için terminal ortam değişkeni kullanın. `.env.example` örnekleri içerir. `pnpm` komutu yoksa `corepack enable` ile etkinleştirin.

## İş akışı

1. Yeni proje oluşturun. API anahtarı varsa AI Planner analizi başlar; yoksa ücretsiz yerel örnek plan açılır. Plan sayfasında AI taslağını inceleyip projeye uygulayın.
2. Planı onaylayın; ekranları seçip başlık ve açıklamalarını kaydedin. Tasarım sayfasında seçilen her ekranı inceleyip tasarımı onaylayın.
3. Geliştirme sayfasında **Expo projesini üret** düğmesine basın.
4. **Bağımlılıkları kur ve kontrolleri çalıştır** düğmesi npm bağımlılıklarını kurar; gerçek `tsc --noEmit` ve ESLint çalıştırır.
5. Gerçek sonuçlar ve işlem logları Testler sayfasında görünür. Başarılı kontroller projeyi Derleme aşamasına taşır.
6. Geliştirme/Testler/Derleme sayfasında **Expo önizlemesini başlat** düğmesini kullanın. Telefonla aynı Wi-Fi ağına bağlanın ve QR kodunu Expo Go ile açın. SDK 57 uyumlu Expo Go ve iPhone için panelde bağlı Expo hesabıyla giriş gerekir.
7. Telefonda kontrol ettiğiniz platformu seçip önizlemeyi onaylayın. EAS build ancak bu kod sürümü için onay varsa başlatılabilir; onay build işlemini kendiliğinden başlatmaz.

Üretilen uygulama seçtiğiniz ekranlardan oluşan **genel bir başlangıç şablonudur**. Ana ekran zorunludur; kayıt oluşturma, kayıt düzenleme, ayarlar ve kayıt ol ekranı seçilebilir. Kayıt ol yalnızca ad/e-posta alanları bulunan bir arayüz prototipidir; hesap oluşturmaz veya veri göndermez. Seçilmeyen ekranların route dosyaları üretilmez. AsyncStorage ile yerel veri saklar. Fikre özel iş mantığı AI tarafından yazılmaz. Typecheck/lint başarısı APK, cihaz testi veya mağaza yayını anlamına gelmez. EAS/Android derlemesi bağlı değildir; ücretli işlem başlatılmaz.

## Veri ve işler

- Panel projeleri ve manuel onaylar bu tarayıcının `app-factory.projects.v1` localStorage kaydında saklanır. Tarayıcı verilerini temizlemek bunları kaldırır.
- Worker iş kayıtları `workspace/jobs/<proje-id>.json` içinde atomik olarak yazılır. Restart sırasında yarım kalan işler başarısız işaretlenir; otomatik tekrar yapılmaz.
- Çıktı `workspace/generated-projects/<proje-id>/<iş-id>/` altında ayrı dizine yazılır. Var olan dizinin üzerine yazılmaz; aynı üretim isteği mevcut işi döndürür.
- `project-memory.json` proje özetini ve bütçesini içerir. Üretim kayıtları, loglar ve çıktılar Git’e dahil edilmez.
- Worker tek seferde bir iş çalıştırır. Kurulum en fazla 6 dakika, her kod kontrolü en fazla 2 dakika sürer. Son 20.000 karakter log saklanır.
- Doğrulama için ilk deneme + en fazla 2 manuel yeniden deneme vardır. Başarılı iş tekrar çalıştırılmaz. Başarısız dosya üretiminde eski çıktı korunur; yeni proje oluşturulabilir.
- Kurulum `npm install --ignore-scripts --no-audit --no-fund --fetch-retries=0` kullanır. Kullanıcı fikri bir komut veya kaynak kod olarak çalıştırılmaz; JSON olarak yazılır.
- Worker yalnızca loopback üzerinde dinler. Panel sunucusu, worker’ın ürettiği `workspace/.worker-token` ile haberleşir; token tarayıcıya verilmez. Bu kişisel yerel araçtır; internete dağıtım öncesinde kimlik doğrulama ve yetkilendirme eklenmelidir.

## Kontroller

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm format:check
```

Production build bu ortamda Turbopack’ın işlem bağlantısı hatası nedeniyle Next.js’in desteklediği `--webpack` seçeneğini kullanır. Geliştirme Turbopack ile çalışır. Worker esbuild ile bağımsız Node.js çıktısına derlenir; `pnpm --filter @app-factory/worker start` ile başlatılabilir.

## Paketler

- `apps/web`: Next.js App Router, Tailwind v4, shadcn/ui, React Hook Form; worker için yerel API köprüsü.
- `apps/worker`: kalıcı iş kuyruğu ve gerçek komut sonuçları.
- `packages/schemas`: Zod proje, iş ve istek şemaları.
- `packages/shared`: örnek içerikler, onay state machine’i ve maliyet ilkeleri.
- `packages/generator`: güvenli, ayrı dizine Expo şablon üretimi.
- `packages/database`: isteğe bağlı Supabase istemcisi. Kimlik bilgileri yoksa null döner.
- `packages/ai`: OpenAI Planner bağlantısı; Builder aynı görev servisini kullanır; Reviewer ileride eklenecek.
- `templates/expo-base`: Expo SDK 57 / Expo Router / TypeScript şablonu.
- `supabase/migrations`: ileride kalıcı proje veritabanı için ayrılmış dizin.

## Sonraki adımlar

AI Reviewer ile görsel/işlev incelemesi; Supabase kalıcılığı, authentication ve RLS. AI görevlerinde proje/görev bütçeleri ve en fazla 2 elle retry uygulanır. APK/EAS derlemesi ve cihaz doğrulaması ayrı aşamadır. V1 oyun üretmez.

## Sprint 3: düzenlenebilir plan ve tasarım

Plan sayfasında özet, kapsam maddeleri ve kapsam dışı açıklaması; Tasarım sayfasında renkler, köşe yuvarlaklığı ve ekran boşluğu düzenlenebilir. Kaydetmek yeni bir sürüm oluşturur; değişmeyen içerik sürüm artırmaz. Son 20 önceki sürüm salt okunur geçmişte saklanır. Bunlar da panel projeleri gibi bu tarayıcıda saklanır.

Plan değişikliği plan ve sonraki onayları, tasarım değişikliği tasarım ve sonraki onayları yeniler. Kaydedilmemiş içerik onaylanamaz. Bir sekmenin eski sürümü yeni sürümün üzerine yazamaz; bu durumda yenileme istenir.

Yeniden onaylanan sürüm için **Yeni sürümü üret** ayrı bir iş ve çıktı dizini oluşturur. Önceki iş kaydı `workspace/jobs/history/<proje-id>/<iş-id>.json` altında arşivlenir; önceki Expo klasörü korunur. Eski sürümün test sonucu güncel proje aşamasını ilerletmez.

Güncel plan `specification.json` ve `project-memory.json` dosyalarına aktarılır; plan özeti mobil ana ekranda kullanılır. Tasarım değerleri `src/theme.json` üzerinden Expo arayüzüne uygulanır. Builder onaylı görsellerden ekran kodu üretir; tüm kapsam maddeleri otomatik işlev koduna dönüşmez. Üretim isteği yalnızca güncel içeriği taşır, tüm sürüm geçmişini taşımaz.

## Geliştirmeden önce görsel inceleme

Tasarım sayfasında seçilen Expo ekranlarının gezilebilir, telefon çerçeveli HTML önizlemesi vardır. Ana ekranın boş/dolu listesi, örnek kayıt oluşturma/düzenleme ve ayarlar incelenebilir. Önizlemedeki veri gerçek uygulamaya yazılmaz. Renk, boşluk ve köşe değişiklikleri anında yansır; yerel cihaz kontrollerinin birebir ekran görüntüsü değildir.

Yeni tasarım onayları seçilen tüm ekranların ayrı ayrı incelenmesini gerektirir. Onay, incelenen ekranlarla birlikte geçerli sürüme kaydedilir. Plan/ekran/tasarım değişiklikleri görsel onayı da geçersiz kılar. Bu özellikten önce onaylanan projeler geriye dönük değiştirilmez. Ekran başlığı ve açıklaması önizleme ile Expo çıktısında aynı tanımlardan gelir. Ekran değişiklikleri projeyi ekran onayına döndürür. Mevcut projelerde varsayılan dört ekran korunur; kayıt ol seçeneği başlangıçta kapalıdır. Serbest bileşen ekleme ve gerçek kimlik doğrulama henüz yoktur.

## AI Planner kurulumu

`apps/worker/.env.example` dosyasını `apps/worker/.env` olarak kopyalayın ve `OPENAI_API_KEY` değerini yerel dosyaya ekleyin. Worker bu dosyayı başlangıçta okur; değişiklikten sonra yeniden başlatın. Anahtarı tarayıcıya, sohbete veya Git’e eklemeyin.

Planner, OpenAI Responses API üzerinden `gpt-4.1-mini-2025-04-14` modelini ve Structured Outputs kullanır. Resmî kaynaklar: [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs), [model ve fiyatlar](https://developers.openai.com/api/docs/models/gpt-4.1-mini). Yerel maliyet hesabı 23 Eylül 2026 tarihinde kontrol edilen standart giriş $0.40 / çıkış $1.60 (milyon token başına) değerlerini kullanır; fatura değildir ve fiyat değişiminde güncellenmelidir.

- Yalnızca proje adı, fikir ve platformlardan oluşan görev bağlamı gönderilir. Dosyalar ve sürüm geçmişi modele gönderilmez. İstekte `store: false` kullanılır.
- Plan, mevcut şablonlardan ekran seçimi, tasarım, önerilen alan/eylemler ve kabul kriterli geliştirme görevleri döner. Çıktı Zod ile doğrulanır.
- Görev başına toplam $0.10 ve proje bütçesi kontrol edilir. İstekten önce UTF-8 boyutu + ek pay ve 6.000 maksimum çıktı tokenı üzerinden bütçe ayrılır. Kullanım bilgisinde maliyet hesaplanır; belirsizse rezerv korunur.
- İlk istek + en fazla iki **manuel** yeniden deneme vardır. Aynı proje için süren veya tamamlanmış analiz tekrar ücretlendirilmez. Bu sürümde proje başına bir Planner işi bulunur; tamamlanmış analizi yeniden üretme henüz yoktur.
- İşler `workspace/planner/<proje-id>.json` dosyalarında kalır. Yeniden başlatmada yarım kalan isteğin rezervi belirsiz harcama olarak tutulur. Anahtar ve sağlayıcı hata gövdeleri kaydedilmez.
- Taslak uygulandığında yeni sürüm ve plan onayı oluşur. Eski taslak yeni düzenlemelerin üzerine yazılamaz. Taslak projede ve üretim belleğinde saklanır.
- Özel alan/eylem önerileri **henüz çalışan kod veya birebir görsel önizleme değildir**. Önizleme mevcut beş ekran şablonunu kullanır. Görevler Geliştirme sayfasında görünür; Görsel onayı bulunan projelerde Builder, mevcut yerel kayıt davranışını koruyarak ekran kodunu üretir.

## Görsel tasarım onayı

Tasarım sayfasının ana görünümü artık AI görsel galerisidir. Seçili her ekran için tasarım yönü ve isteğe bağlı değişiklik talebiyle bir PNG üretilir. Ekranlar kod veya şablon etkileşimleri üzerinden değil, görsel taslaklar üzerinden onaylanır. Önceki şablon önizlemesi kapalı bir ayrıntı bölümünde durur.

- Worker mevcut OPENAI_API_KEY ile Image API kullanır. GPT Image 2, medium kalite, 1024×1536 PNG; ekran başına tek çağrı. Model erişimi/kuruluş doğrulaması hesapta gerekli olabilir.
- Her çağrıda $0.20 yerel bütçe rezervi ayrılır. Bu, sağlayıcının kesin fatura limiti değildir; sabit boyut/kalite ve sınırlı girdi için koruyucu rezervdir. Kullanım tokenlarından maliyet hesaplanır; belirsiz sonuçlarda rezerv harcanmış kabul edilir. Proje bütçesi ve Planner harcaması birlikte kontrol edilir. [Resmî fiyatlandırma](https://developers.openai.com/api/docs/pricing) ve [görsel üretim rehberi](https://developers.openai.com/api/docs/guides/image-generation).
- Bir ekranın aynı proje sürümünde ilk üretim + iki manuel yeniden üretim hakkı vardır. Otomatik tekrar yoktur. Değişiklik isteği yeni bir taslak üretir; önceki görsel üzerinde piksel düzenlemesi yapmaz. Ayrı ekranların birebir stil tutarlılığı garanti edilmez; ortak tasarım yönü ve palet kullanılır.
- Görseller ve iş kayıtları workspace/design-images içinde tutulur. Sayfa yenileme yeniden ücretli çağrı başlatmaz. Önceki dosyalar korunur. Kayıtlar Git’e eklenmez.
- Her ekranın en güncel başarılı görseli incelenmeden toplu onay verilemez. Onay kaynak görsel kimliklerini kaydeder, proje sürümünü artırır ve geliştirmeyi açar. Proje değişince eski görsel onayı geçersiz kalır.
- Onaylanan görseller Expo çıktısındaki design-references klasörüne ve proje belleğine referans olarak aktarılır. **Geliştirme sayfasındaki Builder bu görselleri referans alır.** Görsel üzerindeki metin ve ikonlar da uygulama kodu değildir.

## Görsel referanslı Builder

- Geliştirme → Onaylı tasarımları kodla: her seçili ekran ayrı bir Responses API görevidir. Göreve yalnızca ilgili görsel, ekran dosyası, küçük ortak arayüzler ve proje özeti gönderilir.
- Çıktı ayrı bir Expo klasöründe oluşturulur. Her ekranın ardından gerçek TypeScript ve ESLint çalışır; ilk hatada durur. Elle en fazla iki retry; geçen ekranlar tekrar üretilmez.
- Çağrı başına $0.08 rezerv, ekran başına $0.24 sınır. Ortak proje bütçesi Planner/görsel/Builder maliyetlerini içerir. Belirsiz ücretler korunur.
- İşler workspace/builder içinde kalıcıdır. Yeniden başlatma otomatik API çağrısı yapmaz. Eski çıktı klasörleri korunur.
- Model yalnızca belirlenen ekran TSX dosyasını değiştirebilir; paket, kurulum komutu ve kontrol yapılandırmalarını değiştiremez. Kontroller ekran kodunu çalıştırmaz.
- Bu sürüm tasarım uygulaması ve mevcut yerel kayıt işlemleriyle sınırlıdır. Gerçek authentication, yeni backend entegrasyonları, görseldeki özgün illüstrasyonlar ve APK üretimi garanti edilmez. Kod kontrollerinin geçmesi görsel uyum veya cihaz testi anlamına gelmez.
- Görsel girişi: https://developers.openai.com/api/docs/guides/images-vision

## Expo Go önizleme yönetimi

Worker tek bir Expo Go LAN önizlemesini yönetir (8100–8149 arası boş port). Başlat/durdur, iOS ve Android manifest kontrolü, yerel QR üretimi ve Expo günlükleri paneldedir. Fast Refresh açıktır. Bilgisayar/worker açık kalmalıdır; worker kapanırken kendisinin başlattığı Metro sürecini sonlandırır. Yeniden açıldığında önizleme manuel başlatılır.

Cihaz onayı `workspace/previews` içinde kaynak işine ve kaynak dosyalarının SHA-256 özetine bağlı saklanır. Kod değişirse onay geçersizdir. Test edilmemiş diğer platform başarılı sayılmaz. Mevcut EAS geçmişi korunur, yeni build istekleri önizleme onayı gerektirir. Expo Go dışındaki özel native modüller ileride development build gerektirebilir. LAN dışından tünel erişimi bu sürümde yoktur.

## Ekran bazında AI revizyonu

Geliştirme, Testler ve Derleme sayfalarında **AI ile değişiklik iste** alanı vardır. Kontrolleri geçmiş kaynak sürüm ve açık ekran seçilir; en fazla 2000 karakterlik istek tek Builder görevine gider. Hem şablon çıktıları hem görselden üretilmiş ekranlar desteklenir. Referans görsel yoksa mevcut ekran tasarımı esas alınır.

Revizyon, kaynak dosyaları yeni iş klasörüne kopyalar; eski çıktıya dokunmaz. Yalnızca seçilen ekran dosyası AI tarafından değiştirilir. TypeScript/ESLint başarısızsa aday ekran geri alınır. Her görev için mevcut $0.24 sınırı, $0.08 rezervasyon ve en fazla üç deneme uygulanır; otomatik retry yoktur. İş kimliği yinelenen gönderimleri engeller. Kurulum dosyaları, bağımlılıklar ve ortak modüller AI tarafından düzenlenmez.

Başarılı revizyonlar sürüm seçicisinde görünür; eski sürüme dönmek mümkündür. Yeni sürümün Expo önizlemesi ve kullanıcı onayı ayrı alınır. EAS build kendiliğinden başlamaz. API: GET/POST `/api/revisions`; iş kayıtları mevcut `workspace/builder` dizinindedir. Structured Outputs biçimi: https://developers.openai.com/api/docs/guides/structured-outputs
