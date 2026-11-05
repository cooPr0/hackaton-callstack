import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH } from "@tint/protocol";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Logo } from "../components/Logo";
import { useCopy } from "../i18n";
import { LangToggle } from "../i18n/LangToggle";
import { useGame } from "../store";
import s from "./Form.module.css";
import { PaletteHero } from "./PaletteHero";

const NAME_KEY = "tint:name";
const cleanCode = (v: string) =>
  v
    .toUpperCase()
    .split("")
    .filter((c) => ROOM_CODE_ALPHABET.includes(c))
    .join("")
    .slice(0, ROOM_CODE_LENGTH);

function lastName(): string {
  try {
    return localStorage.getItem(NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

/** /join/:code — claim an open seat in an online room (QR from the lobby lands here). */
export function JoinPage() {
  const t = useCopy();
  const params = useParams();
  const navigate = useNavigate();
  const joinRoom = useGame((st) => st.joinRoom);
  const [code, setCode] = useState(cleanCode(params.code ?? ""));
  const [name, setName] = useState(lastName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ready = code.length === ROOM_CODE_LENGTH && name.trim().length > 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    setBusy(true);
    setError(null);
    try {
      try {
        localStorage.setItem(NAME_KEY, name.trim());
      } catch {
        /* optional convenience */
      }
      await joinRoom(code, name.trim());
      navigate(`/room/${code}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className={s.page} onSubmit={submit}>
      <div className={s.top}>
        <Link to="/" aria-label={t.notFound.back} style={{ color: "inherit" }}>
          <Logo size={22} />
        </Link>
        <LangToggle />
      </div>
      <div className={s.hero}>
        <h1 className={s.title}>{t.join.title}</h1>
        <p className={s.tagline}>{t.tagline}</p>
        <PaletteHero className={s.board} />
      </div>
      <div className={s.form}>
        <label className={s.label}>
          {t.join.code}
          <input
            className={`${s.input} ${s.code}`}
            value={code}
            onChange={(e) => setCode(cleanCode(e.target.value))}
            inputMode="text"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            maxLength={ROOM_CODE_LENGTH}
          />
        </label>
        <label className={s.label}>
          {t.join.name}
          <input
            className={s.input}
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 24))}
            autoComplete="nickname"
            maxLength={24}
          />
        </label>
        <div className={s.spacer} />
        {error && (
          <p className={s.error} role="alert">
            {error}
          </p>
        )}
        <button type="submit" className={s.primary} disabled={!ready || busy}>
          {t.join.submit}
        </button>
        <Link to="/" className={s.link}>
          {t.setup.title}
        </Link>
      </div>
    </form>
  );
}
