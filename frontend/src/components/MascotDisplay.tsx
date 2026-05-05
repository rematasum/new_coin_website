"use client";

import Image from "next/image";
import { useState } from "react";

export function MascotDisplay() {
  const [videoFailed, setVideoFailed] = useState(false);

  return (
    <div className="mascot-float relative w-52 h-52 flex items-center justify-center">
      {!videoFailed ? (
        <video
          src="/mascot.mp4"
          autoPlay loop muted playsInline
          className="w-52 h-52 object-contain"
          onError={() => setVideoFailed(true)}
        />
      ) : (
        <Image
          src="/logo.png"
          alt="Flozy Mascot"
          width={210} height={210}
          className="object-contain"
          style={{ filter: "drop-shadow(0 20px 40px rgba(79,185,232,0.5))" }}
        />
      )}
    </div>
  );
}
