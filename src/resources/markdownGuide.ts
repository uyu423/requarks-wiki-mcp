export const MARKDOWN_GUIDE_URI = 'wikijs://markdown-guide'

export const markdownGuideResource = {
  uri: MARKDOWN_GUIDE_URI,
  name: 'Wiki.js Markdown Syntax Guide',
  description:
    'Complete reference for Wiki.js-flavored Markdown including all non-standard extensions ' +
    '(blockquote styles, content tabs, image dimensions, diagrams, list styles, decorate syntax, etc.). ' +
    'Read this resource before writing or updating wiki pages with the markdown editor.',
  mimeType: 'text/markdown' as const
}

export const markdownGuideContent = `\
# Wiki.js Markdown Syntax Guide

Wiki.js supports the full [CommonMark](https://spec.commonmark.org/) specification plus GitHub Flavored Markdown (GFM) addons. On top of that, Wiki.js provides several **non-standard extensions** described below.

> This guide focuses on Wiki.js-specific extensions. Standard Markdown and GFM syntax (bold, italic, headers, links, code blocks, tables, etc.) work as expected.

---

## Blockquote Styles

Add a CSS class on a separate line immediately after a blockquote to change its color.

| Class | Color |
|-------|-------|
| \`{.is-info}\` | Blue |
| \`{.is-success}\` | Green |
| \`{.is-warning}\` | Yellow |
| \`{.is-danger}\` | Red |

### Example

\`\`\`markdown
> This is an important informational note.
{.is-info}

> Warning: this action cannot be undone.
{.is-warning}
\`\`\`

Without a class, blockquotes render with default (unstyled) appearance.

---

## Content Tabs

Create tabbed content by adding \`{.tabset}\` to a parent heading. All immediate child headings (one level deeper) become tab labels.

### Rules
- Parent heading gets \`{.tabset}\` — its text is **not** displayed.
- Child headings must be exactly one level deeper (e.g., parent \`##\` → tabs \`###\`).
- Maximum parent level: \`#####\` (h5), with tabs at \`######\` (h6).

### Example

\`\`\`markdown
## Configuration {.tabset}

### Windows

Install via the MSI installer...

### macOS

Install via Homebrew:
\\\`brew install wiki\\\`

### Linux

Install via apt:
\\\`sudo apt install wiki\\\`
\`\`\`

This renders as three tabs: **Windows**, **macOS**, **Linux**.

---

## Image Dimensions

Append \`=WIDTHxHEIGHT\` at the end of the image URL (inside the parentheses) to control size.

### Syntax

\`\`\`markdown
![Alt text](/path/to/image.jpg =WIDTHxHEIGHT)
\`\`\`

### Variations

| Syntax | Behavior |
|--------|----------|
| \`=300x200\` | Fixed 300px wide, 200px tall |
| \`=300x\` | 300px wide, height auto (keep ratio) |
| \`=x200\` | Width auto, 200px tall (keep ratio) |
| \`=100%x\` | Full available width, height auto |

### Example

\`\`\`markdown
![Logo](/assets/logo.png =200x)
![Banner](/assets/banner.jpg =100%x)
\`\`\`

---

## Mermaid Diagrams

Use a fenced code block with the language \`mermaid\`.

### Example

\`\`\`\`markdown
\`\`\`mermaid
graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action 1]
    B -->|No| D[Action 2]
\`\`\`
\`\`\`\`

Refer to the [Mermaid documentation](https://mermaid.js.org/) for full syntax.

---

## PlantUML Diagrams

Use a fenced code block with the language \`plantuml\`.

### Example

\`\`\`\`markdown
\`\`\`plantuml
Alice -> Bob: Hello
Bob --> Alice: Hi there
\`\`\`
\`\`\`\`

Refer to the [PlantUML documentation](https://plantuml.com/) for full syntax.

---

## Subscript and Superscript

| Feature | Syntax | Result |
|---------|--------|--------|
| Subscript | \`~text~\` | Renders as subscript |
| Superscript | \`^text^\` | Renders as superscript |

### Example

\`\`\`markdown
H~2~O is water.
E = mc^2^ is famous.
\`\`\`

---

## Keyboard Keys

Use HTML \`<kbd>\` tags to render keyboard key styling.

### Example

\`\`\`markdown
Press <kbd>Ctrl</kbd> + <kbd>C</kbd> to copy.
\`\`\`

---

## Footnotes

### Syntax

\`\`\`markdown
This claim needs a citation[^1] and this one too[^2].

[^1]: First footnote definition.
[^2]: Second footnote definition.
\`\`\`

Footnote definitions can be placed anywhere in the document; they are always rendered at the bottom.

---

## Task Lists (Checkboxes)

### Syntax

\`\`\`markdown
- [x] Completed task
- [x] Another completed task
- [ ] Pending task
\`\`\`

---

## Table Styles

Add \`{.dense}\` on a separate line after a table for compact rendering (smaller font + padding).

### Example

\`\`\`markdown
| Name | Value |
|------|-------|
| Foo  | 123   |
| Bar  | 456   |
{.dense}
\`\`\`

---

## List Styles

Add a class on a separate line after a list to change its appearance.

### Grid List

\`\`\`markdown
- Grid Item 1
- Grid Item 2
- Grid Item 3
{.grid-list}
\`\`\`

Renders items in a grid layout.

### Links List

\`\`\`markdown
- [Link Title 1 *Subtitle description here*](https://example.com)
- [Link Title 2 *Another subtitle*](https://example.com)
- [Link Title 3 *Third subtitle*](https://example.com)
{.links-list}
\`\`\`

Renders as styled link cards with subtitles.

> These list styles are Wiki.js-specific and fall back to standard list rendering in other Markdown viewers.
{.is-warning}

---

## Emojis

Use the \`:identifier:\` syntax.

### Example

\`\`\`markdown
:apple: :fire: :thumbsup:
\`\`\`

See the [Emoji Cheat Sheet](https://www.webfx.com/tools/emoji-cheat-sheet/) for all available identifiers.

---

## Strikethrough

Use double tildes (GFM syntax, also supported by Wiki.js).

\`\`\`markdown
~~deleted text~~
\`\`\`

---

## Decorate Syntax (Advanced)

When using \`{.class}\` is ambiguous (e.g., a blockquote containing a list), the class may be applied to the wrong element. Use the **decorate comment syntax** to specify the target explicitly.

### Syntax

\`\`\`markdown
<!-- {tag-name:.class-name} -->
\`\`\`

### Example

\`\`\`markdown
> Some text
> - Item 1
> - Item 2
<!-- {blockquote:.is-info} -->
\`\`\`

Without the decorate comment, \`{.is-info}\` would incorrectly apply to the list instead of the blockquote.

### Supported Targets

Use any HTML tag name as the target: \`blockquote\`, \`ul\`, \`ol\`, \`table\`, \`p\`, etc.

---

## Summary of Wiki.js-Specific Syntax

| Feature | Syntax | Standard Markdown? |
|---------|--------|--------------------|
| Blockquote styles | \`{.is-info}\` etc. after blockquote | No — Wiki.js only |
| Content tabs | \`{.tabset}\` on parent heading | No — Wiki.js only |
| Image dimensions | \`=WIDTHxHEIGHT\` in image URL | No — Wiki.js only |
| Mermaid diagrams | \`\`\`mermaid code block | Partial (some renderers) |
| PlantUML diagrams | \`\`\`plantuml code block | No — Wiki.js only |
| Subscript | \`~text~\` | No — Wiki.js extension |
| Superscript | \`^text^\` | No — Wiki.js extension |
| Dense table | \`{.dense}\` after table | No — Wiki.js only |
| Grid list | \`{.grid-list}\` after list | No — Wiki.js only |
| Links list | \`{.links-list}\` after list | No — Wiki.js only |
| Decorate syntax | \`<!-- {tag:.class} -->\` | No — Wiki.js only |
| Emojis | \`:identifier:\` | Partial (GFM) |
| Footnotes | \`[^1]\` / \`[^1]: text\` | Partial (not CommonMark) |
| Task lists | \`- [x]\` / \`- [ ]\` | GFM extension |
| Keyboard keys | \`<kbd>Key</kbd>\` | HTML (universally supported) |
| Strikethrough | \`~~text~~\` | GFM extension |
`
