import type { ComponentType } from 'react';
import { AskHrAdmin, AskHrAnswer, AskHrPending, AskHrQueue, AskHrSensitive } from './askhr';
import { CatatAsk, CatatAskBefore, CatatSale, CatatSaleBefore, CatatSummary, CatatUndo } from './catat';
import { LintasCalm, LintasCarriages, LintasHome, LintasReplan } from './lintas';
import { TenderlensBrief, TenderlensBriefMisread, TenderlensDigest, TenderlensDisagree, TenderlensSource, TenderlensUnsure } from './tenderlens';
import { AhWireBot, AhWireInbox, AhWireQueue, CtWireButtons, CtWireLine, CtWireReceipt, LnWireMap, LnWireOne, LnWireOptions, TlWireReasons, TlWireScore, TlWireSummary } from './wires';

/** Every product screen by key (the keys used in content/projects.ts). */
export const SCREENS: Record<string, { Component: ComponentType; dark?: boolean; android?: boolean; time?: string }> = {
  'tl-brief': { Component: TenderlensBrief, time: '7:12' },
  'tl-brief-misread': { Component: TenderlensBriefMisread, time: '7:12' },
  'tl-source': { Component: TenderlensSource, time: '7:13' },
  'tl-unsure': { Component: TenderlensUnsure, time: '7:20' },
  'tl-disagree': { Component: TenderlensDisagree, time: '7:21' },
  'tl-digest': { Component: TenderlensDigest, time: '7:05' },
  'ah-answer': { Component: AskHrAnswer, time: '10:05' },
  'ah-queue': { Component: AskHrQueue, time: '10:30' },
  'ah-pending': { Component: AskHrPending, time: '10:14' },
  'ah-sensitive': { Component: AskHrSensitive, time: '21:40' },
  'ah-admin': { Component: AskHrAdmin, time: '9:02' },
  'ct-sale': { Component: CatatSale, android: true, time: '7:44' },
  'ct-ask': { Component: CatatAsk, android: true, time: '9:15' },
  'ct-undo': { Component: CatatUndo, android: true, time: '11:02' },
  'ct-summary': { Component: CatatSummary, android: true, time: '19:00' },
  'ct-sale-before': { Component: CatatSaleBefore, android: true, time: '7:42' },
  'ct-ask-before': { Component: CatatAskBefore, android: true, time: '9:15' },
  'ln-home': { Component: LintasHome, dark: true, time: '6:31' },
  'ln-replan': { Component: LintasReplan, dark: true, time: '6:44' },
  'ln-cars': { Component: LintasCarriages, dark: true, time: '6:50' },
  'ln-calm': { Component: LintasCalm, dark: true, time: '6:52' },
};

/** The three rounds of each project's key screen, in order (the last one shipped). */
export const WIRES: Record<string, ComponentType[]> = {
  tenderlens: [TlWireSummary, TlWireScore, TlWireReasons],
  'ask-hr': [AhWireBot, AhWireInbox, AhWireQueue],
  catat: [CtWireReceipt, CtWireLine, CtWireButtons],
  lintas: [LnWireMap, LnWireOptions, LnWireOne],
};
