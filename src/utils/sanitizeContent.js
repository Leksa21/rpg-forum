const sanitizeHtml = require('sanitize-html');

// Rich-text allowlist for forum posts/replies. Players may format text (bold,
// italic, underline, strike, colour), add links, lists, quotes, headings and
// images by URL — nothing executable. Sanitizing at the write boundary means
// stored content is always safe regardless of how it is later rendered.
const OPTIONS = {
  allowedTags: [
    'p', 'br', 'b', 'strong', 'i', 'em', 'u', 's',
    'span', 'a', 'img', 'ul', 'ol', 'li', 'blockquote', 'h3', 'h4',
  ],
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
    img: ['src', 'alt'],
    span: ['style'],
    '*': ['style'],
  },
  allowedStyles: {
    '*': {
      color: [/^#(0x)?[0-9a-f]+$/i, /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/i, /^[a-z-]+$/i],
    },
  },
  // Links and images may only point at http(s) — no javascript:, no data:.
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesByTag: { img: ['http', 'https'] },
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { target: '_blank', rel: 'noopener noreferrer' }),
  },
};

function sanitizeRich(html) {
  if (typeof html !== 'string') return '';
  return sanitizeHtml(html, OPTIONS).trim();
}

module.exports = { sanitizeRich };
