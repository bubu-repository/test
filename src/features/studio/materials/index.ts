import type { MaterialId, MaterialInput } from "./types";
import { felt } from "./felt";
import { crossStitch } from "./crossStitch";
import { embroidery } from "./embroidery";
import { rhinestone } from "./rhinestone";
import { glitter } from "./glitter";
import { jelly } from "./jelly";
import { chrome } from "./chrome";
import { foil } from "./foil";
import { tornPaper } from "./tornPaper";
import { holo } from "./holo";
import { emboss } from "./emboss";
import { ascii } from "./ascii";
import { acrylicBlock, acrylicKeychain, acrylicStandee } from "./acrylic";

export type { MaterialId, MaterialInfo, MaterialInput } from "./types";
export { MATERIALS } from "./info";

/** Every material's renderer: a pure function of the input, drawn on the CPU. */
const RENDERERS: Record<MaterialId, (input: MaterialInput) => HTMLCanvasElement> = {
  felt,
  "cross-stitch": crossStitch,
  embroidery,
  rhinestone,
  glitter,
  jelly,
  chrome,
  foil,
  "torn-paper": tornPaper,
  holo,
  emboss,
  ascii,
  "acrylic-standee": acrylicStandee,
  "acrylic-block": acrylicBlock,
  "acrylic-keychain": acrylicKeychain,
};

/**
 * Renders the art in a material: a new canvas the size of `input.source`, transparent around the
 * object (which brings its own soft shadow). Deterministic for the same input, seed and phase.
 */
export function renderMaterial(id: MaterialId, input: MaterialInput): HTMLCanvasElement {
  return RENDERERS[id](input);
}
