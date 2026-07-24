"use client";

import RevealOnScroll from "@/components/RevealOnScroll";

export default function PressBadges() {
    return (
        <section className="py-10 bg-surface-900 border-y border-surface-700/60 relative z-10">
            <div className="max-w-7xl mx-auto px-6 text-center">
                <RevealOnScroll>
                    <p className="text-[10px] font-bold text-surface-500 uppercase tracking-widest mb-6">
                        As featured on
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-10 md:gap-16 opacity-40 grayscale hover:opacity-60 transition-opacity">
                        <span className="text-xl md:text-2xl font-black text-surface-400 tracking-tighter">
                            DREW
                        </span>
                        <span className="text-xl md:text-2xl font-black text-surface-400 tracking-wider">
                            CBS
                        </span>
                        <span className="text-xl md:text-2xl font-black text-surface-400">
                            FoodNetwork
                        </span>
                        <span className="text-xl md:text-2xl font-bold text-surface-400 font-serif italic">
                            Bon Appétit
                        </span>
                        <span className="text-xl md:text-2xl font-black text-surface-400 tracking-tight">
                            TechCrunch
                        </span>
                    </div>
                </RevealOnScroll>
            </div>
        </section>
    );
}
