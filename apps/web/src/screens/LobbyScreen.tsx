import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { isHost, participants } from "../app/roles";
import type { ScreenProps } from "../app/types";
import { Button } from "../components/Button";
import { Chip } from "../components/Chip";
import { useCopy } from "../i18n";
import { ClosedLayout } from "./ClosedLayout";
import styles from "./LobbyScreen.module.css";
import { run } from "./PauseSheet";

/** Brand colours from tokens.css, read at runtime so the QR never hard-codes a colour. */
function brandColors(): { dark: string; light: string } {
  const css = getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  // Fallbacks only matter if the tokens failed to load; qrcode needs #rrggbb.
  return { dark: read("--cocoa-spice", "#000000"), light: read("--cold-steel", "#ffffff") };
}

function useQr(text: string | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!text) return;
    let alive = true;
    QRCode.toDataURL(text, { margin: 1, width: 320, color: brandColors() })
      .then((u) => {
        if (alive) setUrl(u);
      })
      .catch(() => {
        if (alive) setUrl(null);
      });
    return () => {
      alive = false;
    };
  }, [text]);
  return url;
}

/** Room code in huge type, a QR to join from a phone, the seats and the host's start button. */
export function LobbyScreen(props: ScreenProps) {
  const t = useCopy();
  const { view, actions, pending } = props;
  const code = view?.roomCode ?? "";
  const qr = useQr(code ? `${location.origin}/join/${code}` : null);
  if (!view) return <ClosedLayout screen={props}>{null}</ClosedLayout>;

  const host = isHost(view);
  const enough = participants(view) >= 2;

  const footer = host ? (
    <div className={styles.footer}>
      {enough ? null : <p className={styles.note}>{t.closed.lobby.needPlayers}</p>}
      <Button disabled={!enough || pending} onClick={() => run(actions.start())}>
        {t.lobby.start}
      </Button>
    </div>
  ) : (
    <p className={styles.note}>{t.lobby.onlyHost}</p>
  );

  return (
    <ClosedLayout screen={props} header={t.lobby.code} pause={false} footer={footer}>
      <p className={`display ${styles.code}`}>
        <span aria-hidden="true">{code}</span>
        {/* Spelled out so screen readers read letters, not a made-up word. */}
        <span className="visually-hidden">{code.split("").join(" ")}</span>
      </p>

      <div className={styles.join}>
        <div className={styles.qr}>
          {qr ? <img src={qr} alt={t.closed.lobby.qrAlt(code)} width={132} height={132} /> : null}
        </div>
        <div className={styles.joinText}>
          <p className={styles.scan}>{t.lobby.scan}</p>
          <a className={styles.appLink} href={`tintandtell://join/${code}`}>
            {t.lobby.openInApp}
          </a>
        </div>
      </div>

      <h2 className={styles.label}>{t.lobby.waiting}</h2>
      <ul className={styles.seats}>
        {view.seats.map((s) => {
          const grok = s.kind === "grok";
          const open = !grok && s.platform === null;
          const you = view.you.includes(s.id);
          const platform =
            grok || s.platform === "bot"
              ? t.closed.lobby.platform.grok
              : s.platform
                ? t.closed.lobby.platform[s.platform]
                : null;
          return (
            <li key={s.id} className={styles.seat} data-open={open ? "" : undefined}>
              <Chip name={s.name} grok={grok} empty={open} hideName size={36} />
              <span className={styles.name}>
                {open ? t.lobby.openSeat : s.name}
                {you ? <span className={styles.tag}> · {t.closed.lobby.you}</span> : null}
                {s.id === view.hostSeatId && !you ? (
                  <span className={styles.tag}> · {t.closed.lobby.host}</span>
                ) : null}
              </span>
              {platform ? <span className={styles.platform}>{platform}</span> : null}
              {open ? null : (
                <span
                  className={styles.dot}
                  data-on={s.connected ? "" : undefined}
                  role="img"
                  aria-label={s.connected ? t.closed.lobby.online : t.closed.lobby.offline}
                />
              )}
            </li>
          );
        })}
      </ul>
    </ClosedLayout>
  );
}
