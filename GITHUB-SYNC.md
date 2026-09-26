# Üretilen uygulamaları GitHub ile paylaşma

Her proje `GITHUB_OWNER/appfactory-<proje-id>` adında **private** bir depoya gönderilir. Her Builder çıktısı `factory-<iş-id>` dalında tutulur; sonraki gönderimler o dalın commit geçmişini ilerletir. App Factory kaynak deposuna üretilen uygulamalar eklenmez.

## Üç bilgisayarda kurulum

1. App Factory'nin bu sürümünü her bilgisayara alın; aynı Supabase çalışma alanını kullanın.
2. Her bilgisayarın yerel `.env` veya `apps/worker/.env` dosyasında `GITHUB_TOKEN` ve **aynı** `GITHUB_OWNER=gorkemyildiz` değerlerini tanımlayın. Token paylaşmak yerine her ekip üyesi kendi PAT'ını kullanabilir; ilgili private depolara erişimi bulunmalıdır.
3. PAT için repository Contents read/write gerekir. Uygulamanın yeni repo oluşturabilmesi için hesabın ve token'ın repo oluşturma yetkisi de bulunmalıdır. Fine-grained PAT repository seçimi yeni depoları kapsamalıdır. Yetki yoksa aynı adla private repo oluşturup token'a erişim verin.
4. Worker'ı yeniden başlatın. Token tarayıcıya, API yanıtına, GitHub'a veya üretilen uygulamaya verilmez.

GITHUB_OWNER boşsa PAT'ın hesap adı kullanılır. Ekip üyeleri farklı hesaplardaki PAT'ları kullanıyorsa GITHUB_OWNER mutlaka aynı olmalıdır. Private repo erişimi GitHub Settings > Collaborators bölümünden repo sahibi tarafından yönetilir; bu uygulama davet göndermez.

## Kullanım

- Builder tamamlandığında veya başarısız olup durduğunda kaynak dosyaları ve görev kaydı otomatik gönderilir. Bir aktarım hatası kod üretim sonucunu değiştirmez; panelde ayrıca gösterilir.
- Önceden üretilen çıktılar için Geliştirme/Testler/Derleme sayfasındaki **Yerel çıktıları GitHub'a gönder** düğmesini kullanın.
- Diğer bilgisayarda ortak projeyi açın, **GitHub sürümlerini göster**, ardından **Bu bilgisayara al ve kontrol et** düğmesine basın. İndirme AI çağrısı veya EAS build başlatmaz.
- Bağımlılıklar scripts kapalı kurulur. Tamamlanmış çıktılar yerel TypeScript/ESLint kontrollerinden geçmeden hazır sayılmaz. Başarısız çıktıların görev/deneme/maliyet kayıtları korunur; mevcut manuel model onayıyla devam edilir.
- Yerel değişiklikler korunur. Uzak dal ilerlediyse gönderim reddedilir; force-push yapılmaz. Yerel çıktı son eşitlenen halinden değişmişse indirme üzerine yazmaz. Böyle bir eşzamanlı düzenlemede iki sürüm korunur; otomatik merge yoktur. Temiz çıktının güncellenmesinde eski klasör `-backup-...` adıyla yerelde kalır.

## Kapsam ve sınırlar

`.env`, gizli dosyalar, Git metaverisi, node_modules, Expo oturumları, derleme çıktıları ve tasarım referansları aktarılmaz. Tasarım görselleri mevcut Supabase mekanizmasıyla paylaşılır. Uygulamanın `src/runtime/connection.json` dosyası boş yapılandırmayla aktarılır; gerçek bağlantılar yeni bilgisayarda yeniden tanımlanmalıdır. QR oturumları, önizleme onayları, tamamlanma listesi ve EAS cihaz onayı bilgisayara özeldir.

Dosya limiti 5 MB, çıktı limiti 25 MB ve 500 dosyadır. Bilinen anahtar biçimleri bulunduğunda aktarım engellenir. Token yalnızca api.github.com isteklerinde kullanılır. Yeniden başlatma sırasında yarım kalmış aktarım otomatik tekrar edilmez; panelde manuel gönderim kullanılabilir. Gerçek cihaz testi ayrıca gereklidir.

GitHub API referansları: [Git trees](https://docs.github.com/en/rest/git/trees), [Git references](https://docs.github.com/en/rest/git/refs).
