import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { calculateWorkerPayroll, generateAndStorePayslipPdf } from "@/lib/payroll-engine";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const payrollWizardSchema = z.object({
  periodStart: z.string().min(1),
  periodEnd: z.string().min(1),
});

export default function PayrollWizard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");

  const { data: workers, isLoading } = useQuery({
    queryKey: ["payroll-workers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("account_status", "approved")
        .eq("is_active", true)
        .order("full_name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const runPayroll = useMutation({
    mutationFn: async () => {
      const input = payrollWizardSchema.parse({ periodStart, periodEnd });

      for (const worker of workers ?? []) {
        // Get approved timesheets for this worker in the period
        const { data: timesheets, error: tsError } = await supabase
          .from("timesheets")
          .select("*")
          .eq("worker_id", worker.id)
          .eq("status", "approved")
          .gte("date", input.periodStart)
          .lte("date", input.periodEnd);
        if (tsError) throw tsError;

        const result = calculateWorkerPayroll({
          worker,
          timesheets: timesheets ?? [],
          isResident: true, // default to resident
        });

        // Insert into payslips table
        const { data: payslip, error: payslipError } = await supabase
          .from("payslips")
          .insert({
            worker_id: worker.id,
            period_start: input.periodStart,
            period_end: input.periodEnd,
            total_hours: result.approvedHours,
            hourly_rate: Number(worker.hourly_rate ?? 0),
            gross_pay: result.grossEarnings,
            deductions: result.fortnightlyPaye + result.employeeSuper + result.otherDeductions,
            net_pay: result.netPay,
            status: "generated",
            generated_by: user?.id ?? null,
          })
          .select()
          .single();
        if (payslipError) throw payslipError;

        // Generate PDF
        try {
          await generateAndStorePayslipPdf({ payslip, worker });
        } catch (pdfErr) {
          console.warn("PDF generation skipped:", pdfErr);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payslips"] });
      toast.success("Payroll generated and payslips created.");
    },
    onError: (error: any) => toast.error(error.message ?? "Payroll generation failed"),
  });

  const approveCycle = useMutation({
    mutationFn: async () => {
      const input = payrollWizardSchema.parse({ periodStart, periodEnd });
      const { data: generatedPayslips, error } = await supabase
        .from("payslips")
        .select("id")
        .eq("period_start", input.periodStart)
        .eq("period_end", input.periodEnd)
        .eq("status", "generated");
      if (error) throw error;

      if ((generatedPayslips?.length ?? 0) === 0) {
        throw new Error("No generated payslips found for the selected period.");
      }

      const { error: updateError } = await supabase
        .from("payslips")
        .update({
          status: "paid" as const,
          paid_by: user?.id ?? null,
          paid_at: new Date().toISOString(),
        })
        .in("id", (generatedPayslips ?? []).map((p) => p.id));
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payslips"] });
      toast.success("Payroll cycle approved and marked as paid.");
    },
    onError: (error: any) => toast.error(error.message ?? "Payroll approval failed"),
  });

  const workerCount = useMemo(() => workers?.length ?? 0, [workers]);

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Payroll Wizard</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input type="date" value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} />
            <Input type="date" value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} />
          </div>

          <div className="text-sm text-muted-foreground">
            Approved workers in scope: {isLoading ? "-" : workerCount}
          </div>

          {isLoading && (
            <>
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              className="flex-1"
              disabled={runPayroll.isPending || !periodStart || !periodEnd || isLoading}
              onClick={() => runPayroll.mutate()}
            >
              {runPayroll.isPending ? "Generating..." : "Generate Payroll + Payslips"}
            </Button>
            <Button
              variant="secondary"
              className="flex-1"
              disabled={approveCycle.isPending || !periodStart || !periodEnd}
              onClick={() => approveCycle.mutate()}
            >
              {approveCycle.isPending ? "Approving..." : "Approve Payroll Cycle"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
