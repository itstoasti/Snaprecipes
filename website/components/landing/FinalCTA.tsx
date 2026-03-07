"use client";

import Image from "next/image";
import RevealOnScroll from "@/components/RevealOnScroll";

const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.deanfieldz.yummy";

export default function FinalCTA() {
    return (
        <section id="download" className="py-32 relative overflow-hidden">
            <div className="absolute inset-0">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-accent/15 rounded-full blur-[200px]" />
            </div>
            <div className="relative max-w-4xl mx-auto px-6 text-center">
                <RevealOnScroll>
                    <Image src="/icon.png" alt="Snap Recipes" width={96} height={96} className="rounded-3xl mx-auto mb-8 shadow-2xl animate-glow" />
                    <h2 className="text-4xl md:text-6xl font-bold mb-6">
                        Ready to save<br /><span className="gradient-text">your first recipe?</span>
                    </h2>
                    <p className="text-surface-400 text-xl mb-10 max-w-2xl mx-auto">Join thousands of home cooks who never lose a recipe. Download free today.</p>
                    <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" className="group inline-flex items-center gap-4 px-8 py-4 bg-white text-black rounded-2xl font-semibold transition-all hover:shadow-xl hover:-translate-y-1">
                        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 010 1.73l-2.808 1.626L15.206 12l2.492-2.491zM5.864 2.658L16.802 8.99l-2.303 2.303-8.635-8.635z" />
                        </svg>
                        <div className="text-left">
                            <div className="text-xs opacity-70">Get it on</div>
                            <div className="text-lg font-bold -mt-1">Google Play</div>
                        </div>
                    </a>
                    <p className="text-surface-500 text-sm mt-6">iOS and web coming soon</p>
                </RevealOnScroll>
            </div>
        </section>
    );
}
