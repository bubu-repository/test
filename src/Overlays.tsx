import { lazy, Suspense } from 'react';
import { useApp, type Overlay } from '@/state';

/** Every overlay kind maps to one lazily loaded component. Last overlay is on top. */
const Phone = lazy(() => import('@/phone/Phone'));
const RunSheet = lazy(() => import('@/runs/RunSheet'));
const VisitStamp = lazy(() => import('@/runs/VisitStamp'));
const Panel = lazy(() => import('@/room/panels/Panel'));
const PhotoMode = lazy(() => import('@/room/PhotoMode'));

function render(o: Overlay, i: number) {
  switch (o.kind) {
    case 'phone':
      return <Phone key={`phone-${i}`} app={o.app} />;
    case 'run':
      return <RunSheet key={`run-${o.id}`} id={o.id} />;
    case 'panel':
      return <Panel key={`panel-${o.id}`} id={o.id} />;
    case 'photo':
      return <PhotoMode key="photo" />;
    case 'visit':
      return <VisitStamp key={`visit-${o.tier}`} tier={o.tier} />;
  }
}

export function Overlays() {
  const overlays = useApp((s) => s.overlays);
  // one boundary per overlay: a lazy run sheet loading must not suspend (and replay) the phone under it
  return (
    <>
      {overlays.map((o, i) => (
        <Suspense key={`${o.kind}-${i}`} fallback={null}>
          {render(o, i)}
        </Suspense>
      ))}
    </>
  );
}
