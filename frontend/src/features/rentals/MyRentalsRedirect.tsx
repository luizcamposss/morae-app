import { Navigate } from "react-router-dom";
import { useAuth } from "../../app/providers/useAuth";
import { getPrimaryRole } from "../../app/routes";

// "/my-rentals" (link of the owner's rent notifications): "Meus aluguéis" of the user's own area,
// since an Admin or síndico who owns a unit has it too.
export function MyRentalsRedirect() {
  const { user } = useAuth();
  const role = getPrimaryRole(user?.roles ?? []);
  const to = role === "Resident" ? "/resident/rentals" : role === "Master" ? "/master/dashboard" : `/${role === "Admin" ? "admin" : "syndic"}/my-rentals`;
  return <Navigate to={to} replace />;
}
