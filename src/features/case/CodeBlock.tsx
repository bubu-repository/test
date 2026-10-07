import type { ReactNode } from "react";

/*
 * A small, dependency-free syntax highlighter for the code excerpts in the case studies
 * (TypeScript and Python). Server-rendered: one regex pass turns the source into spans.
 * It only needs to be good enough to read; it is not a parser.
 */

const KEYWORDS: Record<string, string[]> = {
  ts: ["const", "let", "export", "function", "return", "if", "else", "for", "of", "in", "type", "import", "from", "async", "await", "new", "true", "false", "undefined", "null"],
  python: ["def", "return", "if", "elif", "else", "for", "in", "not", "and", "or", "import", "from", "class", "True", "False", "None", "with", "as"],
};

function tokenRegex(lang: string) {
  const comment = lang === "python" ? String.raw`#[^\n]*` : String.raw`\/\/[^\n]*|\/\*[\s\S]*?\*\/`;
  const string = String.raw`"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|` + "`(?:[^`\\\\]|\\\\.)*`";
  const fstring = lang === "python" ? String.raw`|f"(?:[^"\\\n]|\\.)*"` : "";
  const number = String.raw`\b\d[\d_]*(?:\.\d+)?\b`;
  const word = String.raw`\b[A-Za-z_][A-Za-z0-9_]*\b`;
  return new RegExp(`(${comment})|(${string}${fstring})|(${number})|(${word})`, "g");
}

function highlight(source: string, lang: string): ReactNode[] {
  const keywords = new Set(KEYWORDS[lang] ?? KEYWORDS.ts);
  const out: ReactNode[] = [];
  const re = tokenRegex(lang);
  let last = 0;
  let k = 0;
  for (let m = re.exec(source); m; m = re.exec(source)) {
    if (m.index > last) out.push(source.slice(last, m.index));
    const [text, comment, string, number, word] = m;
    const next = source.slice(m.index + text.length).match(/^\s*\(/);
    const cls = comment
      ? "tok-comment"
      : string
        ? "tok-string"
        : number
          ? "tok-number"
          : word && keywords.has(word)
            ? "tok-keyword"
            : word && /^[A-Z]/.test(word)
              ? "tok-type"
              : word && next
                ? "tok-fn"
                : undefined;
    out.push(
      cls ? (
        <span key={k++} className={cls}>
          {text}
        </span>
      ) : (
        text
      ),
    );
    last = m.index + text.length;
  }
  if (last < source.length) out.push(source.slice(last));
  return out;
}

/** A code excerpt with its file name, a one-line caption and an optional link to the repo. */
export function CodeBlock({ file, lang, caption, source, repo }: { file: string; lang: string; caption: string; source: string; repo?: string }) {
  const lines = source.split("\n").length;
  return (
    <figure className="codeblock">
      <div className="codeblock__bar">
        <span className="codeblock__file">{file}</span>
        <span className="codeblock__meta">
          {lang === "python" ? "Python" : "TypeScript"} · {lines} lines · excerpt
        </span>
      </div>
      <div className="codeblock__scroll" tabIndex={0} role="region" aria-label={`Code: ${file}`}>
        <pre>
          <code>{highlight(source, lang)}</code>
        </pre>
      </div>
      <figcaption className="codeblock__caption">
        <span>{caption}</span>
        {repo && (
          <a href={repo} target="_blank" rel="noopener noreferrer" className="link-arrow shrink-0">
            Read the code<span className="sr-only"> (opens in a new tab)</span>
          </a>
        )}
      </figcaption>
    </figure>
  );
}
