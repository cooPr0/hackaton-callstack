import { useParams } from "react-router";

export function RoomPage() {
  const { code } = useParams();
  return (
    <main>
      <h1>Pokój {code}</h1>
    </main>
  );
}
