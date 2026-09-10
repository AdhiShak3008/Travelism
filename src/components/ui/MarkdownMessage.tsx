"use client";

import React from "react";

interface Props {
  content: string;
  className?: string;
}

/**
 * Premium Markdown formatter for AI Concierge responses.
 * Formats Markdown tables, headers, bullet/numbered lists, callout boxes,
 * FAQ question-answer pairs, and inline elements (bold, code, links, tags).
 */
export function MarkdownMessage({ content, className = "" }: Props) {
  if (!content) return null;

  // Split into structural blocks (tables, headers, lists, callouts, paragraphs)
  const blocks = parseBlocks(content);

  return (
    <div className={`space-y-3 text-[13.5px] leading-relaxed text-ink ${className}`}>
      {blocks.map((block, idx) => {
        if (block.type === "header") {
          return (
            <h4
              key={idx}
              className="font-bold text-ink text-[13.5px] tracking-wide text-brand-dark/95 dark:text-brand-light flex items-center gap-2 pt-2 first:pt-0"
            >
              <span className="h-2 w-2 rounded-full bg-brand inline-block shrink-0 shadow-xs shadow-brand/40" />
              <span>{renderInline(block.content)}</span>
            </h4>
          );
        }

        if (block.type === "table") {
          return (
            <div
              key={idx}
              className="my-3 overflow-hidden rounded-xl border border-line/80 bg-paper-2/70 shadow-xs backdrop-blur-xs"
            >
              <div className="overflow-x-auto max-w-full">
                <table className="w-full text-left border-collapse min-w-[480px]">
                  <thead>
                    <tr className="border-b border-line bg-paper-3/90 text-ink">
                      {block.headers.map((h, hIdx) => (
                        <th
                          key={hIdx}
                          className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider text-ink/80 whitespace-nowrap select-none"
                        >
                          {renderInline(h)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/30">
                    {block.rows.map((row, rIdx) => (
                      <tr
                        key={rIdx}
                        className="hover:bg-brand/5 transition-colors group text-[12.5px] text-ink/90 odd:bg-paper-1/40"
                      >
                        {row.map((cell, cIdx) => {
                          const isPrimary = cIdx === 0;
                          return (
                            <td
                              key={cIdx}
                              className={`px-3 py-2.5 align-top leading-snug ${
                                isPrimary ? "font-semibold text-ink whitespace-normal min-w-[120px]" : "min-w-[90px]"
                              }`}
                            >
                              {renderTableCell(cell)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        }

        if (block.type === "callout") {
          return (
            <div
              key={idx}
              className="my-2.5 rounded-xl border-l-3 border-brand bg-brand/5 dark:bg-brand/10 px-3.5 py-2.5 text-[13px] text-ink shadow-2xs flex items-start gap-2.5"
            >
              <span className="text-brand text-sm mt-0.5 select-none shrink-0">💡</span>
              <div className="flex-1 leading-relaxed">{renderInline(block.content)}</div>
            </div>
          );
        }

        if (block.type === "faq") {
          return (
            <div
              key={idx}
              className="my-2 rounded-xl border border-line/80 bg-paper-2/60 p-3 shadow-2xs hover:border-brand/30 transition-colors"
            >
              <div className="flex items-start gap-2">
                <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-md bg-brand/15 text-[10px] font-black text-brand select-none mt-0.5">
                  Q
                </span>
                <div className="flex-1">
                  <h5 className="font-semibold text-ink text-[13px] leading-snug">
                    {renderInline(block.content)}
                  </h5>
                  {block.items.map((ans, aIdx) => (
                    <p key={aIdx} className="mt-1 text-[12.5px] text-ink/85 leading-relaxed">
                      {renderInline(ans)}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          );
        }

        if (block.type === "bullet_list") {
          return (
            <ul key={idx} className="my-2 space-y-1.5 pl-0.5">
              {block.items.map((item, itemIdx) => (
                <li key={itemIdx} className="flex items-start gap-2 text-[13px] leading-snug text-ink/90">
                  <span className="text-brand text-xs mt-0.5 select-none shrink-0 font-bold">✦</span>
                  <span className="flex-1">{renderInline(item)}</span>
                </li>
              ))}
            </ul>
          );
        }

        if (block.type === "numbered_list") {
          return (
            <ol key={idx} className="my-2 space-y-1.5 pl-0.5">
              {block.items.map((item, itemIdx) => (
                <li key={itemIdx} className="flex items-start gap-2 text-[13px] leading-snug text-ink/90">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand/10 text-[10px] font-bold text-brand mt-0.5 select-none">
                    {itemIdx + 1}
                  </span>
                  <span className="flex-1">{renderInline(item)}</span>
                </li>
              ))}
            </ol>
          );
        }

        if (block.type === "code") {
          return (
            <pre
              key={idx}
              className="my-2.5 overflow-x-auto rounded-xl bg-paper-3/90 p-3 text-xs font-mono text-ink border border-line/60"
            >
              <code>{block.content}</code>
            </pre>
          );
        }

        return (
          <p key={idx} className="text-[13.5px] leading-relaxed text-ink/90 first:mt-0">
            {renderInline(block.content)}
          </p>
        );
      })}
    </div>
  );
}

type Block =
  | { type: "paragraph"; content: string; items: string[] }
  | { type: "header"; content: string; items: string[] }
  | { type: "bullet_list"; content: string; items: string[] }
  | { type: "numbered_list"; content: string; items: string[] }
  | { type: "table"; headers: string[]; rows: string[][]; content: string; items: string[] }
  | { type: "callout"; content: string; items: string[] }
  | { type: "faq"; content: string; items: string[] }
  | { type: "code"; content: string; items: string[] };

function parseBlocks(raw: string): Block[] {
  // Pre-normalize concatenated table rows if the LLM emitted rows on single lines
  const normalized = raw
    .replace(/\|\s*\|\s*(?=[A-Za-z0-9\u00C0-\u024F\u1E00-\u1EFF\s\-_–—#*`[\]()~/₹€$]+)/g, "|\n|")
    .replace(/\r\n/g, "\n");

  const lines = normalized.split("\n");
  const blocks: Block[] = [];

  let currentList: { type: "bullet_list" | "numbered_list"; items: string[] } | null = null;
  let currentTableLines: string[] = [];
  let currentParagraph: string[] = [];
  let inCodeBlock = false;
  let codeContent: string[] = [];
  let inListContext = false;

  function flushParagraph() {
    if (currentParagraph.length > 0) {
      blocks.push({
        type: "paragraph",
        content: currentParagraph.join(" ").trim(),
        items: [],
      });
      currentParagraph = [];
    }
  }

  function flushList() {
    if (currentList && currentList.items.length > 0) {
      blocks.push({
        type: currentList.type,
        content: "",
        items: currentList.items,
      });
      currentList = null;
    }
  }

  function flushTable() {
    if (currentTableLines.length > 0) {
      const parsedTable = parseMarkdownTableBlock(currentTableLines);
      if (parsedTable.headers.length > 0) {
        blocks.push({
          type: "table",
          headers: parsedTable.headers,
          rows: parsedTable.rows,
          content: "",
          items: [],
        });
      }
      currentTableLines = [];
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Code blocks
    if (line.startsWith("```")) {
      if (inCodeBlock) {
        blocks.push({
          type: "code",
          content: codeContent.join("\n"),
          items: [],
        });
        codeContent = [];
        inCodeBlock = false;
      } else {
        flushParagraph();
        flushList();
        flushTable();
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeContent.push(lines[i]);
      continue;
    }

    if (!line) {
      flushParagraph();
      flushList();
      flushTable();
      inListContext = false;
      continue;
    }

    // Markdown Table Row
    if (line.startsWith("|") && line.endsWith("|") && line.includes("|")) {
      flushParagraph();
      flushList();
      currentTableLines.push(line);
      continue;
    } else {
      flushTable();
    }

    // Headers: ### Title, ## Title, # Title, or **Section Title** on its own line
    const isMarkdownHeader = /^#{1,4}\s+(.+)$/.test(line);
    const isStandaloneBoldHeader = /^\*\*[^*:]+\*\*:?$/.test(line);
    const isColonHeader = /^[A-Z][A-Za-z0-9\s&—–/]{2,45}:$/.test(line);
    const isProminentTitle =
      !line.endsWith(".") &&
      !line.endsWith(",") &&
      line.length <= 80 &&
      (line.startsWith("How to ") ||
        line.startsWith("Quick FAQ") ||
        line.startsWith("Visa Requirements") ||
        line.startsWith("Day ") ||
        /^[A-Z][A-Za-z0-9\s&—–/🌍✈️💡🧭✨]{2,50}$/.test(line));

    if (isMarkdownHeader || isStandaloneBoldHeader || isColonHeader || isProminentTitle) {
      flushParagraph();
      flushList();
      const headerText = line
        .replace(/^#{1,4}\s+/, "")
        .replace(/^\*\*|\*\*$/g, "")
        .replace(/:$/, "")
        .trim();
      blocks.push({
        type: "header",
        content: headerText,
        items: [],
      });
      inListContext =
        isColonHeader ||
        headerText.toLowerCase().includes("document") ||
        headerText.toLowerCase().includes("checklist") ||
        headerText.toLowerCase().includes("tips") ||
        headerText.toLowerCase().includes("steps");
      continue;
    }

    // Callout / Blockquote: > text
    if (line.startsWith(">")) {
      flushParagraph();
      flushList();
      blocks.push({
        type: "callout",
        content: line.replace(/^>\s*/, "").trim(),
        items: [],
      });
      continue;
    }

    // Bullet item: - item, * item, • item, ✦ item
    const bulletMatch = line.match(/^[-*•✦]\s+(.+)$/);
    if (bulletMatch) {
      flushParagraph();
      if (!currentList || currentList.type !== "bullet_list") {
        flushList();
        currentList = { type: "bullet_list", items: [] };
      }
      currentList.items.push(bulletMatch[1]);
      inListContext = true;
      continue;
    }

    // Numbered item: 1. item, 2. item
    const numberedMatch = line.match(/^\d+\.\s+(.+)$/);
    if (numberedMatch) {
      flushParagraph();
      if (!currentList || currentList.type !== "numbered_list") {
        flushList();
        currentList = { type: "numbered_list", items: [] };
      }
      currentList.items.push(numberedMatch[1]);
      inListContext = true;
      continue;
    }

    // Q&A / FAQ Item: e.g. "Can I use the same visa...? Yes, ..." or "Q: ... A: ..."
    const faqMatch = line.match(/^((?:Can|Do|What|How|Is|Where|Why|Will|Should|Q:)[^?]+\?)\s*(.+)$/i);
    if (faqMatch) {
      flushParagraph();
      flushList();
      blocks.push({
        type: "faq",
        content: faqMatch[1].trim(),
        items: [faqMatch[2].trim()],
      });
      continue;
    }

    // Key-Value / Action item with dash: e.g. "Apply for multi-country... – Since you'll..."
    const itemDashMatch = line.match(/^([A-Z][^–—\n]{3,45})\s*[–—]\s*(.+)$/);
    if (itemDashMatch) {
      flushParagraph();
      if (!currentList || currentList.type !== "bullet_list") {
        flushList();
        currentList = { type: "bullet_list", items: [] };
      }
      currentList.items.push(`**${itemDashMatch[1].trim()}**: ${itemDashMatch[2].trim()}`);
      inListContext = true;
      continue;
    }

    // If we are under a list context (like "Gather documents:") and lines are standalone items
    if (inListContext && line.length < 120 && (line.endsWith(".") || line.endsWith(")")) && !line.includes("  ")) {
      flushParagraph();
      if (!currentList || currentList.type !== "bullet_list") {
        flushList();
        currentList = { type: "bullet_list", items: [] };
      }
      currentList.items.push(line);
      continue;
    }

    // Normal paragraph text
    if (currentList) {
      flushList();
      inListContext = false;
    }
    currentParagraph.push(line);
  }

  flushParagraph();
  flushList();
  flushTable();

  return blocks;
}

function parseMarkdownTableBlock(tableLines: string[]): { headers: string[]; rows: string[][] } {
  const rawRows = tableLines
    .join("\n")
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

  let headerCells: string[] = [];
  const bodyRows: string[][] = [];

  for (const line of rawRows) {
    const subRows = line.split(/\|\s*\|\s*(?=[A-Za-z0-9\u00C0-\u024F\u1E00-\u1EFF\s\-_–—#*`[\]()~/₹€$]+)/);
    for (let sub of subRows) {
      let trimmed = sub.trim();
      if (!trimmed) continue;
      if (!trimmed.startsWith("|")) trimmed = "|" + trimmed;
      if (!trimmed.endsWith("|")) trimmed = trimmed + "|";

      const cells = trimmed
        .slice(1, -1)
        .split("|")
        .map((c) => c.trim());

      // Ignore separator row like |---|---|
      if (cells.every((c) => /^:?-+:?$/.test(c) || c === "")) {
        continue;
      }

      if (headerCells.length === 0) {
        headerCells = cells;
      } else {
        if (cells.length < headerCells.length) {
          while (cells.length < headerCells.length) {
            cells.push("");
          }
        }
        bodyRows.push(cells);
      }
    }
  }

  return { headers: headerCells, rows: bodyRows };
}

/** Render table cell with pill badge highlighting for common status/visa attributes */
function renderTableCell(cell: string): React.ReactNode {
  const trimmed = cell.trim();
  if (!trimmed) return <span className="text-ink-faint italic">—</span>;

  // Highlight Yes / Schengen / Visa-Free statuses with clean pill badges
  if (/^Yes\b/i.test(trimmed)) {
    return (
      <div className="flex flex-col gap-0.5">
        <span className="inline-flex w-fit items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
          ✓ {renderInline(trimmed)}
        </span>
      </div>
    );
  }

  if (/^No\b/i.test(trimmed) || /Visa-free/i.test(trimmed)) {
    return (
      <div className="flex flex-col gap-0.5">
        <span className="inline-flex w-fit items-center gap-1 rounded-full bg-sky-500/10 px-2 py-0.5 text-[11px] font-bold text-sky-700 dark:text-sky-300 border border-sky-500/20">
          ✨ {renderInline(trimmed)}
        </span>
      </div>
    );
  }

  return renderInline(trimmed);
}

/** Render bold (**...**), code (`...`), emphasis (*...*), and markdown links ([...](...)) */
function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  // Tokenize: **bold**, `code`, [link](url), *italic*
  const regex = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\)|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    const token = match[0];

    if (token.startsWith("**") && token.endsWith("**")) {
      parts.push(
        <strong key={match.index} className="font-semibold text-ink">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith("`") && token.endsWith("`")) {
      parts.push(
        <code
          key={match.index}
          className="rounded bg-paper-3 px-1.5 py-0.5 text-xs font-mono font-medium text-brand"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith("[") && token.includes("](") && token.endsWith(")")) {
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        parts.push(
          <a
            key={match.index}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand hover:underline font-medium"
          >
            {linkMatch[1]}
          </a>
        );
      } else {
        parts.push(token);
      }
    } else if (token.startsWith("*") && token.endsWith("*")) {
      parts.push(
        <em key={match.index} className="italic text-ink-soft">
          {token.slice(1, -1)}
        </em>
      );
    }
    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}
