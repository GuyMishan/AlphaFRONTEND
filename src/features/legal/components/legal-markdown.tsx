import type { ReactNode } from "react";

/** Safe, dependency-free heading/paragraph renderer. No HTML or executable links. */
export function LegalMarkdown({ markdown }: { markdown: string }) {
  const blocks = markdown.replace(/\r\n/g, "\n").split(/\n{2,}/).map(block => block.trim()).filter(Boolean);
  const headings = blocks.filter(block => /^#{1,3} /.test(block));
  let headingIndex = 0;
  const content: ReactNode[] = blocks.map((block, index) => {
    const match = /^(#{1,3})\s+([^\n]+)(?:\n([\s\S]*))?$/.exec(block);
    if (!match) return <p key={index} style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{block}</p>;
    const id = `legal-section-${headingIndex++}`;
    const heading = match[2];
    const Tag = match[1].length === 1 ? "h2" : match[1].length === 2 ? "h3" : "h4";
    return <section key={index} aria-labelledby={id}>
      <Tag id={id}>{heading}</Tag>
      {match[3] ? <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{match[3]}</p> : null}
    </section>;
  });
  return <div dir="rtl" style={{ overflowWrap: "anywhere", lineHeight: 1.9 }}>
    {headings.length ? <nav aria-label="ניווט בסעיפי המסמך">
      <strong>תוכן העניינים</strong>
      <ul>{headings.map((heading, i) => <li key={i}><a href={`#legal-section-${i}`}>{heading.replace(/^#{1,3}\s+/, "").split("\n")[0]}</a></li>)}</ul>
    </nav> : null}
    {content}
  </div>;
}
