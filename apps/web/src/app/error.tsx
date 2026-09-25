"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div role="alert" className="py-16 text-center">
      <h1 className="mb-3 text-xl font-semibold">Bir sorun oluştu</h1>
      <p className="mb-5 text-sm text-muted-foreground">
        Bu sayfayı yeniden yüklemeyi deneyin.
      </p>
      <Button onClick={reset}>Tekrar dene</Button>
    </div>
  );
}
