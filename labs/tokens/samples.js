/* Sample texts. The English and Indonesian samples say the same thing, so their counts compare. */
export const SAMPLES = {
  en: {
    label: "English",
    badge: "EN",
    text:
      "Building AI products is mostly about taste. You pick a model, write a careful prompt, and watch real people use it. " +
      "Every token costs a little money and a little time, so good teams measure everything: latency, cost per answer, " +
      "and how often the agent gets it right. The best products feel calm, fast, and honest about what the model",
  },
  id: {
    label: "Bahasa Indonesia",
    badge: "ID",
    text:
      "Membangun produk AI sebagian besar soal selera. Kamu memilih model, menulis prompt dengan hati-hati, lalu melihat orang sungguhan memakainya. " +
      "Setiap token butuh sedikit uang dan sedikit waktu, jadi tim yang baik mengukur semuanya: latensi, biaya per jawaban, " +
      "dan seberapa sering agen menjawab dengan benar. Produk terbaik terasa tenang, cepat, dan jujur tentang apa yang diketahui oleh model",
  },
  code: {
    label: "Code",
    badge: "</>",
    text: [
      "// Estimate what a prompt will cost before you send it",
      "export function estimateCost(text, pricePerMillion = 3) {",
      "  const tokens = tokenize(text);",
      "  const cost = (tokens.length / 1_000_000) * pricePerMillion;",
      "  return { tokens: tokens.length, cost: Number(cost.toFixed(6)) };",
      "}",
    ].join("\n"),
  },
};

/* The mini-corpus behind "What it almost said". Small on purpose: you can see it repeat itself. */
export const CORPUS = [
  "Building AI products is mostly about taste. You start with a small problem that real people feel every day. " +
    "You pick a model, write a careful prompt, and ship a rough version to a few users. Then you watch them use it, " +
    "and you learn more in one afternoon than in a month of planning. The best products feel calm, fast, and honest. " +
    "They tell you what the model knows, what the model guesses, and what the model cannot do yet. Good teams measure " +
    "everything: latency, cost per answer, and how often the product gets it right.",

  "An agent is a model that can use tools. The agent reads the task, makes a plan, calls a tool, reads the result, " +
    "and decides what to do next. Most of the time the agent is helpful. Sometimes the agent gets lost in a loop, so " +
    "good teams give it clear goals, small tools, and a budget of tokens. The model can write code, search the web, " +
    "and fill a form, but the model still needs a human to check the work. The model can help, and the model can also " +
    "be wrong, so the model can never be the only judge. A good agent asks for help when it is not sure.",

  "Every morning in Jakarta the commute is a small adventure. The train from Bekasi is full by six, the toll road is " +
    "slow by seven, and the rain can turn a short trip into a long story. People read on their phones, answer " +
    "messages, and plan the day while they wait. A good commute app knows the train times, the traffic, and the " +
    "weather, and it tells you when to leave before you ask. On a good day the trip takes one hour. On a rainy day it takes two.",

  "Coffee is the fuel of every product team. In Jakarta there is a small coffee shop on every corner, and every shop " +
    "has a favorite drink: iced coffee with palm sugar, a strong black coffee, or a sweet latte with too much ice. " +
    "The best ideas often start with a coffee and a notebook. You sit by the window, you sketch a screen, you write a " +
    "prompt, and you test it before the coffee gets cold. Then you order another coffee and ship it.",

  "A token is a small piece of text. A short word is often one token, a long word can be two or three tokens, and a " +
    "number can be split into pieces. The model reads tokens, predicts the next token, and then predicts the next one " +
    "again. Every token costs a little money and a little time, so a short prompt is often a better prompt. When the " +
    "temperature is low the model picks the most likely token. When the temperature is high the model takes more " +
    "risks and the words get strange.",
];
