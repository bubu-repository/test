import { notFound } from "next/navigation";
import { getProject, projects } from "@/content/projects";
import { ogContentType, ogSize, renderOg } from "@/lib/og";

export const alt = "A case study by Adelia Tiara";
export const size = ogSize;
export const contentType = ogContentType;

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();
  return renderOg({ eyebrow: `Case study · ${project.kind} · ${project.year}`, title: project.name, subtitle: project.tagline });
}
