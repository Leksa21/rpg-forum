import DOMPurify from 'dompurify';

const ALLOWED_TAGS = ['p', 'br', 'b', 'strong', 'i', 'em', 'u', 's', 'span', 'a', 'img', 'ul', 'ol', 'li', 'blockquote', 'h3', 'h4'];
const ALLOWED_ATTR = ['href', 'target', 'rel', 'src', 'alt', 'style'];

// Renders stored rich-text HTML. Content is already sanitized on the server,
// but we sanitize again on render as defence in depth (cheap, prevents any
// legacy or malformed content from executing).
export default function RichText({ html, className }) {
  const clean = DOMPurify.sanitize(html || '', { ALLOWED_TAGS, ALLOWED_ATTR });
  return (
    <div
      className={`rich-text${className ? ` ${className}` : ''}`}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
