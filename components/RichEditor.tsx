"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Heading2,
  Heading3,
  Italic,
  Link,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Strikethrough,
  Underline,
  Undo2,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Types                                                                       */
/* ─────────────────────────────────────────────────────────────────────────── */

type BtnTool = {
  type: "btn";
  icon: React.ElementType;
  cmd: string;
  val?: string;
  title: string;
  /** execCommand key to check active state via queryCommandState */
  checkCmd?: string;
  /** if set, active when queryCommandValue(checkCmd) === checkVal */
  checkVal?: string;
};
type ColorTool = {
  type: "color";
  cmd: "foreColor" | "hiliteColor";
  title: string;
  defaultColor: string;
};
type Tool = { type: "sep" } | BtnTool | ColorTool;

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Toolbar definition                                                          */
/* ─────────────────────────────────────────────────────────────────────────── */

const TOOLS: Tool[] = [
  { type: "btn", icon: Bold,          cmd: "bold",               checkCmd: "bold",               title: "Bold (Ctrl+B)"        },
  { type: "btn", icon: Italic,        cmd: "italic",             checkCmd: "italic",             title: "Italic (Ctrl+I)"      },
  { type: "btn", icon: Underline,     cmd: "underline",          checkCmd: "underline",          title: "Underline (Ctrl+U)"   },
  { type: "btn", icon: Strikethrough, cmd: "strikeThrough",      checkCmd: "strikeThrough",      title: "Strikethrough"        },
  { type: "sep" },
  { type: "btn", icon: Heading2, cmd: "formatBlock", val: "h2", title: "Heading 2",
    checkCmd: "formatBlock", checkVal: "h2" },
  { type: "btn", icon: Heading3, cmd: "formatBlock", val: "h3", title: "Heading 3",
    checkCmd: "formatBlock", checkVal: "h3" },
  { type: "sep" },
  { type: "btn", icon: List,        cmd: "insertUnorderedList", checkCmd: "insertUnorderedList", title: "Bullet list"   },
  { type: "btn", icon: ListOrdered, cmd: "insertOrderedList",   checkCmd: "insertOrderedList",   title: "Numbered list" },
  { type: "btn", icon: Quote, cmd: "formatBlock", val: "blockquote", title: "Blockquote",
    checkCmd: "formatBlock", checkVal: "blockquote" },
  { type: "sep" },
  { type: "btn", icon: AlignLeft,   cmd: "justifyLeft",   checkCmd: "justifyLeft",   title: "Align left"   },
  { type: "btn", icon: AlignCenter, cmd: "justifyCenter", checkCmd: "justifyCenter", title: "Align center" },
  { type: "btn", icon: AlignRight,  cmd: "justifyRight",  checkCmd: "justifyRight",  title: "Align right"  },
  { type: "sep" },
  { type: "color", cmd: "foreColor",  title: "Text color",     defaultColor: "#111827" },
  { type: "color", cmd: "hiliteColor", title: "Highlight color", defaultColor: "#fef08a" },
  { type: "sep" },
  { type: "btn", icon: Link,  cmd: "__link__", title: "Insert link"  },
  { type: "sep" },
  { type: "btn", icon: Undo2, cmd: "undo", title: "Undo (Ctrl+Z)" },
  { type: "btn", icon: Redo2, cmd: "redo", title: "Redo (Ctrl+Y)" },
];

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Active-state helpers                                                        */
/* ─────────────────────────────────────────────────────────────────────────── */

function buildActiveMap(): Record<string, boolean> {
  const map: Record<string, boolean> = {};
  for (const t of TOOLS) {
    if (t.type === "btn" && t.checkCmd) {
      const key = t.checkVal ? `${t.checkCmd}:${t.checkVal}` : t.checkCmd;
      try {
        if (t.checkVal) {
          map[key] = document.queryCommandValue(t.checkCmd).toLowerCase() === t.checkVal;
        } else {
          map[key] = document.queryCommandState(t.checkCmd);
        }
      } catch {
        map[key] = false;
      }
    }
  }
  return map;
}

function toolActiveKey(t: BtnTool): string {
  return t.checkVal ? `${t.checkCmd}:${t.checkVal}` : (t.checkCmd ?? "");
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Props                                                                       */
/* ─────────────────────────────────────────────────────────────────────────── */

type Props = {
  defaultValue?: string;
  value?: string;
  onChange?: (html: string) => void;
  name?: string;
  placeholder?: string;
  minHeight?: number;
};

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Component                                                                   */
/* ─────────────────────────────────────────────────────────────────────────── */

export default function RichEditor({
  defaultValue = "",
  value,
  onChange,
  name,
  placeholder = "Write a product description…",
  minHeight = 180,
}: Props) {
  const editorRef        = useRef<HTMLDivElement>(null);
  const isInternalChange = useRef(false);
  const lastSyncedValue  = useRef<string | undefined>(undefined);

  const [showPlaceholder, setShowPlaceholder] = useState(true);
  /** Map of checkCmd (or checkCmd:checkVal) → boolean */
  const [active, setActive] = useState<Record<string, boolean>>({});
  /** Currently selected text/fg color (shown as swatch on the button) */
  const [fgColor, setFgColor]   = useState("#111827");
  const [hlColor, setHlColor]   = useState("#fef08a");

  const fgInputRef = useRef<HTMLInputElement>(null);
  const hlRef      = useRef<HTMLInputElement>(null);

  /* ── Mount ──────────────────────────────────────────────────────────────── */
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    const initial = value ?? defaultValue;
    el.innerHTML = initial;
    lastSyncedValue.current = initial;
    setShowPlaceholder(!initial || initial === "<br>");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── External value sync ────────────────────────────────────────────────── */
  useEffect(() => {
    if (isInternalChange.current) { isInternalChange.current = false; return; }
    const el = editorRef.current;
    if (!el || value === undefined) return;
    if (value === lastSyncedValue.current) return;
    const sel = window.getSelection();
    const savedRange = sel && sel.rangeCount > 0 ? sel.getRangeAt(0).cloneRange() : null;
    el.innerHTML = value;
    lastSyncedValue.current = value;
    setShowPlaceholder(!value || value === "<br>");
    if (savedRange && el.contains(savedRange.startContainer)) {
      sel?.removeAllRanges();
      sel?.addRange(savedRange);
    }
  }, [value]);

  /* ── Selection-change → update active button states ────────────────────── */
  const refreshActive = useCallback(() => {
    setActive(buildActiveMap());
    // Also update the current foreground color swatch
    try {
      const fg = document.queryCommandValue("foreColor");
      if (fg) setFgColor(normalizeColor(fg));
    } catch { /* noop */ }
  }, []);

  useEffect(() => {
    document.addEventListener("selectionchange", refreshActive);
    return () => document.removeEventListener("selectionchange", refreshActive);
  }, [refreshActive]);

  /* ── Emit change ────────────────────────────────────────────────────────── */
  const emitChange = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    const html = el.innerHTML;
    const text = el.innerText.trim();
    setShowPlaceholder(!text || html === "<br>");
    refreshActive();
    if (!onChange) return;
    if (html === lastSyncedValue.current) return;
    isInternalChange.current = true;
    lastSyncedValue.current = html;
    onChange(html);
  }, [onChange, refreshActive]);

  /* ── Execute command ────────────────────────────────────────────────────── */
  function exec(cmd: string, val?: string) {
    const el = editorRef.current;
    if (!el) return;
    if (cmd === "__link__") {
      const url = window.prompt("Enter URL:", "https://");
      if (!url) return;
      el.focus();
      document.execCommand("createLink", false, url);
      emitChange();
      return;
    }
    el.focus();
    document.execCommand(cmd, false, val);
    emitChange();
  }

  /* ── Color apply ────────────────────────────────────────────────────────── */
  function applyColor(cmd: "foreColor" | "hiliteColor", color: string) {
    if (cmd === "foreColor") setFgColor(color);
    else setHlColor(color);
    exec(cmd, color);
  }

  /* ── Keyboard shortcuts ─────────────────────────────────────────────────── */
  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const mod = e.ctrlKey || e.metaKey;
    if (!mod) return;
    switch (e.key) {
      case "b": e.preventDefault(); exec("bold");      break;
      case "i": e.preventDefault(); exec("italic");    break;
      case "u": e.preventDefault(); exec("underline"); break;
      case "z": e.preventDefault(); exec(e.shiftKey ? "redo" : "undo"); break;
      case "y": e.preventDefault(); exec("redo"); break;
    }
  }

  const charCount = (editorRef.current?.innerText ?? (value ?? defaultValue))
    .replace(/\s+/g, " ").trim().length;

  /* ─────────────────────────────────────────────────────────────────────── */

  return (
    <div className="border border-neutral-300 rounded-lg overflow-hidden focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">

      {/* ══ Toolbar ══════════════════════════════════════════════════════════ */}
      <div
        className="flex items-center flex-wrap gap-0.5 px-2 py-1.5 border-b border-neutral-200 bg-neutral-50"
        onMouseDown={(e) => e.preventDefault()}
      >
        {TOOLS.map((t, i) => {
          /* Separator */
          if (t.type === "sep") {
            return <span key={i} className="w-px h-4 bg-neutral-300 mx-1 shrink-0" />;
          }

          /* Color picker button */
          if (t.type === "color") {
            const isFg   = t.cmd === "foreColor";
            const color  = isFg ? fgColor : hlColor;
            const inputR = isFg ? fgInputRef : hlRef;
            return (
              <div key={t.cmd} className="relative group">
                <button
                  type="button"
                  title={t.title}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    inputR.current?.click();
                  }}
                  className="flex flex-col items-center justify-center p-1.5 rounded hover:bg-neutral-200 transition-colors gap-0.5"
                >
                  {/* Letter A with color swatch underline */}
                  {isFg ? (
                    <>
                      <span className="text-[11px] font-bold leading-none text-neutral-700" style={{ fontFamily: "serif" }}>A</span>
                      <span className="w-3.5 h-1 rounded-sm" style={{ backgroundColor: color }} />
                    </>
                  ) : (
                    <>
                      {/* Highlighter icon: pen shape */}
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <rect x="3" y="1" width="8" height="9" rx="1" fill={color} stroke="#6b7280" strokeWidth="1"/>
                        <polygon points="5,10 9,10 7,13" fill={color} stroke="#6b7280" strokeWidth="0.8"/>
                      </svg>
                    </>
                  )}
                </button>
                {/* Hidden native color input */}
                <input
                  ref={isFg ? fgInputRef : hlRef}
                  type="color"
                  defaultValue={t.defaultColor}
                  className="absolute opacity-0 w-0 h-0 pointer-events-none"
                  onChange={(e) => applyColor(t.cmd, e.target.value)}
                  tabIndex={-1}
                />
              </div>
            );
          }

          /* Regular button */
          const isActive = t.checkCmd ? (active[toolActiveKey(t)] ?? false) : false;
          return (
            <button
              key={t.title}
              type="button"
              title={t.title}
              onMouseDown={(e) => { e.preventDefault(); exec(t.cmd, t.val); }}
              className={[
                "relative p-1.5 rounded transition-colors",
                isActive
                  ? "bg-indigo-600 text-white hover:bg-indigo-700"
                  : "text-neutral-600 hover:bg-neutral-200 hover:text-black",
              ].join(" ")}
            >
              <t.icon className="w-3.5 h-3.5" />
              {/* Active underline bar */}
              {isActive && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-[2px] rounded-full bg-indigo-300" />
              )}
            </button>
          );
        })}
      </div>

      {/* ══ Editor ═══════════════════════════════════════════════════════════ */}
      <div className="relative">
        {showPlaceholder && (
          <div
            aria-hidden
            className="absolute top-3 left-4 text-neutral-400 text-sm pointer-events-none select-none"
          >
            {placeholder}
          </div>
        )}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={emitChange}
          onBlur={emitChange}
          onKeyUp={refreshActive}
          onMouseUp={refreshActive}
          onKeyDown={handleKeyDown}
          spellCheck
          className="px-4 py-3 text-sm outline-none leading-7"
          style={{ minHeight }}
        />
      </div>

      {/* ══ Footer ═══════════════════════════════════════════════════════════ */}
      <div className="flex items-center justify-between px-3 py-1 border-t border-neutral-100 bg-neutral-50">
        <span className="text-[10px] text-neutral-400">
          Tip: Select text then click a button, or use <kbd className="px-1 py-0.5 bg-neutral-200 rounded text-[9px]">Ctrl+B/I/U</kbd>
        </span>
        <span className="text-[10px] text-neutral-400 tabular-nums">{charCount} chars</span>
      </div>

      {name && <input type="hidden" name={name} value={value ?? ""} readOnly />}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Utility: normalize browser color string to hex                             */
/* ─────────────────────────────────────────────────────────────────────────── */
function normalizeColor(color: string): string {
  if (!color || color === "false") return "#111827";
  // rgb(r, g, b) → #rrggbb
  const m = color.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
  if (m) {
    return (
      "#" +
      [m[1], m[2], m[3]]
        .map((n) => parseInt(n).toString(16).padStart(2, "0"))
        .join("")
    );
  }
  return color;
}
