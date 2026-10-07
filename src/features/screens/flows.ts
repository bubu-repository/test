/*
 * Each product's main flow, as a click-through: the screen, what it shows, and the tap that moves
 * the person on (`target` is the element inside the screen that the hotspot sits on; without one,
 * the step moves on with the Next button). The last step has no tap: the flow ends there.
 * CONTOH — ganti dengan alur asli.
 */

export type FlowStep = { key: string; title: string; note: string; tap?: { target?: string; label: string } };

export const FLOWS: Record<string, FlowStep[]> = {
  tenderlens: [
    {
      key: "tl-digest",
      title: "The morning digest",
      note: "The day's tenders, already scored. Every score comes with a word, never colour alone.",
      tap: { target: ".tl-list li:first-child", label: "Open the top tender" },
    },
    {
      key: "tl-brief-misread",
      title: "The brief",
      note: "One page per tender: a verdict, three reasons, and the page each one comes from.",
      tap: { target: ".tl-reasons li:nth-child(3) .tl-page", label: "Check the bank guarantee on p. 88" },
    },
    {
      key: "tl-source",
      title: "The receipt",
      note: "The source page opens with the sentence highlighted, next to the claim. Here the scan was misread: the page says 3%, not 5%.",
      tap: { target: ".tl-row .tl-btn:last-child", label: "Say it's wrong" },
    },
    {
      key: "tl-disagree",
      title: "Disagreeing is a feature",
      note: "Three quick causes and a note. Bu Ratna reviews each correction before it joins the test set.",
    },
  ],
  "ask-hr": [
    {
      key: "ah-answer",
      title: "Lane 1: routine",
      note: "Answered from the company's own handbook, with the section it came from.",
      tap: { label: "A question that needs a person" },
    },
    {
      key: "ah-pending",
      title: "Lane 2: needs a person",
      note: "Reimbursements depend on grade, so a person answers: a name and a usual reply time instead of a spinner.",
      tap: { label: "Meanwhile, in HR's queue" },
    },
    {
      key: "ah-queue",
      title: "Lane 2, on HR's side",
      note: "HR makes the decision first, then sends the reply. Pay and contract drafts can't go out until the source has been opened.",
      tap: { target: ".ah-btn--go", label: "Approve the swap, then reply" },
    },
    {
      key: "ah-sensitive",
      title: "Lane 3: sensitive",
      note: "No AI reply at all: a named person, a time, and who can see the message.",
    },
  ],
  catat: [
    {
      key: "ct-sale-before",
      title: "A sale, by voice",
      note: "A six-second voice note in warung slang becomes one line: what sold, and for how much. Nothing is final yet.",
      tap: { target: ".ct-btns span:first-child", label: "Keep it: ✓ Benar" },
    },
    {
      key: "ct-ask-before",
      title: "One short question",
      note: "Two hours later: 'Ceban, Bu Sri'. A new debt, or a payment? Catat asks instead of guessing.",
      tap: { target: ".ct-btns span:last-child", label: "Answer: Bayar utang" },
    },
    {
      key: "ct-ask",
      title: "Logged, with what's left",
      note: "The payment is logged with Bu Sri's remaining debt, and it can still be undone in one tap.",
      tap: { label: "Sunday evening" },
    },
    {
      key: "ct-summary",
      title: "The Sunday summary",
      note: "The week's takings, the best sellers and who still owes. The reason owners kept using it.",
    },
  ],
  lintas: [
    {
      key: "ln-home",
      title: "One number",
      note: "When to leave the house. The route and the carriages are a glance below.",
      tap: { label: "A delay comes in" },
    },
    {
      key: "ln-replan",
      title: "A replan, in one sentence",
      note: "What changed, what to do, and what it costs, compared with your plan.",
      tap: { target: ".ln-btn--go", label: "Switch to 07:01" },
    },
    {
      key: "ln-cars",
      title: "Which carriage",
      note: "Crowding front to back, from riders' one-tap reports.",
      tap: { target: ".ln-car[data-best]", label: "Board car 9" },
    },
    {
      key: "ln-calm",
      title: "Another morning: nothing better",
      note: "When there's no faster option, it says so once and stays quiet.",
    },
  ],
};
