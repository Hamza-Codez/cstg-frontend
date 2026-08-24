import Link from "next/link";
import { redirect } from "next/navigation";

import { SignUpForm } from "@/components/forms/sign-up-form";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { landingFor } from "@/config/nav";
import { getSession } from "@/lib/auth/session";
import { ACTIONS } from "@/lib/labels";

export const metadata = { title: "Create account · Support Engine" };

export default async function SignUpPage() {
  const session = await getSession();
  if (session) redirect(landingFor(session.role));

  return (
    <div className="flex flex-col gap-3">
      <Card>
        <CardHeader>
          <CardTitle>{ACTIONS.signUp}</CardTitle>
        </CardHeader>
        <CardBody>
          <SignUpForm />
        </CardBody>
      </Card>
      <p className="text-center text-sm text-text/70">
        Already have an account?{" "}
        <Link href="/sign-in" className="cursor-pointer text-structure hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
