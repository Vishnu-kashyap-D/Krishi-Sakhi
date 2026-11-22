import React from 'react';

// Minimal Markdown renderer for chatbot replies: headings, bullet/numbered
// lists, **bold** and *italic*. It builds React elements (no raw HTML), so
// model output cannot inject markup.
const renderInline = (text, keyPrefix) => {
  const parts = [];
  const re = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/g;
  let last = 0;
  let m;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const token = m[0];
    if (token.startsWith('**')) parts.push(<strong key={`${keyPrefix}-b${i++}`}>{token.slice(2, -2)}</strong>);
    else parts.push(<em key={`${keyPrefix}-i${i++}`}>{token.slice(1, -1)}</em>);
    last = m.index + token.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
};

const SimpleMarkdown = ({ text }) => {
  const lines = String(text || '').split(/\r?\n/);
  const blocks = [];
  let list = null;

  const flushList = () => {
    if (list) {
      const Tag = list.ordered ? 'ol' : 'ul';
      blocks.push(
        <Tag key={`l${blocks.length}`} className={`${list.ordered ? 'list-decimal' : 'list-disc'} pl-5 space-y-1 my-1`}>
          {list.items.map((item, idx) => <li key={idx}>{renderInline(item, `li${blocks.length}-${idx}`)}</li>)}
        </Tag>
      );
      list = null;
    }
  };

  lines.forEach((raw, idx) => {
    const line = raw.trimEnd();
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    const heading = line.match(/^\s*#{1,6}\s+(.*)$/);

    if (bullet || numbered) {
      const ordered = Boolean(numbered);
      if (!list || list.ordered !== ordered) {
        flushList();
        list = { ordered, items: [] };
      }
      list.items.push((bullet || numbered)[1]);
      return;
    }
    flushList();
    if (heading) {
      blocks.push(<p key={`h${idx}`} className="font-semibold mt-2">{renderInline(heading[1], `h${idx}`)}</p>);
    } else if (line.trim()) {
      blocks.push(<p key={`p${idx}`} className="my-1">{renderInline(line, `p${idx}`)}</p>);
    }
  });
  flushList();

  return <div className="text-sm md:text-base break-words">{blocks}</div>;
};

export default SimpleMarkdown;
