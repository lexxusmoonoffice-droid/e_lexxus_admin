"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { SlideStyles } from "./HeroSlideForm";
import { DEFAULT_STYLES } from "./HeroSlideForm";

/* ── Inline keyframe styles injected once ── */
const ANIM_STYLE = `
@keyframes _ken-burns {
  0%   { transform: scale(1.08) translateX(0px); }
  100% { transform: scale(1.0)  translateX(-20px); }
}
@keyframes _fade-up {
  0%   { opacity: 0; transform: translateY(28px); }
  100% { opacity: 1; transform: translateY(0); }
}
@keyframes _fade-in {
  0%   { opacity: 0; }
  100% { opacity: 1; }
}
@keyframes _slide-in-left {
  0%   { opacity: 0; transform: translateX(-40px); }
  100% { opacity: 1; transform: translateX(0); }
}
@keyframes _line-grow {
  0%   { width: 0px; }
  100% { width: 48px; }
}
`;

const DURATION = 7000;

export type PreviewSlide = {
  img: string;
  tag: string;
  title: [string, string];
  sub: string;
  cta: string;
  href: string;
  accent: string;
  styles?: Partial<SlideStyles>;
};

type Breakpoint = {
  key: string;
  label: string;
  shortLabel: string;
  width: string | number;
  icon: string;
  group: "mobile" | "tablet" | "desktop";
};

const BREAKPOINTS: Breakpoint[] = [
  { key: "mobile",   label: "Mobile (390px)",    shortLabel: "390",  width: 390,   icon: "📱", group: "mobile"  },
  { key: "tablet",   label: "Tablet (768px)",     shortLabel: "768",  width: 768,   icon: "📲", group: "tablet"  },
  { key: "laptop",   label: "Laptop (1024px)",    shortLabel: "1024", width: 1024,  icon: "💻", group: "desktop" },
  { key: "desktop",  label: "Desktop (1280px)",   shortLabel: "1280", width: 1280,  icon: "🖥️", group: "desktop" },
  { key: "wide",     label: "Wide (1440px)",      shortLabel: "1440", width: 1440,  icon: "🖥️", group: "desktop" },
  { key: "fullhd",   label: "Full HD (1920px)",   shortLabel: "1920", width: "100%", icon: "⬛", group: "desktop" },
];

export default function HeroSlidePreview({ slide }: { slide: PreviewSlide }) {
  const [bpKey, setBpKey] = useState("desktop");
  const [animKey, setAnimKey] = useState(0);
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(performance.now());

  const bp = BREAKPOINTS.find((b) => b.key === bpKey) ?? BREAKPOINTS[3];

  // Re-trigger animations when image changes
  const imgRef = useRef(slide.img);
  useEffect(() => {
    if (slide.img !== imgRef.current) {
      imgRef.current = slide.img;
      setAnimKey((k) => k + 1);
      setProgress(0);
      startRef.current = performance.now();
    }
  }, [slide.img]);

  // Progress bar rAF
  useEffect(() => {
    startRef.current = performance.now();
    const tick = (now: number) => {
      const elapsed = now - startRef.current;
      setProgress(Math.min((elapsed / DURATION) * 100, 100));
      if (elapsed < DURATION) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [animKey]);

  const replayAnim = useCallback(() => {
    setAnimKey((k) => k + 1);
    setProgress(0);
    startRef.current = performance.now();
  }, []);

  const isEmpty = !slide.img;

  // Group breakpoints
  const mobileGroup = BREAKPOINTS.filter((b) => b.group === "mobile");
  const tabletGroup = BREAKPOINTS.filter((b) => b.group === "tablet");
  const desktopGroup = BREAKPOINTS.filter((b) => b.group === "desktop");

  return (
    <div className="flex flex-col h-full min-h-0">
      <style dangerouslySetInnerHTML={{ __html: ANIM_STYLE }} />

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0 flex-wrap gap-2">
        <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Live Preview</span>
        <div className="flex items-center gap-2 flex-wrap">

          {/* Breakpoint groups */}
          <div className="flex items-center border border-neutral-200 rounded overflow-hidden divide-x divide-neutral-200">
            {/* Mobile */}
            {mobileGroup.map((b) => (
              <BpButton key={b.key} bp={b} active={bpKey === b.key} onClick={() => setBpKey(b.key)} />
            ))}
            {/* Tablet */}
            {tabletGroup.map((b) => (
              <BpButton key={b.key} bp={b} active={bpKey === b.key} onClick={() => setBpKey(b.key)} />
            ))}
            {/* Desktop group divider */}
            <div className="px-1 text-[10px] text-neutral-400 bg-neutral-50 self-stretch flex items-center">
              Desktop
            </div>
            {desktopGroup.map((b) => (
              <BpButton key={b.key} bp={b} active={bpKey === b.key} onClick={() => setBpKey(b.key)} />
            ))}
          </div>

          {/* Replay */}
          <button
            onClick={replayAnim}
            title="Replay animations"
            className="px-2.5 py-1.5 text-xs border border-neutral-200 rounded bg-white hover:bg-neutral-50 text-neutral-500 whitespace-nowrap"
          >
            ▶ Replay
          </button>
        </div>
      </div>

      {/* Active breakpoint label */}
      <div className="flex items-center gap-2 mb-2 flex-shrink-0">
        <span className="text-[10px] text-neutral-400">{bp.label}</span>
        {typeof bp.width === "number" && (
          <span className="text-[10px] text-neutral-300">· scaled to fit</span>
        )}
      </div>

      {/* Preview frame (scroll if preview is wider than container) */}
      <div className="flex-1 min-h-0 overflow-auto bg-neutral-100 rounded-lg border border-neutral-200 p-3">
        <div
          style={{
            width: typeof bp.width === "number" ? `${bp.width}px` : bp.width,
            maxWidth: "100%",
            margin: "0 auto",
            transition: "width 0.3s ease",
          }}
        >
          {isEmpty ? (
            <div
              style={{ height: "360px" }}
              className="bg-neutral-800 flex flex-col items-center justify-center rounded text-white/40 gap-3"
            >
              <span style={{ fontSize: "40px" }}>🖼️</span>
              <p className="text-sm">Add a background image URL to see preview</p>
            </div>
          ) : (
            <SlidePreviewInner
              slide={slide}
              animKey={animKey}
              progress={progress}
              bpKey={bpKey}
            />
          )}
        </div>
      </div>

      {/* Hint */}
      <p className="text-[11px] text-neutral-400 mt-2 text-center flex-shrink-0">
        Preview updates live · ▶ Replay to restart animations
      </p>
    </div>
  );
}

function BpButton({
  bp, active, onClick,
}: {
  bp: Breakpoint;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={bp.label}
      className={`px-2 py-1.5 text-[11px] transition-colors whitespace-nowrap ${
        active ? "bg-black text-white" : "bg-white text-neutral-500 hover:bg-neutral-50"
      }`}
    >
      <span className="mr-0.5">{bp.icon}</span>
      {bp.shortLabel}
    </button>
  );
}

function SlidePreviewInner({
  slide, animKey, progress, bpKey,
}: {
  slide: PreviewSlide;
  animKey: number;
  progress: number;
  bpKey: string;
}) {
  const isMobile = bpKey === "mobile";
  const isTablet = bpKey === "tablet";
  const isLaptop = bpKey === "laptop";
  const isSmall = isMobile || isTablet;
  const isNarrow = isMobile;

  const s = { ...DEFAULT_STYLES, ...(slide.styles ?? {}) };

  const sectionStyle: React.CSSProperties = {
    position: "relative",
    overflow: "hidden",
    backgroundColor: "#0a0a0a",
    userSelect: "none",
    height: isMobile ? "500px" : isTablet ? "580px" : isLaptop ? "620px" : "680px",
    minHeight: "400px",
  };

  // Animation helpers (keyed so they replay)
  const fadeUp = (delay: string): React.CSSProperties => ({
    opacity: 0,
    animation: `_fade-up 0.7s ease-out ${delay} forwards`,
  });
  const fadeIn = (delay: string): React.CSSProperties => ({
    opacity: 0,
    animation: `_fade-in 0.6s ease-out ${delay} forwards`,
  });
  const slideInLeft = (delay: string): React.CSSProperties => ({
    opacity: 0,
    animation: `_slide-in-left 0.7s ease-out ${delay} forwards`,
  });

  const hPad = isNarrow ? "16px" : "32px";

  return (
    <section style={sectionStyle}>

      {/* Background image with Ken Burns */}
      <div style={{ position: "absolute", inset: 0, zIndex: 10 }}>
        <img
          key={`img-${animKey}`}
          src={slide.img}
          alt=""
          style={{
            position: "absolute", inset: 0, width: "100%", height: "100%",
            objectFit: "cover",
            animation: `_ken-burns ${DURATION + 1000}ms ease-out forwards`,
          }}
        />
      </div>

      {/* Gradient overlays */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 20, pointerEvents: "none",
        background: "linear-gradient(to right, rgba(0,0,0,0.80), rgba(0,0,0,0.40), transparent)",
      }} />
      <div style={{
        position: "absolute", inset: 0, zIndex: 20, pointerEvents: "none",
        background: "linear-gradient(to top, rgba(0,0,0,0.60), transparent, rgba(0,0,0,0.20))",
      }} />

      {/* Decorative center line (non-mobile) */}
      {!isSmall && (
        <div style={{
          position: "absolute", left: "calc(50% - 1px)", top: 0, bottom: 0,
          zIndex: 20, width: "1px", background: "rgba(255,255,255,0.05)", pointerEvents: "none",
        }} />
      )}

      {/* Top bar */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, zIndex: 30,
        padding: `${isNarrow ? 20 : 28}px ${hPad}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span
          key={`tag-${animKey}`}
          style={{
            fontSize: `${s.tagSize}px`,
            letterSpacing: "0.4em", textTransform: "uppercase",
            color: "rgba(255,255,255,0.75)",
            ...fadeIn("0.1s"),
          }}
        >
          {slide.tag || ""}
        </span>
        {/* Slide indicator dots */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "10px", letterSpacing: "0.1em", color: "white" }}>01</span>
          <span style={{ display: "block", height: "1px", width: "28px", background: "white" }} />
        </div>
      </div>

      {/* Main content */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 30,
        padding: `0 ${hPad} 72px`,
        display: "flex", flexDirection: "column", justifyContent: "flex-end",
      }}>

        {/* Accent */}
        <div
          key={`accent-${animKey}`}
          style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px", ...slideInLeft("0.05s") }}
        >
          <span style={{
            display: "block", height: "1px", background: "rgba(255,255,255,0.5)",
            width: 0, animation: `_line-grow 0.6s ease-out 0.3s forwards`,
          }} />
          <span style={{
            fontSize: `${s.accentSize}px`,
            letterSpacing: "0.35em", textTransform: "uppercase",
            color: "rgba(255,255,255,0.5)",
          }}>
            {slide.accent || ""}
          </span>
        </div>

        {/* Headline */}
        <div style={{ overflow: "hidden" }}>
          {slide.title.map((line, i) => (
            <div key={`${animKey}-line-${i}`} style={{ overflow: "hidden" }}>
              <h1 style={{
                fontSize: isNarrow
                  ? `clamp(2rem, 10vw, ${s.titleSize * 0.6}rem)`
                  : `${s.titleSize}rem`,
                fontWeight: 700, color: "white",
                lineHeight: 1.05, letterSpacing: "-0.02em", margin: 0,
                ...fadeUp(`${0.15 + i * 0.12}s`),
              }}>
                {line || (i === 0 ? "Title line 1" : "Title line 2")}
              </h1>
            </div>
          ))}
        </div>

        {/* Sub + CTA */}
        <div style={{
          marginTop: "24px",
          display: "flex", flexDirection: isNarrow ? "column" : "row",
          alignItems: isNarrow ? "flex-start" : "flex-end",
          gap: isNarrow ? "18px" : "48px",
        }}>
          <p
            key={`sub-${animKey}`}
            style={{
              color: "rgba(255,255,255,0.7)", maxWidth: "320px",
              lineHeight: 1.6, margin: 0, fontSize: `${s.subSize}px`,
              ...fadeUp("0.42s"),
            }}
          >
            {slide.sub || ""}
          </p>
          <div
            key={`cta-${animKey}`}
            style={{ display: "flex", alignItems: "center", gap: "16px", ...fadeUp("0.54s") }}
          >
            <div style={{
              display: "inline-flex", alignItems: "center", gap: "10px",
              background: "white", color: "black",
              padding: isNarrow ? "11px 22px" : "13px 28px",
              fontSize: `${s.ctaSize}px`, fontWeight: 600,
              letterSpacing: "0.2em", textTransform: "uppercase",
              cursor: "default",
            }}>
              {slide.cta || "Explore"}
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{ marginTop: "40px", display: "flex", alignItems: "center", gap: "20px" }}>
          <div style={{
            flex: 1, maxWidth: "180px", height: "1px",
            background: "rgba(255,255,255,0.15)", position: "relative", overflow: "hidden",
          }}>
            <div style={{
              position: "absolute", left: 0, top: 0, height: "100%",
              background: "white", width: `${progress}%`, transition: "none",
            }} />
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "5px" }}>
            <span style={{ color: "white", fontSize: "12px", fontWeight: 600, letterSpacing: "0.1em" }}>01</span>
            <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "11px" }}>/</span>
            <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "11px", letterSpacing: "0.1em" }}>01</span>
          </div>
          <div style={{ display: "flex", gap: "6px", marginLeft: "auto" }}>
            {["M15 19l-7-7 7-7", "M9 5l7 7-7 7"].map((d, i) => (
              <div key={i} style={{
                width: "36px", height: "36px",
                border: "1px solid rgba(255,255,255,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "white", cursor: "default",
              }}>
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={d} />
                </svg>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Preview + breakpoint badge */}
      <div style={{
        position: "absolute", top: "8px", left: "8px", zIndex: 40,
        display: "flex", gap: "4px",
      }}>
        <span style={{
          background: "rgba(0,0,0,0.55)", color: "rgba(255,255,255,0.55)",
          fontSize: "9px", letterSpacing: "0.1em", textTransform: "uppercase",
          padding: "3px 8px", borderRadius: "4px", backdropFilter: "blur(4px)",
        }}>
          Preview
        </span>
        <span style={{
          background: "rgba(0,0,0,0.55)", color: "rgba(255,255,255,0.55)",
          fontSize: "9px", letterSpacing: "0.1em",
          padding: "3px 8px", borderRadius: "4px", backdropFilter: "blur(4px)",
        }}>
          {typeof BREAKPOINTS.find(b => b.key === bpKey)?.width === "number"
            ? `${BREAKPOINTS.find(b => b.key === bpKey)?.width}px`
            : "1920px"}
        </span>
      </div>
    </section>
  );
}
