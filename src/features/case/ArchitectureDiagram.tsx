import type { ArchNode, Project } from '@/content/projects';

/** Which steps are a model and which are plain code is the point, so the kinds are coloured and named. */
const KIND: Record<ArchNode['kind'], { fill: string; label: string }> = {
  user: { fill: '#F5C84B', label: 'person' },
  ui: { fill: '#A9D6F5', label: 'interface' },
  agent: { fill: '#FF7EB6', label: 'model' },
  data: { fill: '#C8F560', label: 'data' },
  service: { fill: '#8496AD', label: 'code' },
};

/**
 * The system as a small SVG map on a hairline grid: nodes coloured by kind, data packets travelling
 * along every edge (SMIL animateMotion; hidden under reduced motion via CSS). Scrolls sideways on
 * phones as a focusable region.
 */
export function ArchitectureDiagram({ project }: { project: Project }) {
  const { nodes, edges } = project.architecture;
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const sx = (x: number) => 40 + (x / 100) * 920;
  const sy = (y: number) => 40 + (y / 60) * 360;
  const id = `arch-${project.slug}`;

  return (
    <figure className="arch">
      <div className="arch__scroll" tabIndex={0} role="region" aria-label="Architecture diagram, scrollable">
        <svg viewBox="0 0 1000 460" className="arch__svg" role="img" aria-labelledby={id}>
          <title id={id}>{`Architecture of ${project.name}: ${edges.map(([a, b]) => `${byId.get(a)?.label} to ${byId.get(b)?.label}`).join(', ')}.`}</title>
          <defs>
            <pattern id={`grid-${project.slug}`} width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M20 0H0V20" fill="none" stroke="rgba(24,38,58,0.07)" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="1000" height="460" fill={`url(#grid-${project.slug})`} />
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
                <path id={`edge-${project.slug}-${i}`} d={d} fill="none" stroke="#DDE7F2" strokeWidth="6" strokeLinecap="round" />
                <path d={d} fill="none" stroke="#1F5F96" strokeWidth="1.6" strokeDasharray="5 9" strokeLinecap="round" opacity="0.55" />
                <circle r="6.5" fill="#FF7EB6" stroke="#fff" strokeWidth="2.5" className="arch__packet">
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
            const w = Math.max(130, n.label.length * 10.5 + 44);
            return (
              <g key={n.id} transform={`translate(${x} ${y})`}>
                <rect x={-w / 2 - 2} y={-28} width={w} height={60} rx="16" fill="rgba(24,38,58,0.08)" />
                <rect x={-w / 2} y={-30} width={w} height={60} rx="16" fill="#FFFFFF" stroke="#B9C8D9" strokeWidth="1.5" />
                <circle cx={-w / 2 + 26} cy="0" r="10" fill={KIND[n.kind].fill} stroke="#18263A" strokeOpacity="0.25" strokeWidth="1.5" />
                <text x={-w / 2 + 46} y="6" className="arch__label">
                  {n.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <figcaption className="arch__legend">
        <span className="t-label">Key</span>
        {Object.entries(KIND).map(([kind, k]) => (
          <span key={kind} className="chip">
            <i className="arch__dot" style={{ background: k.fill }} aria-hidden />
            {k.label}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
