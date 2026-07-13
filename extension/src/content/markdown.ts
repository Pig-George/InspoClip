function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

function renderInline(value: string): string {
  const codeSpans: string[] = []
  const withCodePlaceholders = value.replace(/`([^`]+)`/g, (_, code: string) => {
    const index = codeSpans.push(`<code>${escapeHtml(code)}</code>`) - 1
    return `@@CODE_SPAN_${index}@@`
  })

  const escaped = escapeHtml(withCodePlaceholders)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")

  return escaped.replace(/@@CODE_SPAN_(\d+)@@/g, (_, index: string) => codeSpans[Number(index)] || "")
}

function isListItem(line: string): boolean {
  return /^\s*[-*]\s+/.test(line)
}

function isHeading(line: string): boolean {
  return /^#{1,3}\s+/.test(line)
}

export function renderSafeMarkdown(markdown: string): string {
  const lines = String(markdown || "").replace(/\r\n/g, "\n").split("\n")
  const html: string[] = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index]
    const trimmed = line.trim()

    if (!trimmed) {
      index += 1
      continue
    }

    if (trimmed.startsWith("```")) {
      const codeLines: string[] = []
      index += 1
      while (index < lines.length && !lines[index].trim().startsWith("```")) {
        codeLines.push(lines[index])
        index += 1
      }
      if (index < lines.length) index += 1
      html.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`)
      continue
    }

    if (isHeading(line)) {
      const level = Math.min(3, trimmed.match(/^#+/)?.[0].length || 1)
      const content = trimmed.replace(/^#{1,3}\s+/, "")
      html.push(`<h${level}>${renderInline(content)}</h${level}>`)
      index += 1
      continue
    }

    if (isListItem(line)) {
      const items: string[] = []
      while (index < lines.length && isListItem(lines[index])) {
        items.push(lines[index].replace(/^\s*[-*]\s+/, ""))
        index += 1
      }
      html.push(`<ul>${items.map((item) => `<li>${renderInline(item)}</li>`).join("")}</ul>`)
      continue
    }

    const paragraph: string[] = []
    while (
      index < lines.length &&
      lines[index].trim() &&
      !lines[index].trim().startsWith("```") &&
      !isHeading(lines[index]) &&
      !isListItem(lines[index])
    ) {
      paragraph.push(lines[index].trim())
      index += 1
    }
    html.push(`<p>${paragraph.map(renderInline).join("<br>")}</p>`)
  }

  return html.join("")
}
