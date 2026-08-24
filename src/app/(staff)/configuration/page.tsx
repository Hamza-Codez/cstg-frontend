import { redirect } from "next/navigation";

import { PriorityMatrix } from "@/components/forms/priority-matrix";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { getConfiguration } from "@/lib/api/admin";
import { getSession } from "@/lib/auth/session";
import { priorityLabel } from "@/lib/labels";

export const metadata = { title: "Configuration · Support Engine" };

function readableHours(seconds: number): string {
  return `${Math.round(seconds / 3600)}h`;
}

export default async function ConfigurationPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const result = await getConfiguration(session.token);
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

  const { priority_rules, sla_durations } = result.data;

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
          <CardTitle>SLA windows</CardTitle>
        </CardHeader>
        <CardBody className="flex flex-col gap-2">
          <p className="text-xs text-text/60">
            Read-only reference. Durations are fixed in this version.
          </p>
          <dl className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
            {sla_durations.map((entry) => (
              <div key={entry.priority} className="flex gap-2">
                <dt className="text-text/60">{priorityLabel(entry.priority)}</dt>
                <dd className="text-text">{readableHours(entry.seconds)}</dd>
              </div>
            ))}
          </dl>
        </CardBody>
      </Card>
    </div>
  );
}
