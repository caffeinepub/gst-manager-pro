import { useEffect, useRef, useState } from "react";

export function usePullToRefresh(
  onRefresh: () => Promise<void> | void,
  threshold = 80,
) {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      if (el.scrollTop === 0) startY.current = e.touches[0].clientY;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (startY.current === 0) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta > 0 && el.scrollTop === 0) {
        setIsPulling(true);
        setPullDistance(Math.min(delta, threshold * 1.5));
      }
    };
    const onTouchEnd = async () => {
      if (pullDistance >= threshold) {
        setIsRefreshing(true);
        await onRefresh();
        setIsRefreshing(false);
      }
      setIsPulling(false);
      setPullDistance(0);
      startY.current = 0;
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    el.addEventListener("touchend", onTouchEnd);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [onRefresh, pullDistance, threshold]);

  return { containerRef, isPulling, pullDistance, isRefreshing };
}
