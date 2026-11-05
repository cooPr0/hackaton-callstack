import {
  type ChangeEvent,
  type InputHTMLAttributes,
  type Ref,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import styles from "./DisplayInput.module.css";

export interface DisplayInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "size"> {
  value: string;
  onValueChange: (value: string) => void;
  /** Largest font size in px; the text shrinks to fit the column as it grows. */
  maxFontSize?: number;
  minFontSize?: number;
  ref?: Ref<HTMLInputElement>;
}

/**
 * A huge display-type text field that looks like a headline being typed: the text is set in
 * the display face and a thick caret blinks after the last letter. A real <input> sits
 * underneath (keyboard, IME, autofill, a11y); the mirror only draws the caret.
 */
export function DisplayInput({
  value,
  onValueChange,
  maxFontSize = 52,
  minFontSize = 22,
  className,
  onFocus,
  onBlur,
  onSelect,
  ref,
  ...rest
}: DisplayInputProps) {
  const wrap = useRef<HTMLDivElement>(null);
  const text = useRef<HTMLSpanElement>(null);
  const [fontSize, setFontSize] = useState(maxFontSize);
  const [focused, setFocused] = useState(false);
  const [atEnd, setAtEnd] = useState(true);

  const refit = useCallback(() => {
    const w = wrap.current;
    const t = text.current;
    if (!w || !t) return;
    const current = Number.parseFloat(getComputedStyle(w).fontSize) || maxFontSize;
    const width = t.getBoundingClientRect().width;
    const available = w.clientWidth - 0.12 * current; // leave room for the caret
    if (width <= 0 || available <= 0) {
      setFontSize(maxFontSize);
      return;
    }
    const next = Math.max(minFontSize, Math.min(maxFontSize, (available / width) * current));
    setFontSize((prev) => (Math.abs(prev - next) < 0.5 ? prev : next));
  }, [maxFontSize, minFontSize]);

  useLayoutEffect(() => {
    void value;
    refit();
  }, [value, refit]);

  useLayoutEffect(() => {
    const w = wrap.current;
    if (!w || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => refit());
    ro.observe(w);
    return () => ro.disconnect();
  }, [refit]);

  const trackCaret = (el: HTMLInputElement) =>
    setAtEnd(el.selectionStart === el.selectionEnd && el.selectionEnd === el.value.length);

  const customCaret = focused && atEnd;

  return (
    <div
      ref={wrap}
      className={`display ${styles.wrap} ${className ?? ""}`}
      style={{ fontSize }}
      data-caret={customCaret ? "custom" : "native"}
    >
      <input
        {...rest}
        ref={ref}
        className={styles.input}
        value={value}
        spellCheck={false}
        autoComplete="off"
        autoCapitalize="sentences"
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          onValueChange(e.target.value);
          trackCaret(e.target);
        }}
        onSelect={(e) => {
          trackCaret(e.currentTarget);
          onSelect?.(e);
        }}
        onFocus={(e) => {
          setFocused(true);
          trackCaret(e.currentTarget);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
      />
      <span className={styles.mirror} aria-hidden="true">
        <span ref={text} className={styles.text}>
          {value}
        </span>
        <span
          className={`${styles.caret} ${
            customCaret ? "" : !focused && value === "" ? styles.resting : styles.hidden
          }`}
        />
      </span>
    </div>
  );
}
