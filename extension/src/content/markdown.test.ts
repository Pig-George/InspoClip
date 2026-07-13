import { describe, expect, test } from "vitest"

import { renderSafeMarkdown } from "./markdown"

describe("content markdown renderer", () => {
  test("renders common markdown blocks used by generated video prompts", () => {
    const html = renderSafeMarkdown(`# Title

Use **bold** text and \`inline code\`.

- First
- Second

\`\`\`json
{"foo": "bar"}
\`\`\``)

    expect(html).toContain("<h1>Title</h1>")
    expect(html).toContain("<strong>bold</strong>")
    expect(html).toContain("<code>inline code</code>")
    expect(html).toContain("<ul>")
    expect(html).toContain("<li>First</li>")
    expect(html).toContain("<pre><code>{&quot;foo&quot;: &quot;bar&quot;}</code></pre>")
  })

  test("escapes raw html before rendering markdown", () => {
    const html = renderSafeMarkdown(`Hello <img src=x onerror=alert(1)>

**<script>alert(1)</script>**`)

    expect(html).not.toContain("<img")
    expect(html).not.toContain("<script>")
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;")
    expect(html).toContain("<strong>&lt;script&gt;alert(1)&lt;/script&gt;</strong>")
  })
})
