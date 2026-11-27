"use client";

import { useEffect, useRef, useState } from "react";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { cn } from "../../lib/utils";

const formatValue = (val: number, precision: number, sep: string): string => {
  const fixed = val.toFixed(precision);
  if (!sep) return fixed;
  const [intPart, decPart] = fixed.split(".");
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
  return decPart !== undefined ? `${formattedInt}.${decPart}` : formattedInt;
};

export interface CountUpProps {
  value: number | null;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  easing?: "linear" | "easeIn" | "easeOut" | "easeInOut";
  separator?: string;
  interactive?: boolean;
  triggerOnView?: boolean;
  className?: string;
  numberClassName?: string;
  animationStyle?: "default" | "bounce" | "spring" | "gentle" | "energetic";
  colorScheme?: "default" | "gradient" | "primary" | "secondary" | "custom";
  customColor?: string;
  onAnimationComplete?: () => void;
  /** Optional ID to receive live updates via `airdelta:countup` CustomEvent */
  syncId?: string;
  /** Fallback text shown when a live update sets value to null/undefined */
  fallbackText?: string;
}

export interface CountUpUpdateDetail {
  id: string;
  value: number | null | undefined;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
  fallbackText?: string;
}

const easingFunctions = {
  linear: [0, 0, 1, 1] as const,
  easeIn: [0.42, 0, 1, 1] as const,
  easeOut: [0, 0, 0.58, 1] as const,
  easeInOut: [0.42, 0, 0.58, 1] as const,
};

const animationStyles = {
  default: { type: "tween" },
  bounce: { type: "spring", bounce: 0.25 },
  spring: { type: "spring", stiffness: 100, damping: 10 },
  gentle: { type: "spring", stiffness: 60, damping: 15 },
  energetic: { type: "spring", stiffness: 300, damping: 20 },
};

const colorSchemes = {
  default: "text-inherit",
  gradient: "bg-clip-text text-transparent bg-gradient-to-r from-[#ea580c] to-[#c2410c]",
  primary: "text-[#ea580c]",
  secondary: "text-[#171717]",
  custom: "",
};

export function CountUp({
  value,
  duration = 1.1,
  decimals = 0,
  prefix = "",
  suffix = "",
  easing = "easeOut",
  separator = ",",
  interactive = false,
  triggerOnView = true,
  className,
  numberClassName,
  animationStyle = "default",
  colorScheme = "default",
  customColor,
  onAnimationComplete,
  syncId,
  fallbackText = "--",
}: CountUpProps) {
  const [liveState, setLiveState] = useState<{
    value: number | null;
    prefix: string;
    suffix: string;
    decimals: number;
    duration: number;
    fallbackText: string;
  }>({
    value,
    prefix,
    suffix,
    decimals,
    duration,
    fallbackText,
  });

  useEffect(() => {
    setLiveState((prev) => ({
      ...prev,
      value,
      prefix,
      suffix,
      decimals,
      duration,
      fallbackText,
    }));
  }, [value, prefix, suffix, decimals, duration, fallbackText]);

  useEffect(() => {
    if (!syncId) return;
    const applyUpdate = (detail: CountUpUpdateDetail | undefined) => {
      if (!detail || detail.id !== syncId) return;
      setLiveState((prev) => ({
        value: detail.value === undefined ? prev.value : detail.value,
        prefix: detail.prefix ?? prev.prefix,
        suffix: detail.suffix ?? prev.suffix,
        decimals: detail.decimals ?? prev.decimals,
        duration: detail.duration ?? Math.min(prev.duration, 0.55),
        fallbackText: detail.fallbackText ?? prev.fallbackText,
      }));
    };

    const handler = (event: Event) => {
      applyUpdate((event as CustomEvent<CountUpUpdateDetail>).detail);
    };

    window.addEventListener("airdelta:countup", handler);

    const w = window as unknown as {
      __airdeltaCountUpBuffer?: Record<string, CountUpUpdateDetail>;
    };
    const buffered = w.__airdeltaCountUpBuffer?.[syncId];
    if (buffered) {
      applyUpdate(buffered);
    }

    return () => window.removeEventListener("airdelta:countup", handler);
  }, [syncId]);

  const [hasAnimated, setHasAnimated] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) =>
    formatValue(latest, liveState.decimals, separator)
  );

  useEffect(() => {
    if (liveState.value === null || !Number.isFinite(liveState.value)) return;
    const target = liveState.value;

    // Respect reduced motion preference: jump cleanly to final state
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      count.set(target);
      setHasAnimated(true);
      onAnimationComplete?.();
      return;
    }

    let controls: { stop: () => void } | null = null;

    const startAnimation = () => {
      controls = animate(count.get(), target, {
        ...(animationStyles[animationStyle] as any),
        ease: easingFunctions[easing],
        duration: animationStyle === "default" ? liveState.duration : undefined,
        onUpdate: (latest) => count.set(latest),
        onComplete: () => {
          setHasAnimated(true);
          onAnimationComplete?.();
        },
      });
    };

    if (!triggerOnView || hasAnimated) {
      startAnimation();
      return () => controls?.stop();
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          startAnimation();
        }
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      controls?.stop();
      observer.disconnect();
    };
  }, [
    liveState.value,
    liveState.duration,
    easing,
    animationStyle,
    triggerOnView,
    hasAnimated,
    onAnimationComplete,
    count,
  ]);

  const hasCustomTextColor =
    className?.includes("text-") || numberClassName?.includes("text-");
  const colorClass =
    colorScheme === "custom" && customColor
      ? ""
      : colorScheme !== "default"
      ? colorSchemes[colorScheme]
      : hasCustomTextColor
      ? ""
      : colorSchemes.default;

  const hoverProps = interactive
    ? {
        whileHover: {
          scale: 1.05,
          filter: "brightness(1.08)",
          transition: { duration: 0.2 },
        },
        whileTap: {
          scale: 0.96,
          filter: "brightness(0.95)",
          transition: { duration: 0.1 },
        },
      }
    : {};

  const isValidNumber =
    liveState.value !== null && Number.isFinite(liveState.value);
  const targetText = isValidNumber
    ? `${liveState.prefix}${formatValue(liveState.value as number, liveState.decimals, separator)}${liveState.suffix}`
    : liveState.fallbackText;

  return (
    <span
      ref={containerRef}
      data-countup-id={syncId}
      data-target-text={targetText}
      className={cn(
        "inline-flex items-baseline tabular-nums",
        className
      )}
    >
      <motion.span
        {...hoverProps}
        className={cn("inline-flex items-baseline transition-colors", colorClass, numberClassName)}
        style={
          colorScheme === "custom" && customColor
            ? { color: customColor }
            : undefined
        }
      >
        {isValidNumber ? (
          <>
            {liveState.prefix && <span>{liveState.prefix}</span>}
            <motion.span>{rounded}</motion.span>
            {liveState.suffix && <span>{liveState.suffix}</span>}
          </>
        ) : (
          <span>{liveState.fallbackText}</span>
        )}
      </motion.span>
    </span>
  );
}

export default CountUp;
