import { ProjectWorkspace } from "@/components/project-workspace";
export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ProjectWorkspace>{children}</ProjectWorkspace>;
}
