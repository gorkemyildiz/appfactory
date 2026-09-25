"use client";
import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { projectInputSchema, type ProjectInput } from "@app-factory/schemas";
import { useProjects } from "@/components/project-provider";
import { PageHeading, Loading } from "@/components/shell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, Info } from "lucide-react";
export default function NewProject() {
  const router = useRouter();
  const [aiReady, setAiReady] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [createdId, setCreatedId] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    void fetch("/api/planner")
      .then((r) => r.json())
      .then((data) => {
        if (active) setAiReady(data.enabled === true);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const { create, ready } = useProjects();
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProjectInput>({
    resolver: zodResolver(projectInputSchema),
    defaultValues: {
      name: "",
      type: "mobile",
      android: true,
      ios: false,
      idea: "",
      budgetLimit: 10,
    },
  });
  if (!ready) return <Loading />;
  const submit = async (input: ProjectInput) => {
    setSubmitError("");
    const id = create(input);
    setCreatedId(id);
    if (aiReady) {
      try {
        const response = await fetch("/api/planner", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            project: {
              ...input,
              id,
              stage: "plan",
              aiCost: 0,
              updatedAt: new Date().toISOString(),
            },
          }),
        });
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error ?? "AI analizi başlatılamadı.");
      } catch (e) {
        setSubmitError(
          e instanceof Error ? e.message : "AI bağlantısı kurulamadı.",
        );
        return;
      }
    }
    router.push("/projects/" + id + "/plan");
  };
  return (
    <div className="max-w-3xl">
      <PageHeading
        title="Yeni Proje"
        description="Fikrinizi mobil uygulamanız için net bir başlangıç noktasına dönüştürün."
      />
      <Card className="shadow-none">
        <CardContent className="pt-6">
          <form
            onSubmit={handleSubmit(submit)}
            noValidate
            className="space-y-6"
          >
            <div className="space-y-2">
              <Label htmlFor="name">Proje Adı</Label>
              <Input
                id="name"
                placeholder="Örn. Günlük Odak"
                {...register("name")}
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? "name-error" : undefined}
              />
              {errors.name && (
                <p
                  id="name-error"
                  role="alert"
                  className="text-sm text-destructive"
                >
                  {errors.name.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Proje Türü</Label>
              <Input
                id="type"
                value="Mobil Uygulama"
                readOnly
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                React Native · Expo · TypeScript
              </p>
            </div>
            <fieldset className="space-y-3">
              <legend className="text-sm font-medium">Hedef platformlar</legend>
              <div className="flex gap-6">
                {(["android", "ios"] as const).map((platform) => (
                  <Controller
                    key={platform}
                    name={platform}
                    control={control}
                    render={({ field }) => (
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={platform}
                          checked={field.value}
                          onCheckedChange={(value) =>
                            field.onChange(value === true)
                          }
                          onBlur={field.onBlur}
                          ref={field.ref}
                          aria-describedby={
                            errors.android ? "platform-error" : undefined
                          }
                        />
                        <Label htmlFor={platform}>
                          {platform === "ios" ? "iOS" : "Android"}
                        </Label>
                      </div>
                    )}
                  />
                ))}
              </div>
              {errors.android && (
                <p
                  id="platform-error"
                  role="alert"
                  className="text-sm text-destructive"
                >
                  {errors.android.message}
                </p>
              )}
            </fieldset>
            <div className="space-y-2">
              <Label htmlFor="idea">Fikir</Label>
              <Textarea
                id="idea"
                placeholder="Uygulamanız ne yapıyor? Kimler için tasarlandı ve hangi temel sorunu çözüyor?"
                className="min-h-36"
                {...register("idea")}
                aria-invalid={!!errors.idea}
                aria-describedby="idea-help idea-error"
              />
              <p id="idea-help" className="text-xs text-muted-foreground">
                Temel iş akışını açıklayın. İlk sürümün kapsamını dar tutun.
              </p>
              {errors.idea && (
                <p
                  id="idea-error"
                  role="alert"
                  className="text-sm text-destructive"
                >
                  {errors.idea.message}
                </p>
              )}
            </div>
            <div className="max-w-xs space-y-2">
              <Label htmlFor="budget">Bütçe Limiti (USD)</Label>
              <Input
                id="budget"
                type="number"
                min="0.01"
                max="1000"
                step="0.01"
                {...register("budgetLimit", { valueAsNumber: true })}
                aria-invalid={!!errors.budgetLimit}
                aria-describedby="budget-help budget-error"
              />
              <p id="budget-help" className="text-xs text-muted-foreground">
                Projenin yapay zekâ bütçesi. Demo modunda ücret alınmaz.
              </p>
              {errors.budgetLimit && (
                <p
                  id="budget-error"
                  role="alert"
                  className="text-sm text-destructive"
                >
                  {errors.budgetLimit.message}
                </p>
              )}
            </div>
            <div className="flex gap-3 rounded-md border bg-muted/50 p-4 text-sm text-muted-foreground">
              <Info size={17} className="mt-0.5 shrink-0" />
              <p>
                <span className="font-medium text-foreground">
                  {aiReady ? "AI Planner hazır." : "Yerel mod."}
                </span>{" "}
                {aiReady
                  ? "Fikriniz OpenAI ile analiz edilir. Görev başına en fazla $0.10 ayrılır; proje bütçesi ayrıca kontrol edilir."
                  : "API anahtarı yok; ücret alınmadan örnek bir plan oluşturulur. Plan sayfasından AI analizini daha sonra başlatabilirsiniz."}
              </p>
            </div>
            {submitError && (
              <p role="alert" className="text-sm text-destructive">
                {submitError}{" "}
                {createdId && (
                  <Link
                    className="underline"
                    href={"/projects/" + createdId + "/plan"}
                  >
                    Kaydedilen projeyi aç
                  </Link>
                )}
              </p>
            )}
            <div className="flex items-center justify-between border-t pt-5">
              <Button variant="outline" asChild>
                <Link href="/">Vazgeç</Link>
              </Button>
              <Button type="submit" disabled={isSubmitting || !!createdId}>
                {isSubmitting
                  ? "Başlatılıyor…"
                  : aiReady
                    ? "Fikri AI ile Analiz Et"
                    : "Yerel plan oluştur"}
                <ArrowRight />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
