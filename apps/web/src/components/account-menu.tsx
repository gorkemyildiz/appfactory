"use client";
import { useState } from "react";
import { Popover } from "radix-ui";
import { ChevronDown } from "lucide-react";
import { supabase } from "@/lib/cloud-projects";
import { useProjects } from "./project-provider";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export function AccountMenu() {
  const { cloud } = useProjects();
  const [open, setOpen] = useState(false);
  const [changing, setChanging] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function changePassword() {
    if (!supabase || busy) return;
    if (password !== confirmation) {
      setMessage("Parolalar eşleşmiyor.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setMessage(
          error.code === "same_password"
            ? "Yeni parola mevcut paroladan farklı olmalıdır."
            : "Parola değiştirilemedi. En az 6 karakter kullanın; oturumunuz eskiyse yeniden giriş yapıp deneyin.",
        );
        return;
      }
      setPassword("");
      setConfirmation("");
      setChanging(false);
      setMessage("Parolanız değiştirildi.");
    } catch {
      setMessage("Bağlantı kurulamadı. Yeniden deneyin.");
    } finally {
      setBusy(false);
    }
  }
  async function signOut() {
    if (!supabase || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) setMessage("Çıkış yapılamadı. Yeniden deneyin.");
    } catch {
      setMessage("Çıkış yapılamadı. Bağlantınızı kontrol edin.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Popover.Root
      open={open}
      onOpenChange={(value) => {
        if (busy) return;
        setOpen(value);
        setPassword("");
        setConfirmation("");
        setChanging(false);
        setMessage("");
      }}
    >
      <Popover.Trigger asChild>
        <Button variant="ghost" aria-label="Ortak çalışma alanı hesap menüsü">
          <span className="hidden sm:inline">Ortak çalışma alanı</span>
          <span className="flex size-8 items-center justify-center rounded-full border bg-muted text-xs">
            AF
          </span>
          <ChevronDown size={14} />
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          aria-label="Hesap işlemleri"
          className="z-50 w-80 max-w-[calc(100vw-2rem)] space-y-4 rounded-lg border bg-background p-4 shadow-lg"
        >
          <div className="space-y-1">
            <p className="text-sm font-semibold">Hesabım</p>
            <p className="break-all text-sm text-muted-foreground">
              {cloud.email}
            </p>
          </div>
          {changing ? (
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                void changePassword();
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="account-password">Yeni parola</Label>
                <Input
                  id="account-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={6}
                  required
                  value={password}
                  disabled={busy}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="account-password-confirm">
                  Yeni parola tekrar
                </Label>
                <Input
                  id="account-password-confirm"
                  type="password"
                  autoComplete="new-password"
                  minLength={6}
                  required
                  value={confirmation}
                  disabled={busy}
                  onChange={(event) => setConfirmation(event.target.value)}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                En az 6 karakter kullanın.
              </p>
              <div className="flex gap-2">
                <Button type="submit" disabled={busy}>
                  {busy ? "Kaydediliyor…" : "Parolayı kaydet"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => {
                    setChanging(false);
                    setPassword("");
                    setConfirmation("");
                    setMessage("");
                  }}
                >
                  Vazgeç
                </Button>
              </div>
            </form>
          ) : (
            <Button
              variant="outline"
              className="w-full"
              disabled={busy}
              onClick={() => {
                setChanging(true);
                setMessage("");
              }}
            >
              Parola değiştir
            </Button>
          )}
          {message && (
            <p role="status" className="text-sm">
              {message}
            </p>
          )}
          <Button
            variant="danger"
            className="w-full"
            disabled={busy}
            onClick={() => void signOut()}
          >
            Çıkış yap
          </Button>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
