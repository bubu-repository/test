import type { ComponentType } from "react";
import { CatatAsk, CatatSale, CatatSummary, CatatUndo } from "./catat";
import { LintasCalm, LintasCarriages, LintasHome, LintasReplan } from "./lintas";
import { TenderlensBrief, TenderlensDigest, TenderlensDisagree, TenderlensSource, TenderlensUnsure } from "./tenderlens";
import { CtWireButtons, CtWireLine, CtWireReceipt, LnWireMap, LnWireOne, LnWireOptions, TlWireReasons, TlWireScore, TlWireSummary } from "./wires";

/** Every product screen by key (the keys used in content/projects.ts). */
export const SCREENS: Record<string, { Component: ComponentType; dark?: boolean; time?: string }> = {
  "tl-brief": { Component: TenderlensBrief, time: "7:12" },
  "tl-source": { Component: TenderlensSource, time: "7:13" },
  "tl-unsure": { Component: TenderlensUnsure, time: "7:20" },
  "tl-disagree": { Component: TenderlensDisagree, time: "7:21" },
  "tl-digest": { Component: TenderlensDigest, time: "7:05" },
  "ct-sale": { Component: CatatSale, time: "7:44" },
  "ct-ask": { Component: CatatAsk, time: "9:15" },
  "ct-undo": { Component: CatatUndo, time: "11:02" },
  "ct-summary": { Component: CatatSummary, time: "19:00" },
  "ln-home": { Component: LintasHome, dark: true, time: "6:31" },
  "ln-replan": { Component: LintasReplan, dark: true, time: "6:44" },
  "ln-cars": { Component: LintasCarriages, dark: true, time: "6:50" },
  "ln-calm": { Component: LintasCalm, dark: true, time: "6:52" },
};

/** The three rounds of each project's key screen, in order (the last one shipped). */
export const WIRES: Record<string, ComponentType[]> = {
  tenderlens: [TlWireSummary, TlWireScore, TlWireReasons],
  catat: [CtWireReceipt, CtWireLine, CtWireButtons],
  lintas: [LnWireMap, LnWireOptions, LnWireOne],
};

/** The screen that stands for each project (cards, the home page, the hero). */
export const KEY_SCREEN: Record<string, string> = {
  tenderlens: "tl-brief",
  catat: "ct-sale",
  lintas: "ln-home",
};
