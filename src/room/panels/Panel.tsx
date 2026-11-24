import type { PanelId } from '@/state';
import { Sheet } from '@/ui/Sheet';
export default function Panel({ id }: { id: PanelId }) {
  return <Sheet tag={id} title={id}>stub</Sheet>;
}
