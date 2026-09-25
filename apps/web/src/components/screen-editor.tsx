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

export function ScreenEditor({ project }: { project: Project }) {
  const { editSpecification, advance } = useProjects();
  const [baseline, setBaseline] = useState(() => getSpecification(project));
  const [screens, setScreens] = useState(() => getScreens(baseline));
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
      {screens.map((s) => (
        <Card key={s.id} className="gap-4 p-5 shadow-none">
          <label className="flex items-center gap-3 text-sm font-medium">
            <input
              type="checkbox"
              checked={s.enabled}
              disabled={s.id === "home"}
              onChange={(e) => update(s.id, { enabled: e.target.checked })}
            />
            {s.name} {s.id === "home" ? "(zorunlu)" : ""}
            {s.id === "register" ? " · Arayüz prototipi" : ""}
          </label>
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
