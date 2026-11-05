import { useCopy, useLang } from ".";
import { LANGS } from "./types";

/** Small PL | EN switch. */
export function LangToggle() {
  const t = useCopy();
  const { lang, setLang } = useLang();
  return (
    <fieldset
      style={{ border: 0, margin: 0, padding: 0, display: "inline-flex", gap: 2, fontSize: 12 }}
    >
      <legend className="visually-hidden">{t.lang.label}</legend>
      {LANGS.map((l) => (
        <button
          key={l}
          type="button"
          aria-pressed={lang === l}
          onClick={() => setLang(l)}
          style={{
            border: 0,
            borderRadius: 999,
            padding: "3px 8px",
            background: lang === l ? "var(--surface-strong)" : "transparent",
            color: lang === l ? "var(--on-surface-strong)" : "var(--muted)",
            fontWeight: 600,
          }}
        >
          {t.lang[l]}
        </button>
      ))}
    </fieldset>
  );
}
