import { useEffect, useState } from "react";
import { Wave, type WaveOrigin } from "loading-dev";

export interface AirWaveLoaderProps {
  id: string;
  size?: number;
  color?: string;
  duration?: number;
  playState?: "running" | "paused";
  origin?: WaveOrigin;
  className?: string;
}

/**
 * Interactive Astro React island wrapping loading-dev's <Wave> loader so
 * Astro vanilla scripts can live-update size, color, speed, origin, and playState.
 */
export default function AirWaveLoader({
  id,
  size = 24,
  color = "#ea580c",
  duration = 1200,
  playState = "running",
  origin = "bottom",
  className = ""
}: AirWaveLoaderProps) {
  const [state, setState] = useState({
    size,
    color,
    duration,
    playState,
    origin,
    className
  });

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<Partial<AirWaveLoaderProps>>).detail;
      if (!detail || detail.id !== id) return;
      setState((prev) => ({
        size: detail.size ?? prev.size,
        color: detail.color ?? prev.color,
        duration: detail.duration ?? prev.duration,
        playState: detail.playState ?? prev.playState,
        origin: detail.origin ?? prev.origin,
        className: detail.className ?? prev.className
      }));
    };

    window.addEventListener("airdelta:wave-update", handler);
    return () => window.removeEventListener("airdelta:wave-update", handler);
  }, [id]);

  return (
    <span className="inline-flex items-center justify-center shrink-0" data-wave-id={id}>
      <Wave
        size={state.size}
        color={state.color}
        duration={state.duration}
        playState={state.playState}
        origin={state.origin}
        className={state.className}
      />
    </span>
  );
}
