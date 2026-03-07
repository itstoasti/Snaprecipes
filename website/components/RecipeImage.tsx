"use client";

import { useState } from "react";
import Image from "next/image";

export default function RecipeImage({ src, alt }: { src: string; alt: string }) {
    const [failed, setFailed] = useState(false);

    if (failed || !src) {
        return (
            <div className="w-full h-full bg-[#12121a]">
                <Image
                    src="/recipe-placeholder.png"
                    alt={`${alt} (Image unavailable) — but trust us, this recipe is delicious!`}
                    fill
                    className="object-contain"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
            </div>
        );
    }

    return (
        <Image
            src={src}
            alt={alt}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            onError={() => setFailed(true)}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            unoptimized
        />
    );
}
