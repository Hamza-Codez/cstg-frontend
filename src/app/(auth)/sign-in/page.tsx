import Link from "next/link";
import { redirect } from "next/navigation";

import { SignInForm } from "@/components/forms/sign-in-form";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { landingFor } from "@/config/nav";
import { getSession } from "@/lib/auth/session";

export const metadata = { title: "Sign in · Support Engine" };

export default async function SignInPage() {
  // Already signed in: go straight to the role's landing screen (§6).
  const session = await getSession();
  if (session) redirect(landingFor(session.role));

  return (
    <div className="flex flex-col gap-3">
      <Card>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
      </CardHeader>
      <CardBody>
        <SignInForm />
      </CardBody>
      </Card>
      <p className="text-center text-sm text-text/70">
        New here?{" "}
        <Link href="/sign-up" className="cursor-pointer text-structure hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
