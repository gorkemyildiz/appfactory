import { BackToDashboard } from "@/components/shell";
export default function NotFound() {
  return (
    <div className="py-16 text-center">
      <h1 className="mb-3 text-2xl font-semibold">Sayfa bulunamadı</h1>
      <p className="mb-5 text-sm text-muted-foreground">
        Böyle bir sayfa bulunmuyor.
      </p>
      <BackToDashboard />
    </div>
  );
}
