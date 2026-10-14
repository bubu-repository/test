/*
 * One colour per project, taken from the journey from the sky to the sea, so a product looks the
 * same as an app icon, as its case-study stage and as its trading card:
 * Tenderlens the morning sky, Ask HR the lagoon, Catat sea glass, Lintas the deep sea.
 */
export type ProjectColour = { icon: string; glyphInk: string; frame: string; ink: string };

export const PROJECT_COLOURS: Record<string, ProjectColour> = {
  tenderlens: {
    icon: "radial-gradient(120% 120% at 30% 10%, #9FD8FB 0%, #1A8FE8 50%, #0A58BE 100%)",
    glyphInk: "#0A58BE",
    frame: "linear-gradient(140deg, #D4F3FF, #7CC4F5 42%, #1A8FE8 78%, #FFD6E8)",
    ink: "#0A68D0",
  },
  "ask-hr": {
    icon: "radial-gradient(120% 120% at 30% 10%, #C9F6FB 0%, #5FD3EA 50%, #1FA6CC 100%)",
    glyphInk: "#07657E",
    frame: "linear-gradient(140deg, #D6F7FB, #7FDCEC 42%, #3CC0E0 78%, #E4DCFF)",
    ink: "#07657E",
  },
  catat: {
    icon: "radial-gradient(120% 120% at 30% 10%, #D2FAEF 0%, #5FD9C0 50%, #1FA88E 100%)",
    glyphInk: "#0A6E5C",
    frame: "linear-gradient(140deg, #DDF8F1, #8EE6D4 42%, #2FC2A6 78%, #D4F3FF)",
    ink: "#0A6E5C",
  },
  lintas: {
    icon: "radial-gradient(120% 120% at 30% 10%, #7CC4F5 0%, #0A68D0 50%, #073B86 100%)",
    glyphInk: "#073B86",
    frame: "linear-gradient(140deg, #9BD3F7, #0A68D0 42%, #073B86 78%, #FFD6E8)",
    ink: "#0A4FA8",
  },
};

export const colourOf = (slug: string): ProjectColour => PROJECT_COLOURS[slug] ?? PROJECT_COLOURS.tenderlens;
