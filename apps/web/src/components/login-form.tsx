"use client";
import { useState } from "react";
import { Tabs } from "radix-ui";
import { supabase } from "@/lib/cloud-projects";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

// E-posta bağlantısını yeniden açmak için bu özelliği etkinleştirin.
const emailLinkEnabled = false;

export function LoginForm() {
  const [method, setMethod] = useState("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function login(withEmailLink: boolean) {
    if (!supabase || (withEmailLink && !emailLinkEnabled)) return;
    setBusy(true);
    setMessage("");
    try {
      const { error } = withEmailLink
        ? await supabase.auth.signInWithOtp({
            email: email.trim(),
            options: {
              shouldCreateUser: false,
              emailRedirectTo:
                window.location.origin + window.location.pathname,
            },
          })
        : await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });
      if (error)
        throw new Error(
          withEmailLink
            ? "Giriş bağlantısı gönderilemedi. E-posta adresinizi kontrol edip yeniden deneyin."
            : "Giriş yapılamadı. E-posta ve parolanızı kontrol edin.",
        );
      setPassword("");
      if (withEmailLink)
        setMessage(
          "Giriş bağlantısı istendi. E-postanızdaki bağlantıyı bu bilgisayarda açın.",
        );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Bağlantı kurulamadı.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        void login(method === "email-link");
      }}
    >
      <Tabs.Root
        value={method}
        onValueChange={(value) => {
          setMethod(value);
          setMessage("");
          setPassword("");
        }}
        className="space-y-5"
      >
        <Tabs.List
          aria-label="Giriş yöntemi"
          className="grid grid-cols-2 rounded-lg bg-muted p-1"
        >
          {(
            [
              ["password", "Parola ile giriş"],
              ["email-link", "E-posta bağlantısı"],
            ] as const
          ).map(([value, label]) => (
            <Tabs.Trigger
              key={value}
              value={value}
              disabled={busy || (value === "email-link" && !emailLinkEnabled)}
              className="rounded-md px-2 py-2 text-sm font-medium text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              {label}
              {value === "email-link" && !emailLinkEnabled ? " · Pasif" : ""}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
        <div className="space-y-2">
          <Label htmlFor="login-email">E-posta</Label>
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            disabled={busy}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <Tabs.Content value="password" className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="login-password">Parola</Label>
            <Input
              id="login-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              disabled={busy}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button className="w-full" disabled={busy}>
            {busy ? "İşlem yapılıyor…" : "Giriş yap"}
          </Button>
        </Tabs.Content>
        <Tabs.Content value="email-link" className="space-y-5">
          <p className="text-sm text-muted-foreground">
            E-posta adresinize gönderilen bağlantıyla parolasız giriş yapın.
          </p>
          <Button
            type="submit"
            className="w-full"
            disabled={busy || !email.trim() || !emailLinkEnabled}
          >
            {busy ? "İşlem yapılıyor…" : "Giriş bağlantısı gönder"}
          </Button>
        </Tabs.Content>
      </Tabs.Root>
      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
    </form>
  );
}
