"use client";

import { useRef, useState, useCallback, useEffect } from "react";

interface PanZoomState {
  x: number;
  y: number;
  zoom: number;
}

export function useCanvasPanZoom() {
  const containerRef = useRef<HTMLDivElement>(null);
  const transformRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<PanZoomState>({ x: 0, y: 0, zoom: 1 });
  const dragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  const applyTransform = useCallback((s: PanZoomState) => {
    if (transformRef.current) {
      transformRef.current.style.transform = `translate(${s.x}px, ${s.y}px) scale(${s.zoom})`;
    }
  }, []);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    dragging.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };
  }, []);

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging.current) return;
      const dx = e.clientX - lastMouse.current.x;
      const dy = e.clientY - lastMouse.current.y;
      lastMouse.current = { x: e.clientX, y: e.clientY };
      setState((s) => {
        const next = { ...s, x: s.x + dx, y: s.y + dy };
        applyTransform(next);
        return next;
      });
    },
    [applyTransform]
  );

  const onMouseUp = useCallback(() => {
    dragging.current = false;
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setState((s) => {
        const newZoom = Math.min(3, Math.max(0.1, s.zoom * delta));
        const next = { ...s, zoom: newZoom };
        applyTransform(next);
        return next;
      });
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [applyTransform]);

  return {
    containerRef,
    transformRef,
    panZoom: state,
    handlers: { onMouseDown, onMouseMove, onMouseUp },
  };
}
