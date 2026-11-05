import { Link } from "react-router";
import { Logo } from "../components/Logo";
import { useCopy } from "../i18n";
import { LangToggle } from "../i18n/LangToggle";
import s from "./Form.module.css";
import { PaletteHero } from "./PaletteHero";

export function NotFound() {
  const t = useCopy();
  return (
    <main className={`${s.page} ${s.center}`}>
      <div className={s.top}>
        <Link to="/" aria-label={t.notFound.back} style={{ color: "inherit" }}>
          <Logo size={22} />
        </Link>
        <LangToggle />
      </div>
      <div className={s.hero}>
        <h1 className={s.title}>{t.notFound.title}</h1>
        <PaletteHero className={s.board} />
        <Link to="/" className={s.back}>
          {t.notFound.back}
        </Link>
      </div>
    </main>
  );
}
