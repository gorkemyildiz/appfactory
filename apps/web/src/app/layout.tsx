import type { Metadata } from "next";
import "./globals.css";
import { ProjectProvider } from "@/components/project-provider";
import { Shell } from "@/components/shell";
import { AuthGate } from "@/components/auth-gate";
export const metadata: Metadata = {
  title: { default: "App Factory", template: "%s · App Factory" },
  description: "Mobil uygulama geliştirmek için kişisel çalışma alanı.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body>
        <ProjectProvider>
          <AuthGate>
            <Shell>{children}</Shell>
          </AuthGate>
        </ProjectProvider>
      </body>
    </html>
  );
}
