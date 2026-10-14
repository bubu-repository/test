import type { MaterialId, MaterialInfo, MaterialInput } from "./types";
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

export const MATERIALS: MaterialInfo[] = [
  { id: "felt", name: "Felt", note: "Cut felt with a running stitch", colorable: true, animated: false, defaultColor: "#FF7FB6" },
  { id: "cross-stitch", name: "Cross-stitch", note: "Little Xs, with a merrowed edge", colorable: true, animated: false, defaultColor: "#1A8FE8" },
  { id: "embroidery", name: "Embroidery", note: "Satin stitch in shiny thread", colorable: true, animated: false, defaultColor: "#FF5FA8" },
  { id: "rhinestone", name: "Rhinestones", note: "Set with gems that catch the light", colorable: true, animated: true, defaultColor: "#93DCFB" },
  { id: "glitter", name: "Glitter glue", note: "Raised glue, full of glitter", colorable: true, animated: true, defaultColor: "#FF5FA8" },
  { id: "jelly", name: "Clear jelly", note: "Squishy and see-through", colorable: true, animated: true, defaultColor: "#1FB0F0" },
  { id: "chrome", name: "Chrome", note: "Liquid metal, Y2K", colorable: false, animated: true, defaultColor: "#C9D6E3" },
  { id: "foil", name: "Crumpled foil", note: "Foil, crumpled and smoothed out", colorable: true, animated: true, defaultColor: "#D8C27A" },
  { id: "torn-paper", name: "Torn paper", note: "Torn from a magazine", colorable: true, animated: false, defaultColor: "#FFF6E0" },
  { id: "holo", name: "Holo sticker", note: "Die-cut holographic vinyl", colorable: false, animated: true, defaultColor: "#FFFFFF" },
  { id: "emboss", name: "Metal emboss", note: "Pressed into brushed metal", colorable: false, animated: true, defaultColor: "#B8C4CF" },
  { id: "ascii", name: "ASCII", note: "Typed out in characters", colorable: true, animated: false, defaultColor: "#0B1F33" },
  { id: "acrylic-standee", name: "Acrylic standee", note: "Clear acrylic on a little stand", colorable: true, animated: true, defaultColor: "#FFFFFF" },
  { id: "acrylic-block", name: "Acrylic block", note: "Set inside a clear block", colorable: true, animated: true, defaultColor: "#FFFFFF" },
  { id: "acrylic-keychain", name: "Acrylic keychain", note: "A charm on a ball chain", colorable: true, animated: true, defaultColor: "#FFFFFF" },
];

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
