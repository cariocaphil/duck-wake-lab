import { useEffect, useState } from "react";

function getPrefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Subscribe to the prefers-reduced-motion media query. */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(getPrefersReducedMotion);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => {
      setReduced(mq.matches);
    };
    onChange();
    mq.addEventListener("change", onChange);
    return () => {
      mq.removeEventListener("change", onChange);
    };
  }, []);

  return reduced;
}
