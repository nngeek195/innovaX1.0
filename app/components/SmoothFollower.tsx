"use client";

import { useEffect, useRef, useState } from "react";

export default function SmoothFollower() {
  // Actual mouse position
  const mousePosition = useRef({ x: 0, y: 0 });

  // Smoothed positions
  const dotPosition = useRef({ x: 0, y: 0 });
  const borderDotPosition = useRef({ x: 0, y: 0 });

  // Animation frame reference
  const animationFrame = useRef<number | null>(null);

  // Rendered positions
  const [renderPos, setRenderPos] = useState({
    dot: { x: 0, y: 0 },
    border: { x: 0, y: 0 },
  });

  // Hover state
  const [isHovering, setIsHovering] = useState(false);

  // Smoothness
  const DOT_SMOOTHNESS = 0.2;
  const BORDER_DOT_SMOOTHNESS = 0.1;

  useEffect(() => {
    // ------------------------------------------
    // Mouse movement
    // ------------------------------------------
    const handleMouseMove = (e: MouseEvent) => {
      mousePosition.current = {
        x: e.clientX,
        y: e.clientY,
      };
    };

    // ------------------------------------------
    // Hover detection
    // ------------------------------------------
    const handleMouseEnter = () => {
      setIsHovering(true);
    };

    const handleMouseLeave = () => {
      setIsHovering(false);
    };

    window.addEventListener("mousemove", handleMouseMove);

    // Elements that trigger the larger cursor
    const interactiveElements = document.querySelectorAll(
      "a, button, img, input, textarea, select"
    );

    interactiveElements.forEach((element) => {
      element.addEventListener("mouseenter", handleMouseEnter);
      element.addEventListener("mouseleave", handleMouseLeave);
    });

    // ------------------------------------------
    // Linear interpolation
    // ------------------------------------------
    const lerp = (
      start: number,
      end: number,
      factor: number
    ) => {
      return start + (end - start) * factor;
    };

    // ------------------------------------------
    // Animation
    // ------------------------------------------
    const animate = () => {
      // Inner dot
      dotPosition.current.x = lerp(
        dotPosition.current.x,
        mousePosition.current.x,
        DOT_SMOOTHNESS
      );

      dotPosition.current.y = lerp(
        dotPosition.current.y,
        mousePosition.current.y,
        DOT_SMOOTHNESS
      );

      // Outer circle
      borderDotPosition.current.x = lerp(
        borderDotPosition.current.x,
        mousePosition.current.x,
        BORDER_DOT_SMOOTHNESS
      );

      borderDotPosition.current.y = lerp(
        borderDotPosition.current.y,
        mousePosition.current.y,
        BORDER_DOT_SMOOTHNESS
      );

      // Update state
      setRenderPos({
        dot: {
          x: dotPosition.current.x,
          y: dotPosition.current.y,
        },
        border: {
          x: borderDotPosition.current.x,
          y: borderDotPosition.current.y,
        },
      });

      // Continue animation
      animationFrame.current = requestAnimationFrame(animate);
    };

    // Start animation
    animationFrame.current = requestAnimationFrame(animate);

    // ------------------------------------------
    // Cleanup
    // ------------------------------------------
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);

      interactiveElements.forEach((element) => {
        element.removeEventListener(
          "mouseenter",
          handleMouseEnter
        );

        element.removeEventListener(
          "mouseleave",
          handleMouseLeave
        );
      });

      if (animationFrame.current !== null) {
        cancelAnimationFrame(animationFrame.current);
      }
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999]">
      
      {/* =========================================
          INNER DOT
      ========================================= */}
      <div
        className="absolute rounded-full bg-[#00E5FF]"
        style={{
          width: "8px",
          height: "8px",
          transform: "translate(-50%, -50%)",
          left: `${renderPos.dot.x}px`,
          top: `${renderPos.dot.y}px`,
        }}
      />

      {/* =========================================
          OUTER CIRCLE
      ========================================= */}
      <div
        className="absolute rounded-full border border-[#00E5FF]"
        style={{
          width: isHovering ? "60px" : "40px",
          height: isHovering ? "60px" : "40px",
          transform: "translate(-50%, -50%)",
          left: `${renderPos.border.x}px`,
          top: `${renderPos.border.y}px`,
          transition: "width 0.3s ease, height 0.3s ease",
        }}
      />

    </div>
  );
}