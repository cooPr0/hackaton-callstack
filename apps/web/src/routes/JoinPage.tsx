import { useParams } from "react-router";

export function JoinPage() {
  const { code } = useParams();
  return (
    <main>
      <h1>Dołącz do {code}</h1>
    </main>
  );
}
