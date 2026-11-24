import type { PhoneApp } from '@/state';
import { Sheet } from '@/ui/Sheet';
/** STUB: replaced by the phone builder. */
export default function Phone({ app }: { app?: PhoneApp }) {
  return <Sheet tag="Phone" title={`Phone ${app ?? ''}`}>stub</Sheet>;
}
