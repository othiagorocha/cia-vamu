const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const renderInline = (value: string) => {
  const placeholders: string[] = [];
  const stash = (html: string) => {
    const token = `\u0000${placeholders.length}\u0000`;
    placeholders.push(html);
    return token;
  };

  let result = escapeHtml(value)
    .replace(/`([^`]+)`/g, (_match, code: string) =>
      stash(`<code>${code}</code>`),
    )
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      (_match, label: string, href: string) =>
        stash(
          `<a href="${href}" target="_blank" rel="noopener noreferrer">${label}</a>`,
        ),
    )
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");

  placeholders.forEach((html, index) => {
    result = result.replace(`\u0000${index}\u0000`, html);
  });

  return result;
};

const isUnorderedItem = (line: string) => /^[-*+]\s+/.test(line);
const isOrderedItem = (line: string) => /^\d+\.\s+/.test(line);

export function renderMarkdownToHtml(markdown: string) {
  const lines = markdown.replaceAll("\r\n", "\n").split("\n");
  const html: string[] = [];
  let index = 0;

  const flushParagraph = (buffer: string[]) => {
    if (buffer.length === 0) {
      return;
    }

    html.push(`<p>${renderInline(buffer.join(" "))}</p>`);
    buffer.length = 0;
  };

  while (index < lines.length) {
    const line = lines[index] ?? "";

    if (line.startsWith("```")) {
      const code: string[] = [];
      index += 1;

      while (index < lines.length && !(lines[index] ?? "").startsWith("```")) {
        code.push(lines[index] ?? "");
        index += 1;
      }

      html.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
      index += 1;
      continue;
    }

    if (/^\s*$/.test(line)) {
      index += 1;
      continue;
    }

    if (/^---+$/.test(line.trim())) {
      html.push("<hr />");
      index += 1;
      continue;
    }

    const heading = /^(#{1,4})\s+(.+)$/.exec(line);
    if (heading) {
      const level = heading[1]?.length ?? 1;
      html.push(`<h${level}>${renderInline(heading[2] ?? "")}</h${level}>`);
      index += 1;
      continue;
    }

    if (line.startsWith("> ")) {
      const quote: string[] = [];
      while (index < lines.length && (lines[index] ?? "").startsWith("> ")) {
        quote.push((lines[index] ?? "").slice(2));
        index += 1;
      }
      html.push(`<blockquote>${renderInline(quote.join(" "))}</blockquote>`);
      continue;
    }

    if (isUnorderedItem(line) || isOrderedItem(line)) {
      const ordered = isOrderedItem(line);
      const tag = ordered ? "ol" : "ul";
      const items: string[] = [];

      while (index < lines.length) {
        const current = lines[index] ?? "";
        if (ordered ? !isOrderedItem(current) : !isUnorderedItem(current)) {
          break;
        }
        items.push(
          `<li>${renderInline(current.replace(/^([-*+]|\d+\.)\s+/, ""))}</li>`,
        );
        index += 1;
      }

      html.push(`<${tag}>${items.join("")}</${tag}>`);
      continue;
    }

    const paragraph: string[] = [];
    while (
      index < lines.length &&
      (lines[index] ?? "") !== "" &&
      !/^(#{1,4}\s+|```|[-*+]\s+|\d+\.\s+|> |---+$)/.test(lines[index] ?? "")
    ) {
      paragraph.push(lines[index] ?? "");
      index += 1;
    }
    flushParagraph(paragraph);
  }

  return html.join("");
}
