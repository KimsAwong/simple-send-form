import { useAuth } from "@/contexts/AuthContext";
import CEODashboard from "./CEODashboard";
import SupervisorDashboard from "./SupervisorDashboard";
import WorkerDashboard from "./WorkerDashboard";
import PayrollOfficerDashboard from "./PayrollOfficerDashboard";
import FinanceDashboard from "./FinanceDashboard";

export default function DashboardRouter() {
  const { primaryRole } = useAuth();

  switch (primaryRole) {
    case 'ceo':
      return <CEODashboard />;
    case 'payroll_officer':
      return <PayrollOfficerDashboard />;
    case 'finance':
      return <FinanceDashboard />;
    case 'supervisor':
      return <SupervisorDashboard />;
    default:
      return <WorkerDashboard />;
  }
}
