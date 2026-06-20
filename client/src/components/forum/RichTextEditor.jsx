import { useRef, useEffect } from 'react';

const COLORS = ['#e6ddc9', '#c9a84c', '#e74c3c', '#3498db', '#27ae60', '#9b59b6', '#e67e22'];

// A lightweight Word-style editor: bold / italic / underline / colour / link /
// image-by-URL on a contentEditable surface. Emits HTML (sanitized server-side
// on save). Uncontrolled by design — we only reset the DOM when value is
// cleared externally, to avoid clobbering the caret on every keystroke.
export default function RichTextEditor({ value, onChange, placeholder }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current && (value ?? '') === '' && ref.current.innerHTML !== '') {
      ref.current.innerHTML = '';
    }
  }, [value]);

  const emit = () => onChange(ref.current?.innerHTML || '');

  const exec = (cmd, arg) => {
    ref.current?.focus();
    document.execCommand(cmd, false, arg);
    emit();
  };

  const addLink = () => {
    const url = window.prompt('Link URL (https://…)');
    if (url && /^https?:\/\//i.test(url)) exec('createLink', url);
  };

  const addImage = () => {
    const url = window.prompt('Image URL (https://…)');
    if (url && /^https?:\/\//i.test(url)) exec('insertImage', url);
  };

  // Keep focus in the editor when clicking toolbar buttons.
  const hold = (e) => e.preventDefault();

  return (
    <div className="rte">
      <div className="rte-toolbar">
        <button type="button" className="rte-btn" onMouseDown={hold} onClick={() => exec('bold')} title="Bold"><b>B</b></button>
        <button type="button" className="rte-btn" onMouseDown={hold} onClick={() => exec('italic')} title="Italic"><i>I</i></button>
        <button type="button" className="rte-btn" onMouseDown={hold} onClick={() => exec('underline')} title="Underline"><u>U</u></button>
        <button type="button" className="rte-btn" onMouseDown={hold} onClick={() => exec('strikeThrough')} title="Strikethrough"><s>S</s></button>
        <span className="rte-sep" />
        <div className="rte-colors">
          {COLORS.map(c => (
            <button
              key={c}
              type="button"
              className="rte-color"
              style={{ background: c }}
              onMouseDown={hold}
              onClick={() => exec('foreColor', c)}
              title="Text colour"
              aria-label={`Colour ${c}`}
            />
          ))}
        </div>
        <span className="rte-sep" />
        <button type="button" className="rte-btn" onMouseDown={hold} onClick={addLink} title="Insert link">🔗</button>
        <button type="button" className="rte-btn" onMouseDown={hold} onClick={addImage} title="Insert image from URL">🖼</button>
        <span className="rte-sep" />
        <button type="button" className="rte-btn" onMouseDown={hold} onClick={() => exec('insertUnorderedList')} title="Bullet list">•</button>
      </div>
      <div
        ref={ref}
        className="rte-area"
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={emit}
      />
    </div>
  );
}
