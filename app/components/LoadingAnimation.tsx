"use client";

import Lottie from "lottie-react";
import loadingAnimation from "../../public/animations/loading.json";
import loadingAnimation2 from "../../public/animations/loading2.json";

export default function LoadingAnimation() {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black">
      <div className="w-[300px] h-[300px] md:w-[500px] md:h-[500px]">
        <Lottie
          animationData={loadingAnimation}
          loop
          style={{ width: "100%", height: "100%" }}
        />
      </div>

      <div className="w-[300px] h-[300px] -mt-30">
        <Lottie
          animationData={loadingAnimation2}
          loop
          style={{ width: "100%", height: "100%" }}
        />
      </div>
    </div>
  );
}