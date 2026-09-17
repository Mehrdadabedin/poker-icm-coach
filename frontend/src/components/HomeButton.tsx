import { useNavigate } from "react-router-dom";

/** HOME control shared by every screen except the table and the home page
 * itself, which repeated this same button and navigate() call six times. */
export function HomeButton() {
  const navigate = useNavigate();
  return (
    <button className="btn btn-small" onClick={() => navigate("/")}>HOME</button>
  );
}
