"use client";
import { type ReactNode } from "react";
import { Box } from "lucide-react";
import { useProjects } from "./project-provider";
import { LoginForm } from "./login-form";

export function AuthGate({ children }: { children: ReactNode }) {
  const { cloud, ready } = useProjects();
  if (ready && cloud.userId && cloud.status !== "loading") return children;
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-5 py-12">
      <section
        className="w-full max-w-md rounded-xl border bg-white p-8 shadow-sm"
        aria-labelledby="login-title"
      >
        <div className="mb-7 flex items-center gap-3 font-semibold">
          <span className="rounded-md bg-primary p-2 text-white">
            <Box size={22} />
          </span>
          App Factory
        </div>
        <h1 id="login-title" className="text-2xl font-semibold tracking-tight">
          Hesabınıza giriş yapın
        </h1>
        <p className="mt-2 mb-7 text-sm text-muted-foreground">
          Ortak projelerinize erişmek için ekip hesabınızı kullanın.
        </p>
        {!cloud.configured ? (
          <p role="alert" className="text-sm text-destructive">
            Giriş bağlantısı yapılandırılmamış. Supabase ayarlarını kontrol edip
            uygulamayı yeniden başlatın.
          </p>
        ) : !ready || cloud.status === "loading" ? (
          <p role="status" className="text-sm text-muted-foreground">
            Oturum kontrol ediliyor…
          </p>
        ) : (
          <LoginForm />
        )}
      </section>
    </main>
  );
}
