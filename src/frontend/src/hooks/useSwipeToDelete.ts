import { useRef, useState } from "react";

export function useSwipeToDelete(onDelete: () => void, threshold = 80) {
  const [swipeX, setSwipeX] = useState(0);
  const startX = useRef(0);
  const isDragging = useRef(false);

  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    isDragging.current = true;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    const delta = e.touches[0].clientX - startX.current;
    if (delta < 0) setSwipeX(Math.max(delta, -threshold * 1.5));
  };
  const onTouchEnd = () => {
    if (swipeX < -threshold) {
      onDelete();
    }
    setSwipeX(0);
    isDragging.current = false;
  };

  return { swipeX, onTouchStart, onTouchMove, onTouchEnd };
}
