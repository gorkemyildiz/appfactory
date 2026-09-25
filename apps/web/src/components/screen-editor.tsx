"use client";
import { useState } from "react";
import Link from "next/link";
import {
  getScreens,
  getSpecification,
  screensSchema,
  type Project,
  type ScreenDefinition,
} from "@app-factory/schemas";
import { useProjects } from "./project-provider";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Card } from "./ui/card";
import { ChevronDown, Plus, Trash2 } from "lucide-react";

export function ScreenEditor({ project }: { project: Project }) {
  const { editSpecification, advance } = useProjects();
  const [baseline, setBaseline] = useState(() => getSpecification(project));
  const [screens, setScreens] = useState(() => getScreens(baseline));
  const [expanded, setExpanded] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const stale = baseline.revision !== getSpecification(project).revision;
  const dirty =
    JSON.stringify(screens) !== JSON.stringify(getScreens(baseline));
  const update = (
    id: ScreenDefinition["id"],
    patch: Partial<ScreenDefinition>,
  ) => setScreens(screens.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold">Ekranlar</h2>
      <p className="text-sm leading-6 text-muted-foreground">
        Uygulamada yer alacak ekranları seçin; ekran başlığını ve açıklamasını
        düzenleyin. Bu içerikler telefon önizlemesine ve Expo projesine
        aktarılır. Alanlar ve davranışlar şimdilik hazır şablonlardan gelir.
      </p>
      {stale && (
        <p role="alert">
          Daha yeni bir sürüm var. Düzenlemeniz korunuyor; güncel sürümü
          yükleyin.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          disabled={screens.length >= 20 || stale}
          onClick={() => {
            const id = "custom-" + crypto.randomUUID();
            setScreens([
              ...screens,
              { id, enabled: true, name: "Yeni ekran", description: "" },
            ]);
            setExpanded([id]);
            setMessage("");
          }}
        >
          <Plus size={16} />
          Yeni ekran ekle
        </Button>
        <Button
          variant="ghost"
          onClick={() => setExpanded(screens.map((s) => s.id))}
        >
          Tümünü aç
        </Button>
        <Button variant="ghost" onClick={() => setExpanded([])}>
          Tümünü kapat
        </Button>
        <span className="text-sm text-muted-foreground">
          {screens.length}/20 ekran
        </span>
      </div>
      {screens.map((s) => (
        <Card key={s.id} className="gap-4 p-5 shadow-none">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-3 text-sm font-medium">
              <input
                type="checkbox"
                checked={s.enabled}
                disabled={s.id === "home"}
                onChange={(e) => update(s.id, { enabled: e.target.checked })}
              />
              <span className="sr-only">{s.name} ekranını etkinleştir</span>
            </label>
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left text-sm font-medium"
              aria-expanded={expanded.includes(s.id)}
              aria-controls={s.id + "-fields"}
              onClick={() =>
                setExpanded(
                  expanded.includes(s.id)
                    ? expanded.filter((id) => id !== s.id)
                    : [...expanded, s.id],
                )
              }
            >
              <span className="truncate">
                {s.name || "Adsız ekran"}
                {s.id === "home" ? " (zorunlu)" : ""}
              </span>
              <ChevronDown
                size={16}
                className={
                  expanded.includes(s.id) ? "rotate-180 shrink-0" : "shrink-0"
                }
              />
            </button>
            {s.id !== "home" && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={s.name + " ekranını sil"}
                onClick={() => {
                  setScreens(screens.filter((screen) => screen.id !== s.id));
                  setExpanded(expanded.filter((id) => id !== s.id));
                  setMessage(
                    "Ekran listeden kaldırıldı. Kaydetmeden önce değişiklikleri geri alabilirsiniz.",
                  );
                }}
              >
                <Trash2 size={16} />
              </Button>
            )}
          </div>
          <div
            id={s.id + "-fields"}
            hidden={!expanded.includes(s.id)}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor={s.id + "-name"}>Ekran başlığı</Label>
              <Input
                id={s.id + "-name"}
                disabled={!s.enabled}
                value={s.name}
                maxLength={60}
                onChange={(e) => update(s.id, { name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={s.id + "-description"}>
                Ekranda gösterilecek açıklama
              </Label>
              <Textarea
                id={s.id + "-description"}
                disabled={!s.enabled}
                value={s.description}
                maxLength={500}
                onChange={(e) => update(s.id, { description: e.target.value })}
              />
            </div>
            {s.id === "register" && (
              <p className="text-xs text-muted-foreground">
                Ad ve e-posta alanlarını gösterir. Hesap oluşturmaz, veri
                göndermez; kimlik doğrulama altyapısı sonraki adımdır.
              </p>
            )}
          </div>
        </Card>
      ))}
      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <Button
          disabled={!dirty || stale}
          onClick={() => {
            const parsed = screensSchema.safeParse(screens);
            if (!parsed.success) {
              setMessage(parsed.error.issues.map((i) => i.message).join(" "));
              return;
            }
            try {
              const saved = editSpecification(
                project.id,
                "screens",
                parsed.data,
                baseline.revision,
              );
              setBaseline(saved);
              setScreens(getScreens(saved));
              setMessage(
                "Ekranlar kaydedildi. Tasarım incelemesi yeniden yapılmalıdır.",
              );
            } catch (e) {
              setMessage(e instanceof Error ? e.message : "Kaydedilemedi.");
            }
          }}
        >
          Ekranları kaydet
        </Button>
        {(dirty || stale) && (
          <Button
            variant="outline"
            onClick={() => {
              const latest = getSpecification(project);
              setBaseline(latest);
              setScreens(getScreens(latest));
              setMessage("");
            }}
          >
            {stale ? "Güncel sürümü yükle" : "Değişiklikleri geri al"}
          </Button>
        )}
        {project.stage === "screens" ? (
          <Button
            disabled={dirty || stale}
            onClick={() => {
              try {
                advance(project.id, "APPROVE_SCREENS");
                setMessage("Ekranlar onaylandı.");
              } catch (e) {
                setMessage(e instanceof Error ? e.message : "Onaylanamadı.");
              }
            }}
          >
            Ekranları onayla
          </Button>
        ) : (
          !dirty &&
          !stale && (
            <Button asChild variant="outline">
              <Link href={`/projects/${project.id}/design`}>
                Tasarımı incele
              </Link>
            </Button>
          )
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Kaydetmek ekran ve tasarım onaylarını yeniler. Önceki üretim klasörleri
        korunur. Sayfadan ayrılmadan önce değişikliklerinizi kaydedin.
      </p>
    </div>
  );
}
