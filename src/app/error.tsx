"use client";

/**
 * Root error boundary (docs/UIUX_FRONTEND.md §8, FRONTEND_STRUCTURE.md §2).
 *
 * Copy follows §8: say what happened and offer the next step, without
 * apologising theatrically or leaking internals.
 *
 * One case self-heals. Next regenerates Server Action ids on every build, so a
 * tab opened before a rebuild or a deploy submits an id the server no longer
 * knows and throws "Server Action ... was not found". The page itself is fine —
 * the tab is simply stale — so we reload once to pick up the current bundle.
 * The attempt is recorded in sessionStorage so a genuinely broken action shows
 * the message instead of reloading forever.
 */

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { isStaleAction } from "@/lib/stale-action";

const RELOAD_GUARD = "cstg_stale_action_reload";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    if (!isStaleAction(error)) return;

    let alreadyTried = false;
    try {
      alreadyTried = sessionStorage.getItem(RELOAD_GUARD) === "1";
      sessionStorage.setItem(RELOAD_GUARD, "1");
    } catch {
      // Private mode or blocked storage: fall through and show the message
      // rather than risk a reload loop we cannot detect.
      return;
    }

    if (!alreadyTried) {
      setRecovering(true);
      window.location.reload();
    }
  }, [error]);

  useEffect(() => {
    // A render that got here without the stale-action signature means the guard
    // from a previous recovery is spent.
    if (!isStaleAction(error)) {
      try {
        sessionStorage.removeItem(RELOAD_GUARD);
      } catch {
        /* storage unavailable; nothing to clear */
      }
    }
  }, [error]);

  if (recovering) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4" aria-live="polite">
        <p className="text-sm text-text/70">Refreshing…</p>
      </div>
    );
  }

  const stale = isStaleAction(error);

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>{stale ? "This page is out of date" : "Something went wrong"}</CardTitle>
          </CardHeader>
          <CardBody className="flex flex-col gap-4">
            <p className="text-sm text-text">
              {stale
                ? "The app was updated while this tab was open. Reload to get the latest version."
                : "Something went wrong on our end. Try again."}
            </p>
            {error.digest && (
              <p className="text-xs text-text/50">Reference: {error.digest}</p>
            )}
            <div className="flex gap-2">
              <Button variant="primary" onClick={() => window.location.reload()}>
                Reload
              </Button>
              {!stale && (
                <Button variant="secondary" onClick={reset}>
                  Try again
                </Button>
              )}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
