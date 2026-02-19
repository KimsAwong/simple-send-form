import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Clock, FileText, DollarSign, ArrowRight, Loader2, User, ClipboardList, Info } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTimesheets } from "@/hooks/useTimesheets";
import { usePayslips } from "@/hooks/usePayslips";
import { useWorkSummaries, getCurrentFortnightPeriod } from "@/hooks/useWorkSummaries";

export default function WorkerDashboard() {
  const { user, primaryRole } = useAuth();
  const { data: timesheets, isLoading: loadingTimesheets } = useTimesheets();
  const { data: payslips } = usePayslips();
  const { data: summaries } = useWorkSummaries();

  const period = getCurrentFortnightPeriod();
  const hasSummaryThisPeriod = summaries?.some(
    (s: any) => s.period_start === period.start && s.period_end === period.end
  );

  const currentDate = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
  });

  const thisWeekHours = timesheets?.filter((t: any) => {
    const d = new Date(t.date);
    const now = new Date();
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
    return d >= weekStart && t.status === 'approved';
  }).reduce((sum: number, t: any) => sum + Number(t.total_hours || 0), 0) || 0;

  const latestPayslip = payslips?.[0];
  const pendingCount = timesheets?.filter((t: any) => t.status === 'pending').length || 0;

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-gradient-primary p-6 text-primary-foreground">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold">
              {greeting()}, {user?.full_name?.split(' ')[0]}! 👋
            </h1>
            <p className="text-primary-foreground/80 mt-1">{currentDate}</p>
          </div>
          <Badge className="bg-primary-foreground/20 text-primary-foreground border-0 gap-1 self-start">
            <User size={14} /> Worker
          </Badge>
        </div>
      </div>

      {/* Role Description */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div className="text-sm text-muted-foreground space-y-1">
              <p><strong>How it works:</strong></p>
              <ul className="list-disc list-inside space-y-1">
                <li>Your <strong>supervisor enters</strong> your daily clock-in and clock-out times — you cannot enter your own hours</li>
                <li>Once approved, your <strong>payslip is automatically generated</strong> and can be downloaded as PDF</li>
                <li>Every <strong>two weeks</strong>, you must submit a fortnightly work summary describing your tasks and site work</li>
                <li>The summary resets at the start of each new fortnight (1st–15th and 16th–end of month)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fortnightly Summary Alert */}
      {!hasSummaryThisPeriod && (
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ClipboardList className="h-5 w-5 text-warning" />
                <div>
                  <p className="font-medium text-sm">Fortnightly Summary Due</p>
                  <p className="text-xs text-muted-foreground">
                    Period: {new Date(period.start).toLocaleDateString()} – {new Date(period.end).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <Link to="/profile">
                <Button size="sm" className="gap-1"><ClipboardList size={14} /> Submit Now</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hours This Week</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{thisWeekHours.toFixed(1)}</div>
            <Progress value={(thisWeekHours / 40) * 100} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">of 40 hours target</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Latest Pay</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              K {latestPayslip ? Number(latestPayslip.net_pay).toLocaleString() : '0.00'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {latestPayslip ? `${new Date(latestPayslip.period_start).toLocaleDateString()} period` : 'No payslips yet'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Timesheets</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{timesheets?.length || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">All time entries</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting approval</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="card-hover">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-5 w-5 text-primary" />Timesheets
            </CardTitle>
            <CardDescription>View your work hours entered by your supervisor</CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/timesheet"><Button variant="outline" className="w-full gap-2">View Timesheets <ArrowRight size={14} /></Button></Link>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-5 w-5 text-primary" />Payslips
            </CardTitle>
            <CardDescription>
              {latestPayslip ? `Latest: K ${Number(latestPayslip.net_pay).toLocaleString()}` : 'No payslips yet'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/my-payslips"><Button variant="outline" className="w-full gap-2">View & Download <ArrowRight size={14} /></Button></Link>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-5 w-5 text-primary" />Profile
            </CardTitle>
            <CardDescription>View profile, bank details & submit summaries</CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/profile"><Button variant="outline" className="w-full gap-2">My Profile <ArrowRight size={14} /></Button></Link>
          </CardContent>
        </Card>
      </div>

      {/* Employment Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Employment Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-sm text-muted-foreground">Position</p>
              <p className="font-medium">{user?.position || '—'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Employment Type</p>
              <Badge>{user?.employment_type || 'permanent'}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Role</p>
              <Badge variant="outline" className="capitalize">{primaryRole}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Hourly Rate</p>
              <p className="font-medium">K {Number(user?.hourly_rate || 0).toFixed(2)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
