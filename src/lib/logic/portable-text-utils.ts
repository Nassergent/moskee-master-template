/**
 * Portable Text rendering utilities.
 * Pure functions: string in, string out. No side effects.
 */

/** Escape HTML special characters to prevent XSS. */
function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Apply inline marks (bold, italic, underline, etc.) to a text span. */
function applyMarks(text: string, marks: string[]): string {
  let result = text;
  for (const mark of marks) {
    if (mark === 'strong') result = `<strong>${result}</strong>`;
    else if (mark === 'em') result = `<em>${result}</em>`;
    else if (mark === 'underline') result = `<u>${result}</u>`;
    else if (mark === 'strike-through') result = `<s>${result}</s>`;
    else if (mark === 'code') result = `<code class="bg-neutral-100 px-1.5 py-0.5 text-sm">${result}</code>`;
  }
  return result;
}

/** Render inline children with basic marks (no link resolution). */
export function renderChildren(children: any[]): string {
  if (!children) return '';
  return children.map((child: any) => {
    const text = escapeHtml(child.text || '');
    if (!child.marks || child.marks.length === 0) return text;
    return applyMarks(text, child.marks);
  }).join('');
}

/** Render inline children with link resolution from markDefs. Includes XSS prevention for href. */
export function renderChildrenWithLinks(block: any): string {
  if (!block.children) return '';
  const markDefs = block.markDefs || [];

  return block.children.map((child: any) => {
    let text = escapeHtml(child.text || '');
    if (!child.marks || child.marks.length === 0) return text;

    for (const mark of child.marks) {
      if (['strong', 'em', 'underline', 'strike-through', 'code'].includes(mark)) {
        text = applyMarks(text, [mark]);
      } else {
        const def = markDefs.find((d: any) => d._key === mark);
        if (def && def._type === 'link') {
          const rawHref = def.href || '#';
          const isSafe = /^(https?:\/\/|\/|#|mailto:|tel:)/.test(rawHref.trim().toLowerCase());
          const href = isSafe ? rawHref : '#';
          const escapedHref = href.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
          const rel = href.startsWith('http') ? ' target="_blank" rel="noopener noreferrer"' : '';
          text = `<a href="${escapedHref}" class="text-primary hover:opacity-80 underline break-words"${rel}>${text}</a>`;
        }
      }
    }
    return text;
  }).join('');
}

/** Group consecutive list items into ul/ol groups for rendering. */
export function groupBlocks(blocks: any[]): any[] {
  const grouped: any[] = [];
  let currentList: any = null;

  for (const block of blocks) {
    if (block._type === 'block' && block.listItem) {
      const listType = block.listItem === 'number' ? 'ol' : 'ul';
      if (!currentList || currentList.type !== listType) {
        currentList = { type: listType, items: [] };
        grouped.push(currentList);
      }
      currentList.items.push(block);
    } else {
      currentList = null;
      grouped.push(block);
    }
  }
  return grouped;
}
