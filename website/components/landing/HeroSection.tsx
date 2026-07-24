"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import RevealOnScroll from "@/components/RevealOnScroll";

const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.deanfieldz.yummy";

export default function HeroSection() {
    const router = useRouter();
    const [url, setUrl] = useState("");
    const [error, setError] = useState("");

    const handleExtractSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        const trimmedUrl = url.trim();
        if (!trimmedUrl) {
            setError("Please enter a recipe URL");
            return;
        }

        // Basic URL validation
        try {
            new URL(trimmedUrl);
        } catch (_) {
            setError("Please enter a valid URL (including http/https)");
            return;
        }

        // Navigate to preview page with the URL parameter
        router.push(`/recipes/preview?url=${encodeURIComponent(trimmedUrl)}`);
    };

    return (
        <section className="relative min-h-screen flex items-center overflow-hidden pt-28 pb-16 bg-surface-950">
            {/* Background floating ingredients & blobs */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
                {/* Floating Illustrations - Hidden on mobile/tablet, spread out in margins on desktop */}
                <img
                    src="/images/parsley.jpg"
                    alt=""
                    className="absolute top-[8%] left-[2%] w-24 h-24 md:w-36 md:h-36 object-contain animate-float opacity-35 select-none mix-blend-multiply rounded-full hidden lg:block"
                />
                <img
                    src="/images/olive_oil.jpg"
                    alt=""
                    className="absolute top-[48%] left-[38%] w-24 h-24 md:w-36 md:h-36 object-contain animate-float opacity-35 select-none delay-500 mix-blend-multiply rounded-full hidden lg:block"
                />
                <img
                    src="/images/onion.jpg"
                    alt=""
                    className="absolute top-[6%] right-[2%] w-24 h-24 md:w-36 md:h-36 object-contain animate-float opacity-35 select-none delay-1000 mix-blend-multiply rounded-full hidden lg:block"
                />
                <img
                    src="/images/cheese.jpg"
                    alt=""
                    className="absolute top-[5%] right-[30%] w-24 h-24 md:w-36 md:h-36 object-contain animate-float opacity-35 select-none delay-700 mix-blend-multiply rounded-full hidden lg:block"
                />

                {/* Soft glow blobs */}
                <div className="absolute top-1/4 left-0 w-80 h-80 bg-accent/5 rounded-full blur-[100px]" />
                <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-accent/5 rounded-full blur-[120px]" />
            </div>

            <div className="relative max-w-7xl mx-auto px-6 w-full z-10">
                <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
                    {/* Left text column */}
                    <div className="text-center lg:text-left">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-900 border border-surface-700/80 text-xs font-bold text-accent mb-8 animate-[fadeIn_0.6s_ease-out_0.2s_forwards] opacity-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                            WEB VERSION NOW AVAILABLE
                        </div>

                        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black leading-[1.1] text-surface-300 mb-6 tracking-tight animate-[slideUp_0.6s_ease-out_0.3s_forwards] opacity-0">
                            Save Any Recipe
                            <span className="text-accent block mt-1">Instantly</span>
                        </h1>

                        <p className="text-base sm:text-lg text-surface-500 mb-8 max-w-lg mx-auto lg:mx-0 leading-relaxed animate-[slideUp_0.6s_ease-out_0.4s_forwards] opacity-0">
                            Snap a photo, paste a link, or share from any app. We extract the recipe and ditch the 10-page life stories. Just clean, beautiful recipes.
                        </p>

                        {/* Frictionless Web Extraction Bar */}
                        <div className="mb-8 max-w-xl mx-auto lg:mx-0 animate-[slideUp_0.6s_ease-out_0.5s_forwards] opacity-0">
                            <form onSubmit={handleExtractSubmit} className="relative flex flex-col sm:flex-row gap-2 p-1.5 bg-surface-900 border border-surface-700/60 rounded-3xl shadow-md">
                                <input
                                    type="text"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    placeholder="Paste a recipe URL to extract..."
                                    className="flex-1 px-5 py-3.5 bg-transparent text-surface-300 font-sans text-sm outline-none placeholder:text-surface-500 rounded-2xl"
                                />
                                <button
                                    type="submit"
                                    className="px-6 py-3.5 bg-accent hover:bg-accent-light text-white font-bold text-sm rounded-2xl transition-all hover:shadow-lg hover:shadow-accent/25 active:scale-[0.98] cursor-pointer"
                                >
                                    Extract Free
                                </button>
                            </form>
                            {error && (
                                <p className="text-red-500 text-xs text-left mt-2 ml-4 font-semibold">{error}</p>
                            )}
                        </div>

                        {/* Store links badges */}
                        <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 mt-12 animate-[fadeIn_0.6s_ease-out_0.45s_forwards] opacity-0">
                            <a
                                href={PLAY_STORE_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="transition-transform active:scale-95 cursor-pointer"
                            >
                                <img
                                    src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png"
                                    alt="Get it on Google Play"
                                    className="h-14 md:h-16 object-contain"
                                />
                            </a>
                            <button
                                onClick={() => router.push("/auth")}
                                className="px-7 py-3.5 bg-surface-900 hover:bg-[#F3EFE4] text-surface-300 font-extrabold rounded-2xl border border-surface-700/80 hover:border-surface-600 transition-all shadow-sm text-xs uppercase tracking-wider cursor-pointer"
                            >
                                Sign In to Web App
                            </button>
                        </div>
                    </div>

                    {/* Right Mockup column */}
                    <div className="relative flex justify-center lg:justify-end animate-[scaleIn_0.8s_ease-out_0.4s_forwards] opacity-0 lg:pr-12">
                        {/* Scattered Recipe Cards (left of the phone) */}
                        <div className="absolute left-[-100px] top-[10%] w-44 hidden xl:block z-10 space-y-5 pointer-events-none">
                            {/* Card 1 */}
                            <div className="bg-surface-900 border border-surface-700/60 p-3 rounded-2xl shadow-xl -rotate-6 transform hover:rotate-0 transition-transform duration-300">
                                <div className="h-20 rounded-lg bg-surface-950 overflow-hidden mb-1.5">
                                    <img src="https://images.unsplash.com/photo-1484723091739-30a097e8f929?auto=format&fit=crop&q=80&w=200" alt="French Toast" className="w-full h-full object-cover" />
                                </div>
                                <h4 className="font-bold text-[10px] text-surface-300 truncate">French Toast</h4>
                                <p className="text-[8px] text-surface-500">15 min • Easy</p>
                            </div>

                            {/* Card 2 */}
                            <div className="bg-surface-900 border border-surface-700/60 p-3 rounded-2xl shadow-xl rotate-3 transform hover:rotate-0 transition-transform duration-300 translate-x-6">
                                <div className="h-20 rounded-lg bg-surface-950 overflow-hidden mb-1.5">
                                    <img src="https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&q=80&w=200" alt="Pesto Pasta" className="w-full h-full object-cover" />
                                </div>
                                <h4 className="font-bold text-[10px] text-surface-300 truncate">Pesto Pasta</h4>
                                <p className="text-[8px] text-accent font-bold">20 min • Popular</p>
                            </div>

                            {/* Card 3 */}
                            <div className="bg-surface-900 border border-surface-700/60 p-3 rounded-2xl shadow-xl -rotate-3 transform hover:rotate-0 transition-transform duration-300 -translate-x-2">
                                <div className="h-20 rounded-lg bg-surface-950 overflow-hidden mb-1.5">
                                    <img src="https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&q=80&w=200" alt="Salmon Bowl" className="w-full h-full object-cover" />
                                </div>
                                <h4 className="font-bold text-[10px] text-surface-300 truncate">Salmon Bowl</h4>
                                <p className="text-[8px] text-surface-500">25 min • Healthy</p>
                            </div>
                        </div>

                        {/* Floating Testimonial/Review Card (right of the phone) */}
                        <div className="absolute right-[-80px] bottom-[15%] w-48 hidden xl:block z-10 pointer-events-none">
                            <div className="bg-surface-900 border border-surface-700/60 p-3.5 rounded-2xl shadow-xl rotate-6 transform hover:rotate-0 transition-transform duration-300">
                                <div className="flex items-center gap-0.5 mb-1.5 text-amber-400">
                                    {[...Array(5)].map((_, i) => (
                                        <svg key={i} className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                        </svg>
                                    ))}
                                </div>
                                <p className="text-[9px] text-surface-450 leading-relaxed italic mb-1.5">
                                    "No ads, no blogs, just clean cooking. Absolute game changer!"
                                </p>
                                <p className="text-[8px] font-bold text-surface-300 text-right">— Sarah J.</p>
                            </div>
                        </div>

                        {/* Phone container */}
                        <div className="relative w-full max-w-[290px] rounded-[3rem] bg-[#0d0d0d] p-3 shadow-2xl border border-neutral-800 z-20">
                            {/* Speaker & camera notch area */}
                            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-32 h-5 bg-[#0d0d0d] rounded-full z-20 flex items-center justify-center pointer-events-none">
                                <div className="w-12 h-0.5 bg-neutral-800/60 rounded-full" />
                            </div>
                            <div className="rounded-[2.2rem] overflow-hidden relative bg-black border border-black/10" style={{ aspectRatio: "9 / 19.5" }}>
                                <video
                                    src="/videos/recipe_header_video.mp4"
                                    autoPlay
                                    loop
                                    muted
                                    playsInline
                                    className="w-full h-full object-contain bg-black"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
