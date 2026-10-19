import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

type FitStageProps = {
  // Size of the scene as drawn in the Figma file; children are placed in these coordinates.
  width: number;
  height: number;
  className?: string;
  children: ReactNode;
};

// Scales a fixed-size scene down to the available width, keeping every position from the design.
export function FitStage({ width, height, className = "", children }: FitStageProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const observer = new ResizeObserver(([entry]) => {
      setScale(Math.min(1, entry.contentRect.width / width));
    });
    observer.observe(frame);
    return () => observer.disconnect();
  }, [width]);

  return (
    <div ref={frameRef} className={`relative w-full ${className}`} style={{ height: height * scale }}>
      <div
        className="absolute left-1/2 top-0 origin-top"
        style={{ width, height, transform: `translateX(-50%) scale(${scale})` }}
      >
        {children}
      </div>
    </div>
  );
}
