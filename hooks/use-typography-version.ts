"use client";

import { startTransition, useEffect, useState } from "react";

export function useTypographyVersion(fontDescriptor: string | string[]) {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (typeof document === "undefined" || !("fonts" in document)) {
      return;
    }

    let cancelled = false;
    const descriptors = Array.isArray(fontDescriptor)
      ? fontDescriptor
      : [fontDescriptor];

    if (descriptors.every((descriptor) => document.fonts.check(descriptor))) {
      return;
    }

    Promise.all([
      ...descriptors.map((descriptor) =>
        document.fonts.load(descriptor).catch(() => undefined),
      ),
      document.fonts.ready.catch(() => undefined),
    ]).then(() => {
      if (cancelled) {
        return;
      }

      startTransition(() => {
        setVersion((current) => current + 1);
      });
    });

    return () => {
      cancelled = true;
    };
  }, [fontDescriptor]);

  return version;
}
