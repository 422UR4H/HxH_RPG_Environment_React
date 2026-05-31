import { Navigate } from "react-router-dom";
import useToken from "../hooks/useToken";

export default function GamePage() {
  const { token } = useToken();
  if (!token) return <Navigate to="/" replace />;
  return (
    <div style={{ color: "white", padding: "40px", fontFamily: "sans-serif" }}>
      Partida em andamento — em breve.
    </div>
  );
}
