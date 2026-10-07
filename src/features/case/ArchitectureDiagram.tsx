import type { ArchNode, Project } from "@/content/projects";

const KIND: Record<ArchNode["kind"], { fill: string; label: string }> = {
  user: { fill: "var(--sun)", label: "person" },
  ui: { fill: "var(--sky)", label: "interface" },
  agent: { fill: "var(--accent)", label: "agent" },
  data: { fill: "var(--lime)", label: "data" },
  service: { fill: "var(--violet)", label: "service" },
};

/**
 * The system as a little SVG map: nodes coloured by kind, data packets travelling along every
 * edge (SMIL animateMotion; hidden under reduced motion via CSS). Server-rendered, no JS.
 */
export function ArchitectureDiagram({ project }: { project: Project }) {
  const { nodes, edges } = project.architecture;
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const W = 100;
  const H = 60;
  const sx = (x: number) => 40 + (x / W) * 920;
  const sy = (y: number) => 40 + (y / H) * 360;

  return (
    <figure className="widget overflow-hidden p-4 md:p-6" data-xr="ArchitectureDiagram · SVG + SMIL packets">
      <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Architecture diagram, scrollable">
        <svg viewBox="0 0 1000 460" className="arch min-w-[640px]" role="img" aria-labelledby={`arch-${project.slug}`}>
          <title id={`arch-${project.slug}`}>{`Architecture of ${project.name}: ${edges.map(([a, b]) => `${byId.get(a)?.label} to ${byId.get(b)?.label}`).join(", ")}.`}</title>
          <defs>
            <pattern id={`dots-${project.slug}`} width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.4" fill="var(--dot)" />
            </pattern>
          </defs>
          <rect width="1000" height="460" fill={`url(#dots-${project.slug})`} />
          {edges.map(([a, b], i) => {
            const from = byId.get(a);
            const to = byId.get(b);
            if (!from || !to) return null;
            const x1 = sx(from.x);
            const y1 = sy(from.y);
            const x2 = sx(to.x);
            const y2 = sy(to.y);
            const mx = (x1 + x2) / 2;
            const d = `M${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
            return (
              <g key={`${a}-${b}`}>
                <path id={`edge-${project.slug}-${i}`} d={d} fill="none" stroke="var(--line)" strokeWidth="6" strokeLinecap="round" />
                <path d={d} fill="none" stroke="var(--cobalt)" strokeWidth="2" strokeDasharray="6 10" strokeLinecap="round" opacity="0.6" />
                <circle r="7" fill="var(--accent)" stroke="#fff" strokeWidth="2.5" className="arch-packet">
                  <animateMotion dur={`${2.2 + (i % 3) * 0.5}s`} repeatCount="indefinite" begin={`${i * 0.35}s`}>
                    <mpath href={`#edge-${project.slug}-${i}`} />
                  </animateMotion>
                </circle>
              </g>
            );
          })}
          {nodes.map((n) => {
            const x = sx(n.x);
            const y = sy(n.y);
            const w = Math.max(130, n.label.length * 10.5 + 40);
            return (
              <g key={n.id} transform={`translate(${x} ${y})`}>
                <rect x={-w / 2} y={-30} width={w} height={60} rx="30" fill="var(--surface)" stroke="#fff" strokeWidth="5" />
                <rect x={-w / 2} y={-30} width={w} height={60} rx="30" fill="none" stroke="var(--line)" strokeWidth="1.5" />
                <circle cx={-w / 2 + 26} cy="0" r="11" fill={KIND[n.kind].fill} stroke="#fff" strokeWidth="2" />
                <text x={-w / 2 + 46} y="6" className="fill-ink font-body" fontSize="17" fontWeight="650">
                  {n.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <figcaption className="mt-3 flex flex-wrap gap-2">
        {Object.entries(KIND).map(([kind, k]) => (
          <span key={kind} className="chip">
            <span className="size-2.5 rounded-full" style={{ background: k.fill }} aria-hidden="true" />
            {k.label}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
