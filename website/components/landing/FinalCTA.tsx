"use client";

import Image from "next/image";
import Link from "next/link";
import RevealOnScroll from "@/components/RevealOnScroll";

const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.deanfieldz.yummy";

export default function FinalCTA() {
    return (
        <section id="download" className="py-24 bg-surface-900 border-t border-surface-700/60 relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/5 rounded-full blur-[180px]" />
            </div>
            <div className="relative max-w-4xl mx-auto px-6 text-center z-10">
                <RevealOnScroll>
                    <Image src="/icon.png" alt="Snap Recipes" width={80} height={80} className="rounded-[1.75rem] mx-auto mb-6 shadow-md" />
                    <h2 className="text-3xl md:text-5xl font-black text-surface-300 mb-4 tracking-tight leading-tight">
                        Ready to save<br /><span className="text-accent font-serif italic">your first recipe?</span>
                    </h2>
                    <p className="text-surface-500 text-base md:text-lg mb-8 max-w-xl mx-auto">
                        Join thousands of home cooks who never lose a recipe. Start saving on the web or download the app today.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
                        <Link href="/auth" className="w-full px-6 py-3.5 bg-accent hover:bg-accent-light text-white rounded-2xl font-bold text-sm transition-all hover:shadow-lg hover:shadow-accent/20 hover:-translate-y-0.5 text-center uppercase tracking-wider">
                            Try Web Version Free
                        </Link>
                        <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" className="group w-full flex items-center justify-center gap-3 px-6 py-2.5 bg-surface-950 text-surface-300 border border-surface-700/60 rounded-2xl font-semibold transition-all hover:-translate-y-0.5 shadow-sm">
                            <svg className="w-6 h-6 text-accent" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 010 1.73l-2.808 1.626L15.206 12l2.492-2.491zM5.864 2.658L16.802 8.99l-2.303 2.303-8.635-8.635z" />
                            </svg>
                            <div className="text-left">
                                <div className="text-[10px] opacity-60">GET IT ON</div>
                                <div className="text-sm font-black -mt-0.5 tracking-tight">Google Play</div>
                            </div>
                        </a>
                    </div>
                </RevealOnScroll>
            </div>
        </section>
    );
}
