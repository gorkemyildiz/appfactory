"use client";
import { useState, type CSSProperties } from "react";
import { ArrowLeft, Check, Smartphone } from "lucide-react";
import {
  getScreens,
  type ScreenDefinition,
  type Project,
  type Specification,
} from "@app-factory/schemas";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
type Screen = ScreenDefinition["id"];
export function MobilePreview({
  project,
  specification,
  canReview,
  onReview,
}: {
  project: Project;
  specification: Specification;
  canReview: boolean;
  onReview: (screens: Screen[]) => void;
}) {
  const [screen, setScreen] = useState<Screen>("home");
  const [reviewed, setReviewed] = useState<Screen[]>([]);
  const [example, setExample] = useState(true);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [validation, setValidation] = useState("");
  const [item, setItem] = useState({
    title: "Örnek kayıt",
    notes: "Uygulamanızdaki bir kaydın nasıl görüneceğini inceleyin.",
  });
  const selected = getScreens(specification).filter((s) => s.enabled);
  const screens = Object.fromEntries(
    getScreens(specification).map((s) => [s.id, s]),
  ) as Record<Screen, ScreenDefinition>;
  const theme = specification.design;
  const navigate = (next: Screen) => {
    setScreen(next);
    setValidation("");
    setTitle(next === "details" ? item.title : "");
    setNotes(next === "details" ? item.notes : "");
  };
  const button: CSSProperties = {
    background: theme.primary,
    color: "#fff",
    borderRadius: theme.radius,
    minHeight: 48,
    padding: 12,
    fontSize: 16,
    fontWeight: 600,
    width: "100%",
  };
  const field: CSSProperties = {
    background: "#fff",
    color: theme.text,
    border: "1px solid #999",
    borderRadius: theme.radius,
    padding: 12,
    fontSize: 16,
    width: "100%",
    minHeight: 48,
  };
  const mark = () => {
    const next = [...new Set([...reviewed, screen])];
    setReviewed(next);
    onReview(next);
  };
  const save = () => {
    if (!title.trim()) {
      setValidation("Başlık girin.");
      return;
    }
    setItem({ title: title.trim(), notes });
    setExample(true);
    navigate("home");
  };
  return (
    <section
      aria-label="Mobil ekran önizlemeleri"
      className="rounded-xl border bg-white p-4 sm:p-6"
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-semibold">
            <Smartphone size={18} />
            Ekran önizlemeleri
          </h3>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            Butonlara dokunarak ekranlar arasında gezinin. Örnek veriler
            yalnızca bu önizlemede kullanılır.
          </p>
        </div>
        <Badge variant="outline">
          {reviewed.length}/{selected.length} ekran incelendi
        </Badge>
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(150px,1fr)_minmax(0,360px)]">
        <div className="space-y-3">
          <nav aria-label="Önizleme ekranları" className="space-y-2">
            {selected.map(({ id }) => (
              <button
                type="button"
                key={id}
                aria-pressed={screen === id}
                onClick={() => navigate(id)}
                className={cn(
                  "w-full rounded-lg border p-3 text-left",
                  screen === id
                    ? "border-foreground bg-muted"
                    : "hover:bg-muted/50",
                )}
              >
                <span className="flex items-center justify-between text-sm font-medium">
                  {screens[id]?.name}
                  {reviewed.includes(id) && (
                    <Check size={16} aria-label="İncelendi" />
                  )}
                </span>
                <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                  {screens[id]?.description}
                </span>
              </button>
            ))}
          </nav>
          {screen === "home" && (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => setExample(!example)}
            >
              {example ? "Boş listeyi göster" : "Örnek kayıtları göster"}
            </Button>
          )}
          <p className="text-xs leading-5 text-muted-foreground">
            Bu, üretilecek Expo şablonunun taslak web önizlemesidir. Cihazın
            yazı tipi, klavyesi ve yerel gezinme çubuğu farklı görünebilir.
            Kayıt ol ekranı yalnızca bir arayüz prototipidir.
          </p>
          <p className="text-xs leading-5 text-muted-foreground">
            {canReview
              ? "Her ekranı inceleyip işaretleyin. Seçilen tüm ekranlar tamamlanınca aşağıdan tasarımı onaylayabilirsiniz."
              : "İnceleme onayı için önce geçerli değişiklikleri kaydedin. Değişiklikler ekran incelemelerini sıfırlar."}
          </p>
        </div>
        <div className="min-w-0">
          <div className="mx-auto w-full max-w-[360px] overflow-hidden rounded-[32px] border-[6px] border-neutral-800 bg-neutral-800 shadow-sm">
            <div className="flex h-7 items-center justify-center">
              <span className="h-1 w-14 rounded-full bg-neutral-500" />
            </div>
            <div
              role="region"
              aria-label={`${screens[screen]?.name} telefon önizlemesi`}
              style={{ background: theme.background, color: theme.text }}
            >
              <div className="flex min-h-14 items-center gap-3 border-b border-neutral-300 px-4 text-base font-semibold">
                {screen !== "home" && (
                  <button
                    type="button"
                    aria-label="Önizlemede ana ekrana dön"
                    onClick={() => navigate("home")}
                  >
                    <ArrowLeft size={20} />
                  </button>
                )}
                {screens[screen]?.name}
              </div>
              <div
                className="h-[500px] overflow-y-auto break-words text-base leading-6"
                style={{ padding: theme.spacing }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: theme.spacing,
                  }}
                >
                  <p>{screens[screen]?.description}</p>
                  {screen === "home" ? (
                    <>
                      <h4
                        style={{
                          fontSize: 24,
                          fontWeight: 600,
                          lineHeight: "32px",
                        }}
                      >
                        {project.name}
                      </h4>
                      <p>{specification.plan.summary}</p>
                      <p>
                        Başlangıç şablonu · Fikre özel özellikler henüz
                        üretilmedi.
                      </p>
                      {screens.create?.enabled && (
                        <button
                          type="button"
                          style={button}
                          onClick={() => navigate("create")}
                        >
                          {screens.create.name}
                        </button>
                      )}
                      {example ? (
                        <button
                          type="button"
                          disabled={!screens.details?.enabled}
                          onClick={() => navigate("details")}
                          className="text-left"
                          style={{
                            padding: 16,
                            border: "1px solid #ddd",
                            borderRadius: theme.radius,
                            background: "#fff",
                          }}
                        >
                          <span className="block text-2xl font-semibold">
                            {item.title}
                          </span>
                          <span className="mt-2 block">{item.notes}</span>
                        </button>
                      ) : (
                        <p>
                          Henüz kayıt yok.
                          {screens.create?.enabled
                            ? " İlk kaydınızı ekleyin."
                            : ""}
                        </p>
                      )}
                      {screens.settings?.enabled && (
                        <button
                          type="button"
                          style={button}
                          onClick={() => navigate("settings")}
                        >
                          {screens.settings.name}
                        </button>
                      )}
                      {screens.register?.enabled && (
                        <button
                          type="button"
                          style={button}
                          onClick={() => navigate("register")}
                        >
                          {screens.register.name}
                        </button>
                      )}
                    </>
                  ) : screen === "register" ? (
                    <>
                      <label htmlFor="preview-name">Ad</label>
                      <input
                        id="preview-name"
                        style={field}
                        placeholder="Adınız"
                        autoComplete="off"
                      />
                      <label htmlFor="preview-email">E-posta</label>
                      <input
                        id="preview-email"
                        type="email"
                        style={field}
                        placeholder="E-posta adresiniz"
                        autoComplete="off"
                      />
                      <button
                        type="button"
                        disabled
                        style={{ ...button, opacity: 0.5 }}
                      >
                        Kayıt ol · Yakında
                      </button>
                      <p>
                        Arayüz prototipi. Hesap oluşturulmaz ve bilgiler
                        gönderilmez.
                      </p>
                    </>
                  ) : screen === "settings" ? (
                    <>
                      <h4 className="text-2xl font-semibold">
                        Uygulama bilgileri
                      </h4>
                      <p>{project.name}</p>
                      <p>{example ? 1 : 0} kayıt bu cihazda saklanıyor.</p>
                      <p>
                        Veriler sunucuya gönderilmez. Uygulamayı kaldırmak yerel
                        verileri silebilir.
                      </p>
                      <p>App Factory başlangıç şablonu · Sürüm 1.0.0</p>
                    </>
                  ) : screen.startsWith("custom-") ? (
                    <p>
                      Özel ekran başlangıcı. Davranışlar Builder aşamasında
                      hazırlanır.
                    </p>
                  ) : (
                    <>
                      <label htmlFor="preview-title">Başlık</label>
                      <input
                        id="preview-title"
                        style={field}
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        maxLength={120}
                        placeholder="Kayıt başlığı"
                      />
                      <label htmlFor="preview-notes">Notlar</label>
                      <textarea
                        id="preview-notes"
                        style={{ ...field, minHeight: 120 }}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        maxLength={5000}
                        placeholder="Notlarınızı yazın"
                      />
                      {validation && (
                        <p role="alert" className="text-sm text-red-700">
                          {validation}
                        </p>
                      )}
                      <button type="button" style={button} onClick={save}>
                        Kaydet
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex h-6 items-center justify-center">
              <span className="h-1 w-20 rounded-full bg-neutral-500" />
            </div>
          </div>
          <Button
            type="button"
            variant={reviewed.includes(screen) ? "outline" : "default"}
            disabled={!canReview || reviewed.includes(screen)}
            onClick={mark}
            className="mt-4 w-full"
          >
            {reviewed.includes(screen)
              ? "Bu ekran incelendi"
              : "Bu ekranı inceledim"}
          </Button>
        </div>
      </div>
    </section>
  );
}
