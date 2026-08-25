import { redirect } from "next/navigation";

import { PriorityMatrix } from "@/components/forms/priority-matrix";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { AssignmentSettingsForm } from "@/components/forms/assignment-settings-form";
import { PolicyHistory } from "@/components/config/policy-history";
import { SlaPolicyForm } from "@/components/forms/sla-policy-form";
import { getConfiguration, getSlaPolicyHistory } from "@/lib/api/admin";
import { getSession } from "@/lib/auth/session";

export const metadata = { title: "Configuration · Support Engine" };

export default async function ConfigurationPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  // Both together: history is reference material, and a failure to load it
  // must not take the form down with it.
  const [result, history] = await Promise.all([
    getConfiguration(session.token),
    getSlaPolicyHistory(session.token),
  ]);
  if (!result.ok) {
    return (
      <Card>
        <CardBody>
          <p className="text-sm text-overdue">
            {result.error.code === "FORBIDDEN"
              ? "You don't have access to this."
              : "Something went wrong on our end. Try again."}
          </p>
        </CardBody>
      </Card>
    );
  }

  const { priority_rules, sla_durations, assignment } = result.data;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-medium">Configuration</h1>

      <Card>
        <CardHeader>
          <CardTitle>Priority by plan and category</CardTitle>
        </CardHeader>
        <CardBody>
          <PriorityMatrix rules={priority_rules} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assignment</CardTitle>
        </CardHeader>
        <CardBody>
          <AssignmentSettingsForm settings={assignment} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Response times</CardTitle>
        </CardHeader>
        <CardBody className="flex flex-col gap-4">
          {/* Editable from P17 — was a read-only reference in v1. */}
          <SlaPolicyForm durations={sla_durations} />
          <PolicyHistory versions={history.ok ? history.data.items : []} />
        </CardBody>
      </Card>
    </div>
  );
}
