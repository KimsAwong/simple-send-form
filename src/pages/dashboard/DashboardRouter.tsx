import { useAuth } from "@/contexts/AuthContext";
import CEODashboard from "./CEODashboard";
import SupervisorDashboard from "./SupervisorDashboard";
import WorkerDashboard from "./WorkerDashboard";

export default function DashboardRouter() {
  const { primaryRole } = useAuth();

  switch (primaryRole) {
    case 'ceo':
      return <CEODashboard />;
    case 'supervisor':
      return <SupervisorDashboard />;
    default:
      return <WorkerDashboard />;
  }
}
