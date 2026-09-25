"use client";
import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  projectInputSchema,
  type Project,
  type ProjectInput,
} from "@app-factory/schemas";
import { useProjects } from "./project-provider";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Checkbox } from "./ui/checkbox";

export function OverviewEditor({ project }: { project: Project }) {
  const { editOverview } = useProjects();
  const [editing, setEditing] = useState(false);
  const [base, setBase] = useState(project);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const {
    register,
    control,
    reset,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProjectInput>({
    resolver: zodResolver(projectInputSchema),
    defaultValues: projectInputSchema.parse(project),
  });
  const load = () => {
    reset(projectInputSchema.parse(project));
    setBase(project);
    setError("");
    setSaved(false);
    setEditing(true);
  };
  return (
    <Card className="mb-5 shadow-none">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="text-base">Proje bilgileri</CardTitle>
        {!editing && (
          <Button variant="outline" size="sm" onClick={load}>
            Düzenle
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {editing ? (
          <form
            noValidate
            className="space-y-5"
            onSubmit={handleSubmit((input) => {
              setError("");
              try {
                editOverview(project.id, input, base);
                setEditing(false);
                setSaved(true);
              } catch (e) {
                setError(
                  e instanceof Error
                    ? e.message
                    : "Değişiklikler kaydedilemedi.",
                );
              }
            })}
          >
            <div className="space-y-2">
              <Label htmlFor="overview-name">Proje adı</Label>
              <Input
                id="overview-name"
                {...register("name")}
                aria-invalid={!!errors.name}
                aria-describedby={
                  errors.name ? "overview-name-error" : undefined
                }
              />
              {errors.name && (
                <p
                  id="overview-name-error"
                  role="alert"
                  className="text-sm text-destructive"
                >
                  {errors.name.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="overview-idea">Proje fikri</Label>
              <Textarea
                id="overview-idea"
                className="min-h-36"
                {...register("idea")}
                aria-invalid={!!errors.idea}
                aria-describedby={
                  errors.idea ? "overview-idea-error" : undefined
                }
              />
              {errors.idea && (
                <p
                  id="overview-idea-error"
                  role="alert"
                  className="text-sm text-destructive"
                >
                  {errors.idea.message}
                </p>
              )}
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
                          id={`overview-${platform}`}
                          checked={field.value}
                          onCheckedChange={(value) =>
                            field.onChange(value === true)
                          }
                          onBlur={field.onBlur}
                          ref={field.ref}
                          aria-describedby={
                            errors.android
                              ? "overview-platform-error"
                              : undefined
                          }
                        />
                        <Label htmlFor={`overview-${platform}`}>
                          {platform === "ios" ? "iOS" : "Android"}
                        </Label>
                      </div>
                    )}
                  />
                ))}
              </div>
              {errors.android && (
                <p
                  id="overview-platform-error"
                  role="alert"
                  className="text-sm text-destructive"
                >
                  {errors.android.message}
                </p>
              )}
            </fieldset>
            <div className="max-w-xs space-y-2">
              <Label htmlFor="overview-budget">Bütçe limiti (USD)</Label>
              <Input
                id="overview-budget"
                type="number"
                min="0.01"
                max="1000"
                step="0.01"
                {...register("budgetLimit", { valueAsNumber: true })}
                aria-invalid={!!errors.budgetLimit}
                aria-describedby={
                  errors.budgetLimit ? "overview-budget-error" : undefined
                }
              />
              {errors.budgetLimit && (
                <p
                  id="overview-budget-error"
                  role="alert"
                  className="text-sm text-destructive"
                >
                  {errors.budgetLimit.message}
                </p>
              )}
            </div>
            <p className="rounded-md border bg-muted/50 p-3 text-sm text-muted-foreground">
              Ad, fikir veya platform değişiklikleri planı yeniden onaya açar.
              Mevcut plan, ekran ve tasarım düzenlemeleriniz korunur; yeni fikre
              göre Plan sayfasından düzenleyebilir veya AI analizini yeniden
              başlatabilirsiniz. Yalnızca bütçeyi değiştirmek ilerlemeyi
              etkilemez.
            </p>
            {error && (
              <div className="space-y-2">
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
                <Button type="button" variant="outline" onClick={load}>
                  Güncel bilgileri yükle
                </Button>
              </div>
            )}
            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={isSubmitting}>
                Değişiklikleri kaydet
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditing(false)}
              >
                Vazgeç
              </Button>
            </div>
          </form>
        ) : (
          <p className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
            {project.idea}
          </p>
        )}
        {saved && (
          <p role="status" className="mt-3 text-sm text-muted-foreground">
            Değişiklikler kaydedildi.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
