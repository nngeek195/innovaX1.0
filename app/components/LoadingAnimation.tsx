"use client";

import { useEffect } from "react";
import Lottie from "lottie-react";
import loadingAnimation from "../../public/animations/loading.json";

export default function LoadingAnimation() {
  useEffect(() => {
    const prevHtml = document.documentElement.style.overflow;
    const prevBody = document.body.style.overflow;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    return () => {
      document.documentElement.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-[#000000]">
      <Lottie
        animationData={loadingAnimation}
        loop={true}
        style={{ width: 400, height: 400 }}
      />
    </div>
  );
}