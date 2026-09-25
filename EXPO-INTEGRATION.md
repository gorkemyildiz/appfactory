# Expo / EAS entegrasyonu

## Karar

- Geliştirme döngüsü: yerel Expo / Metro önizlemesi. Her ekran değişikliğinde bulut derlemesi çalıştırılmaz.
- Cihazda doğrulama: EAS Build, Android `preview` profili, APK ve internal distribution.
- İlk APK doğrulandıktan sonra EAS Update: uyumlu runtime için JS/görsel güncellemeleri. Native bağımlılık değişirse yeni native derleme gerekir.
- iOS dağıtımı ve mağaza gönderimi sonraki aşamada; bu aşama mağazaya otomatik gönderim yapmaz.
- Otomasyon: worker üzerinden resmi EAS CLI. Token yalnızca EAS sürecine aktarılacak; AI çağrıları, üretilen uygulama ve tarayıcı bu token'ı almayacak.

## Hazır olanlar

Yeni üretilen Expo projelerinde `eas.json` Android APK profili, `.easignore` ve proje kimliğinden türetilmiş sabit `android.package` / `ios.bundleIdentifier` bulunur. İsim değişikliği veya yeni çıktı klasörü uygulama kimliğini değiştirmez. Mevcut çıktı klasörleri değiştirilmez.

`.easignore` anahtarları, ortam dosyalarını, AI plan/maliyet belleğini ve referans tasarım görsellerini dışlar. Uygulama kaynak kodu bulut derlemesinde Expo'ya yüklenir.

## Panelden derleme

Worker EXPO_TOKEN ve isteğe bağlı EAS_CLI_PATH kullanır. Yerel CLI kurulumu workspace/tools/eas-cli altındadır. Token tarayıcıya veya AI süreçlerine aktarılmaz.

Panel güncel ve kontrolleri geçmiş Android çıktısını gönderir. Worker TypeScript ve ESLint kontrollerini tekrar çalıştırır; resmi CLI ile hesap doğrulaması, proje eşlemesi ve derleme yapar. Eşlemeler workspace/eas/links, işler workspace/eas/jobs altında kalıcıdır.

Gönderim, kuyruk, derleme, tamamlanma ve hata ayrı durumlardır. Tamamlanan iş için APK bağlantısı gösterilir. Belirsiz gönderim yeni iş başlatmaz; Expo build kimliği ile eşleştirilir. Aynı çıktı için en fazla üç manuel deneme vardır.

Yeni uygulamada Android imzalaması kurulmamışsa panel bir defalık eas credentials:configure-build --platform android --profile preview komutunu gösterir. Expo hesabında oturum açılarak çalıştırılır. Android cihaz testi otomatik başarılı sayılmaz.

Panelden Expo Go LAN önizlemesi, ortak iOS/Android QR kodu ve sürüme bağlı kullanıcı onayı eklendi. Build öncesinde bu onay zorunludur. EAS Update ve iOS dağıtımı sonraki işlerdir.

## Maliyet

EAS kotası AI dolar bütçesinden ayrıdır. Ücretsiz hesapla başlanabilir; bulut derlemeleri kullanıcı isteğiyle başlatılacak ve sınırsız otomatik retry olmayacak. Kota/fiyat bilgisi hesaptan kontrol edilmeden sabit bir ücretsiz hak sayısı varsayılmayacak.

## Resmi kaynaklar

- https://docs.expo.dev/accounts/programmatic-access/
- https://docs.expo.dev/build-reference/apk/
- https://docs.expo.dev/build/building-on-ci/
- https://docs.expo.dev/eas-update/getting-started/
- https://expo.dev/pricing

## İlk bulut doğrulaması tamamlandı

Expo token hesabı gorkeemyildiz olarak doğrulandı. Ayrı app-factory-validation projesi bağlandı, Android keystore EAS tarafından oluşturuldu ve ilk preview APK derlemesi FINISHED durumuna ulaştı. Ayrıntılar EAS-VALIDATION.md dosyasındadır. Bu doğrulama elle düzeltilmiş test ekranına aittir. Panelden EAS proje eşlemesi ve derleme yönetimi eklendi. Mevcut APK durumu yeni entegrasyonla doğrulandı. Cihaz doğrulaması ve EAS Update henüz yapılmadı.
