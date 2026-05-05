"use client";

import Image from "next/image";
import { useState } from "react";

export function MascotDisplay() {
  const [videoFailed, setVideoFailed] = useState(false);

  return (
    // overflow-hidden + object-cover kırpar beyaz boşlukları
    <div className="w-52 h-52 rounded-3xl overflow-hidden border-4 border-meme-yellow"
         style={{ boxShadow: "6px 6px 0 #000" }}>
      {!videoFailed ? (
        <video
          src="/mascot.mp4"
          autoPlay loop muted playsInline
          className="w-full h-full object-cover"
          onError={() => setVideoFailed(true)}
        />
      ) : (
        <Image
          src="/logo.png"
          alt="Flozy Mascot"
          width={208} height={208}
          className="w-full h-full object-cover"
        />
      )}
    </div>
  );
}
