"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { track } from "../../lib/analytics";

/** page_view の送信だけを担当する。管理画面は計測しない。 */
export function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return;
    track("page_view", { path: pathname });
  }, [pathname]);

  return null;
}
