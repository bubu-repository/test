import { identity, modelCard } from "@/content/profile";

function CardList({ title, items }: { title: string; items: readonly string[] }) {
  return (
    <div>
      <h3 className="text-14 font-semibold text-muted">{title}</h3>
      <ul className="mt-2 space-y-1.5 text-16">
        {items.map((t) => (
          <li key={t} className="flex gap-2.5">
            <span aria-hidden="true" className="mt-2.5 size-1.5 shrink-0 rounded-full bg-accent" />
            {t}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The playful self-description: who she is, written as an ML model card. (Lab.) CONTOH — ganti dengan data asli */
export function ModelCard() {
  return (
    <div className="widget rounded-[28px] p-6 md:p-10" data-xr="Model card · rendered from content/profile.ts">
      <div className="flex flex-wrap items-center gap-3 border-b border-line pb-6">
        <span className="font-mono text-20 font-semibold">adelia-tiara</span>
        <span className="chip" data-tone="magenta">
          {modelCard.version}
        </span>
        <span className="chip">Bekasi · {identity.timeZoneLabel}</span>
        <p className="w-full text-16 text-muted md:ml-auto md:w-auto">{modelCard.architecture}</p>
      </div>
      <div className="grid gap-8 pt-8 md:grid-cols-2">
        <CardList title="Training data" items={modelCard.trainingData} />
        <CardList title="Intended use" items={modelCard.intendedUse} />
        <CardList title="Out of scope" items={modelCard.outOfScope} />
        <CardList title="Known limitations" items={modelCard.limitations} />
      </div>
      <h3 className="mt-10 text-14 font-semibold text-muted">Evals</h3>
      <dl className="mt-3 grid gap-px overflow-hidden rounded-[20px] border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        {modelCard.evals.map((e) => (
          <div key={e.name} className="bg-surface px-5 py-4">
            <dt className="text-14 text-muted">{e.name}</dt>
            <dd className="mt-1 text-24 font-bold tracking-[-0.03em]">{e.score}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
