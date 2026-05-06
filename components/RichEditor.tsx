"use client";

import { useEffect, useRef } from "react";
import { Bold, Italic, List, Heading2, Heading3, Quote } from "lucide-react";

type Props = {
  /** Legacy: uncontrolled initial value. */
  defaultValue?: string;
  /** Controlled value (pairs with onChange). */
  value?: string;
  /** Called whenever the user edits. */
  onChange?: (html: string) => void;
  /** If set, renders a hidden input with the HTML so a native form submit picks it up. */
  name?: string;
};

export default function RichEditor({ defaultValue = "", value, onChange, name }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  // Sync controlled `value` down to the element when it changes externally.
  useEffect(() => {
    if (value != null && ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value;
    }
  }, [value]);

  function exec(cmd: string, val?: string) {
    document.execCommand(cmd, false, val);
    ref.current?.focus();
    emitChange();
  }

  function emitChange() {
    if (onChange && ref.current) onChange(ref.current.innerHTML);
  }

  const tools = [
    { icon: Bold, cmd: "bold", title: "Bold" },
    { icon: Italic, cmd: "italic", title: "Italic" },
    { icon: Heading2, cmd: "formatBlock", val: "h2", title: "Heading 2" },
    { icon: Heading3, cmd: "formatBlock", val: "h3", title: "Heading 3" },
    { icon: List, cmd: "insertUnorderedList", title: "Bullet list" },
    { icon: Quote, cmd: "formatBlock", val: "blockquote", title: "Blockquote" },
  ];

  return (
    <div className="border border-neutral-300 rounded-lg overflow-hidden focus-within:border-black transition">
      <div className="flex items-center gap-1 px-3 py-2 border-b border-neutral-200 bg-neutral-50">
        {tools.map(({ icon: Icon, cmd, val, title }) => (
          <button
            key={title}
            type="button"
            title={title}
            onMouseDown={(e) => { e.preventDefault(); exec(cmd, val); }}
            className="p-1.5 rounded hover:bg-neutral-200 text-neutral-600 hover:text-black transition"
          >
            <Icon className="w-3.5 h-3.5" />
          </button>
        ))}
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={emitChange}
        onBlur={emitChange}
        dangerouslySetInnerHTML={{ __html: value ?? defaultValue }}
        className="min-h-[160px] px-4 py-3 text-sm outline-none prose prose-sm max-w-none"
        style={{ lineHeight: "1.7" }}
      />
      {name && <input type="hidden" name={name} value={value ?? ""} readOnly />}
    </div>
  );
}
