import { redirect } from "next/navigation";

import { landingFor } from "@/config/nav";
import { getSession } from "@/lib/auth/session";

/** Root sends each principal to its role landing screen (docs/UIUX_FRONTEND.md §6). */
export default async function Home() {
  const session = await getSession();
  redirect(session ? landingFor(session.role) : "/sign-in");
}
