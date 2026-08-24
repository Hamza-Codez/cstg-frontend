import Link from "next/link";

import { NewRequestForm } from "@/components/forms/new-request-form";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { ACTIONS } from "@/lib/labels";

export const metadata = { title: "New request · Support Engine" };

export default function NewRequestPage() {
  return (
    <div className="flex flex-col gap-4">
      <Link href="/requests" className="cursor-pointer text-sm text-structure hover:underline">
        ← My requests
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>{ACTIONS.newRequest}</CardTitle>
        </CardHeader>
        <CardBody>
          <NewRequestForm />
        </CardBody>
      </Card>
    </div>
  );
}
