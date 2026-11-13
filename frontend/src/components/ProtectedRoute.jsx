
import { Navigate, Outlet } from "react-router-dom";
import { getSession } from "../services/auth";

function ProtectedRoute({ allowedRoles }) {
  const session = getSession();

  if (!session?.token) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(session.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
