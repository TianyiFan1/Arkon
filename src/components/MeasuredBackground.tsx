"use client";

import { CSSProperties, useEffect, useState } from "react";

const backgroundImage =
  "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260713_140344_79e1296a-86d7-43fd-9b5f-63ffe560f291.png&w=1280&q=85";
const overlayImage =
  "https://soft-zoom-63098134.figma.site/_assets/v11/3f10f1876e118f72a396e05a6c2d099569478272.png";
const revealVideo =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260713_162101_0d7498c5-29bb-47bf-a99f-2773c0a880a9.mp4";

export function MeasuredBackground() {
  const [spotlight, setSpotlight] = useState({ x: 50, y: 65, active: false });

  useEffect(() => {
    const trackPointer = (event: globalThis.PointerEvent) => {
      const x = (event.clientX / window.innerWidth) * 100;
      const y = (event.clientY / window.innerHeight) * 100;
      // The reveal follows the pointer across the whole interactive page.
      // A vertical threshold made it disappear over the first-step choices.
      setSpotlight({ x, y, active: true });
    };
    const clearSpotlight = () =>
      setSpotlight((current) => ({ ...current, active: false }));

    window.addEventListener("pointermove", trackPointer, { passive: true });
    window.addEventListener("blur", clearSpotlight);
    return () => {
      window.removeEventListener("pointermove", trackPointer);
      window.removeEventListener("blur", clearSpotlight);
    };
  }, []);

  const spotlightStyle = {
    "--spotlight-x": `${spotlight.x}%`,
    "--spotlight-y": `${spotlight.y}%`,
  } as CSSProperties;

  return (
    <div
      className="measured-background"
      data-testid="measured-background"
      aria-hidden="true"
    >
      <div className="measured-grid" />
      <div
        className="measured-image"
        style={{ backgroundImage: `url("${backgroundImage}")` }}
      />
      <div
        className="measured-haze"
        style={{ backgroundImage: `url("${overlayImage}")` }}
      />
      {spotlight.active && (
        <div
          className="measured-reveal"
          data-testid="measured-reveal"
          style={spotlightStyle}
        >
          <video autoPlay loop muted playsInline preload="metadata">
            <source src={revealVideo} type="video/mp4" />
          </video>
        </div>
      )}
    </div>
  );
}
