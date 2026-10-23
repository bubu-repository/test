import type { MaterialInfo } from "./types";

/*
 * What each material is called and how it behaves, without its renderer: the panel imports only
 * this, so the heavy pixel code stays in the render worker (or a lazy chunk when there is none).
 */

export type { MaterialId, MaterialInfo } from "./types";

export const MATERIALS: MaterialInfo[] = [
  { id: "felt", name: "Felt", note: "Cut felt with a running stitch", colorable: true, animated: false, defaultColor: "#FF7EB6" },
  { id: "cross-stitch", name: "Cross-stitch", note: "Little Xs, with a merrowed edge", colorable: true, animated: false, defaultColor: "#5AA9E6" },
  { id: "embroidery", name: "Embroidery", note: "Satin stitch in shiny thread", colorable: true, animated: false, defaultColor: "#FF7EB6" },
  { id: "rhinestone", name: "Rhinestones", note: "Set with gems that catch the light", colorable: true, animated: true, defaultColor: "#A9D6F5" },
  { id: "glitter", name: "Glitter glue", note: "Raised glue, full of glitter", colorable: true, animated: true, defaultColor: "#FF7EB6" },
  { id: "jelly", name: "Clear jelly", note: "Squishy and see-through", colorable: true, animated: true, defaultColor: "#5AA9E6" },
  { id: "chrome", name: "Chrome", note: "Liquid metal, Y2K", colorable: false, animated: true, defaultColor: "#C9D6E3" },
  { id: "foil", name: "Crumpled foil", note: "Foil, crumpled and smoothed out", colorable: true, animated: true, defaultColor: "#D8C27A" },
  { id: "torn-paper", name: "Torn paper", note: "Torn from a magazine", colorable: true, animated: false, defaultColor: "#F4F8FC" },
  { id: "holo", name: "Holo sticker", note: "Die-cut holographic vinyl", colorable: false, animated: true, defaultColor: "#FFFFFF" },
  { id: "emboss", name: "Metal emboss", note: "Pressed into brushed metal", colorable: false, animated: true, defaultColor: "#B8C4CF" },
  { id: "ascii", name: "ASCII", note: "Typed out in characters", colorable: true, animated: false, defaultColor: "#18263A" },
  { id: "acrylic-standee", name: "Acrylic standee", note: "Clear acrylic on a little stand", colorable: true, animated: true, defaultColor: "#FFFFFF" },
  { id: "acrylic-block", name: "Acrylic block", note: "Set inside a clear block", colorable: true, animated: true, defaultColor: "#FFFFFF" },
  { id: "acrylic-keychain", name: "Acrylic keychain", note: "A charm on a ball chain", colorable: true, animated: true, defaultColor: "#FFFFFF" },
];
