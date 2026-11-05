import { Link } from "react-router";

export function NotFound() {
  return (
    <main>
      <h1>Nie ma takiej strony</h1>
      <Link to="/">Nowa partia</Link>
    </main>
  );
}
