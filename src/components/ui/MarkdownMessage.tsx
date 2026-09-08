"use client";

import React from "react";

interface Props {
  content: string;
  className?: string;
}

/**
 * Clean, lightweight Markdown formatter for AI Concierge responses.
 * Formats headers, bold tags, bullet lists, numbered steps, and callout sections.
 */
export function MarkdownMessage({ content, className = "" }: Props) {
  if (!content) return null;

  // Split into structural blocks (paragraphs, lists, headers)
  const blocks = parseBlocks(content);

  return (
    <div className={`space-y-2.5 text-sm leading-relaxed text-ink ${className}`}>
      {blocks.map((block, idx) => {
        if (block.type === "header") {
          return (
            <h4
              key={idx}
              className="font-bold text-ink text-[13px] uppercase tracking-wider text-brand-dark/90 dark:text-brand-light flex items-center gap-1.5 pt-1.5 first:pt-0"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-brand inline-block" />
              {renderInline(block.content)}
            </h4>
          );
        }

        if (block.type === "bullet_list") {
          return (
            <ul key={idx} className="my-1.5 space-y-1.5 pl-0.5">
              {block.items.map((item, itemIdx) => (
                <li key={itemIdx} className="flex items-start gap-2 text-[13.5px] leading-snug text-ink/90">
                  <span className="text-brand text-xs mt-0.5 select-none shrink-0">✦</span>
                  <span className="flex-1">{renderInline(item)}</span>
                </li>
              ))}
            </ul>
          );
        }

        if (block.type === "numbered_list") {
          return (
            <ol key={idx} className="my-1.5 space-y-1.5 pl-0.5">
              {block.items.map((item, itemIdx) => (
                <li key={itemIdx} className="flex items-start gap-2 text-[13.5px] leading-snug text-ink/90">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand/10 text-[10px] font-bold text-brand mt-0.5 select-none">
                    {itemIdx + 1}
                  </span>
                  <span className="flex-1">{renderInline(item)}</span>
                </li>
              ))}
            </ol>
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

interface Block {
  type: "paragraph" | "header" | "bullet_list" | "numbered_list";
  content: string;
  items: string[];
}

function parseBlocks(raw: string): Block[] {
  const lines = raw.split("\n");
  const blocks: Block[] = [];
  let currentList: { type: "bullet_list" | "numbered_list"; items: string[] } | null = null;
  let currentParagraph: string[] = [];

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

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    // Headers: ### Title, ## Title, or **Section Title** on its own line
    const isMarkdownHeader = /^#{1,4}\s+(.+)$/.test(line);
    const isStandaloneBoldHeader = /^\*\*[^*:]+\*\*:?$/.test(line);

    if (isMarkdownHeader || isStandaloneBoldHeader) {
      flushParagraph();
      flushList();
      const headerText = line.replace(/^#{1,4}\s+/, "").replace(/^\*\*|\*\*$/g, "").trim();
      blocks.push({
        type: "header",
        content: headerText,
        items: [],
      });
      continue;
    }

    // Bullet item: - item, * item, • item
    const bulletMatch = line.match(/^[-*•]\s+(.+)$/);
    if (bulletMatch) {
      flushParagraph();
      if (!currentList || currentList.type !== "bullet_list") {
        flushList();
        currentList = { type: "bullet_list", items: [] };
      }
      currentList.items.push(bulletMatch[1]);
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
      continue;
    }

    // Normal text line
    if (currentList) {
      flushList();
    }
    currentParagraph.push(line);
  }

  flushParagraph();
  flushList();

  return blocks;
}

/** Render bold (**...**), code (`...`), and emphasis (*...*) within a text string */
function renderInline(text: string): React.ReactNode[] {
  // Regex tokenizing: **bold**, `code`, and plain text
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
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
