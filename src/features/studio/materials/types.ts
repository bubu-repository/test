/*
 * The Studio's materials: what a piece of art (lettering or a photo) is made of. Every material is
 * a pure function from a source canvas to a new canvas of the same size, drawn on the CPU with the
 * Canvas 2D API and ImageData, so it renders the same on every device and can be exported as a PNG
 * or a GIF frame. Nothing here touches the DOM beyond creating canvases.
 */

export type MaterialId =
  | "felt"
  | "cross-stitch"
  | "embroidery"
  | "rhinestone"
  | "glitter"
  | "jelly"
  | "chrome"
  | "foil"
  | "torn-paper"
  | "holo"
  | "emboss"
  | "ascii"
  | "acrylic-standee"
  | "acrylic-block"
  | "acrylic-keychain";

export type MaterialInput = {
  /**
   * The art on a transparent canvas: lettering filled with the ink colour, or a photo already
   * filtered and cut to its shape. It already has room around it (about 18% of its shorter side on
   * every edge) for borders, stands, rings, shadows and stitching, so a material never needs to
   * grow the canvas.
   */
  source: HTMLCanvasElement;
  /** Lettering or a photo: some materials treat them differently (a photo keeps its colours). */
  kind: "text" | "photo";
  /** The chosen colour, as #RRGGBB: felt, thread, glitter, jelly, gems, acrylic tint, paper. */
  color: string;
  /** Where the light is, 0..1 across and down the canvas (from the pointer, or an animation). */
  light: { x: number; y: number };
  /** 0..1, the animation phase for GIF frames: holo sweep, glitter twinkle, jelly wobble. 0 for a still. */
  phase: number;
  /** Stable randomness: the same seed always gives the same stitches, gems, tears and sparkles. */
  seed: number;
};

export type MaterialInfo = {
  id: MaterialId;
  name: string;
  /** One short line for the picker, in plain words. */
  note: string;
  /** Whether `color` changes it (otherwise the picker hides the colour row for it). */
  colorable: boolean;
  /** Whether `phase` changes it, so a GIF of it moves. */
  animated: boolean;
  /** A good default colour for it. */
  defaultColor: string;
};
