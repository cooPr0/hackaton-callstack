import styles from "./Toast.module.css";

/**
 * A short message sliding in from the top edge. Controlled: render it while `message` is set
 * (the store clears it). `aria-live` so screen readers announce it.
 */
export function Toast({
  message,
  tone = "error",
}: {
  message: string | null;
  tone?: "error" | "info";
}) {
  return (
    <div className={styles.region} aria-live="polite" role="status">
      {message ? (
        <div key={message} className={`${styles.toast} ${tone === "error" ? styles.error : ""}`}>
          {message}
        </div>
      ) : null}
    </div>
  );
}
