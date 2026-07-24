"use client";

import { useState, useEffect, useRef, useCallback, type CSSProperties } from "react";
import RevealOnScroll from "@/components/RevealOnScroll";

const RECIPE_IMG =
    "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?auto=format&fit=crop&q=80&w=500";

const LOADER_STEPS = [
    "Analyzing source URL...",
    "Reading recipe structure...",
    "Extracting ingredients...",
    "Formatting instructions...",
    "Adding some magic...",
    "Sprinkling a pinch of salt...",
    "Simmering gently...",
    "Perfecting the details...",
];

const INGREDIENTS = [
    { qty: "250", unit: "g", name: "Rigatoni" },
    { qty: "2", unit: "", name: "Chicken breasts" },
    { qty: "1/2", unit: "cup", name: "Heavy cream" },
    { qty: "3", unit: "cloves", name: "Garlic" },
];

const COOK_TASKS = [
    { id: "ing", label: "Prepare ingredients", kind: "prep" as const },
    { id: "s1", label: "Step 1: Boil the rigatoni", kind: "step" as const },
    { id: "s2", label: "Step 2: Sauté garlic & simmer cream", kind: "step" as const, expanded: true },
    { id: "s3", label: "Step 3: Toss pasta & finish", kind: "step" as const },
];

function Icon({ d, className = "", stroke = 1.8, style }: { d: string; className?: string; stroke?: number; style?: CSSProperties }) {
    return (
        <svg className={className} style={style} fill="none" stroke="currentColor" strokeWidth={stroke} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d={d} />
        </svg>
    );
}

const ICONS = {
    clock: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
    flame:
        "M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z",
    users:
        "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
    link: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1",
    camera:
        "M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z M15 13a3 3 0 11-6 0 3 3 0 016 0z",
    play: "M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    close: "M6 18L18 6M6 6l12 12",
    back: "M15 19l-7-7 7-7",
    ellipsis: "M5 12h.01M12 12h.01M19 12h.01",
    chevron: "M9 5l7 7-7 7",
    check: "M5 13l4 4L19 7",
    spark:
        "M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 110-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM14 1a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0V7h-3a1 1 0 110-2h3V2a1 1 0 011-1z",
};

function PhoneImage() {
    const [err, setErr] = useState(false);
    return (
        <div className="absolute inset-0 bg-gradient-to-br from-[#2a1a12] to-[#0F0F18] flex items-center justify-center">
            <span className="text-4xl opacity-80">🍝</span>
            {!err && (
                <img
                    src={RECIPE_IMG}
                    alt=""
                    onError={() => setErr(true)}
                    className="absolute inset-0 w-full h-full object-cover"
                />
            )}
        </div>
    );
}

export default function HowItWorks() {
    const [activeTab, setActiveTab] = useState<0 | 1 | 2>(0);
    const [isAutoPlaying, setIsAutoPlaying] = useState(true);

    const [captureSource, setCaptureSource] = useState<"url" | "camera" | "video">("url");

    const [extractPhase, setExtractPhase] = useState<"extracting" | "done">("extracting");
    const [loaderIdx, setLoaderIdx] = useState(0);

    const [cookDone, setCookDone] = useState<string[]>(["ing", "s1"]);

    const activeTabRef = useRef<0 | 1 | 2>(0);
    const extractTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const startExtract = useCallback(() => {
        setExtractPhase("extracting");
        setLoaderIdx(0);
        if (extractTimer.current) clearTimeout(extractTimer.current);
        extractTimer.current = setTimeout(() => setExtractPhase("done"), 3400);
    }, []);

    const selectTab = useCallback(
        (i: 0 | 1 | 2, auto = false) => {
            activeTabRef.current = i;
            setActiveTab(i);
            if (!auto) setIsAutoPlaying(false);
            if (i === 1) startExtract();
            else if (extractTimer.current) {
                clearTimeout(extractTimer.current);
                extractTimer.current = null;
            }
        },
        [startExtract]
    );

    useEffect(() => {
        if (!isAutoPlaying) return;
        const interval = setInterval(() => {
            selectTab(((activeTabRef.current + 1) % 3) as 0 | 1 | 2, true);
        }, 7000);
        return () => clearInterval(interval);
    }, [isAutoPlaying, selectTab]);

    useEffect(() => {
        if (!(activeTab === 1 && extractPhase === "extracting")) return;
        const id = setInterval(() => setLoaderIdx((i) => (i + 1) % LOADER_STEPS.length), 650);
        return () => clearInterval(id);
    }, [activeTab, extractPhase]);

    const toggleCook = (id: string) =>
        setCookDone((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

    const steps = [
        {
            num: "01",
            title: "Capture",
            desc: "Paste a link, snap a cookbook page, or hit Share on a TikTok, Reel, or YouTube video — it lands in Snap instantly, with zero copy-pasting.",
            badge: "Multi-Source Import",
        },
        {
            num: "02",
            title: "Extract",
            desc: "Our AI strips the ads, pop-ups, and 2,000-word life story — then hands back a clean recipe with ingredients, steps, cook times, and per-serving macros.",
            badge: "AI Parser Engine",
        },
        {
            num: "03",
            title: "Cook",
            desc: "Every save lives in your cloud cookbook and syncs across phone and web. Open Cook Mode for a hands-free, screen-on, step-by-step walkthrough you can tick off as you go.",
            badge: "Distraction-Free Mode",
        },
    ];

    const cookProgress = cookDone.length;
    const cookTotal = COOK_TASKS.length;

    return (
        <section
            id="how-it-works"
            className="pt-24 pb-16 bg-surface-950 border-t border-surface-700/60 relative overflow-hidden select-none"
            onMouseEnter={() => setIsAutoPlaying(false)}
            onMouseLeave={() => setIsAutoPlaying(true)}
        >
            <div className="absolute top-1/4 left-1/4 w-[460px] h-[460px] bg-accent/5 rounded-full blur-[150px] pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-[420px] h-[420px] bg-accent/[0.04] rounded-full blur-[150px] pointer-events-none" />

            <div className="max-w-7xl mx-auto px-6 relative z-10">
                <RevealOnScroll>
                    <div className="text-center mb-14 max-w-3xl mx-auto">
                        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-surface-900 border border-surface-750 text-xs font-bold text-accent mb-4 shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                            <span className="uppercase tracking-widest text-[10px]">Process</span>
                        </div>
                        <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-surface-300 tracking-tight leading-tight mb-4">
                            Three simple <span className="gradient-text">steps</span>
                        </h2>
                        <p className="text-surface-500 text-base md:text-lg font-normal leading-relaxed max-w-xl mx-auto">
                            From recipe discovery to dinner on the table in seconds.
                        </p>
                    </div>
                </RevealOnScroll>

                <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
                    <RevealOnScroll delay="0.1s" className="order-2 lg:order-1">
                        <div className="flex flex-col gap-3">
                            {steps.map((step, idx) => {
                                const isActive = activeTab === idx;
                                return (
                                    <button
                                        key={step.num}
                                        onClick={() => selectTab(idx as 0 | 1 | 2)}
                                        className={`p-4 rounded-2xl text-left transition-all duration-300 relative overflow-hidden border cursor-pointer hover:-translate-y-0.5 ${
                                            isActive
                                                ? "bg-surface-900 border-accent/60 shadow-xl shadow-accent/10 ring-1 ring-accent/30"
                                                : "bg-surface-900/50 border-surface-750 hover:bg-surface-900 hover:border-surface-700 opacity-75 hover:opacity-100"
                                        }`}
                                    >
                                        {isActive && (
                                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent via-accent-light to-amber-500" />
                                        )}
                                        <div className="flex items-center justify-between mb-1.5">
                                            <div className="flex items-center gap-3">
                                                <span
                                                    className={`w-8 h-8 rounded-xl text-sm font-black flex items-center justify-center transition-all ${
                                                        isActive
                                                            ? "bg-accent text-white shadow-sm"
                                                            : "bg-surface-850 text-surface-450 border border-surface-750"
                                                    }`}
                                                >
                                                    {step.num}
                                                </span>
                                                <span className="text-lg font-bold text-surface-300">{step.title}</span>
                                            </div>
                                            {isActive && (
                                                <span className="text-[9px] font-bold text-accent uppercase tracking-wider bg-accent/10 px-2 py-0.5 rounded border border-accent/20">
                                                    Active
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-surface-500 text-sm leading-snug pl-11">{step.desc}</p>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="mt-5 rounded-2xl border border-surface-700/70 bg-surface-900 p-5 shadow-xl shadow-black/[0.03]">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-accent">
                                    {steps[activeTab].badge}
                                </span>
                            </div>

                            <div key={activeTab} className="animate-fadeIn">
                                {activeTab === 0 && (
                                    <div>
                                        <p className="text-[13px] text-surface-400 leading-relaxed mb-3">
                                            Three ways in: paste a URL, photograph a page, or use your phone&apos;s share sheet to send a recipe from TikTok, Instagram, YouTube, or any app.
                                        </p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {["NYT Cooking", "Allrecipes", "Food Network", "TikTok", "Instagram", "YouTube", "1,000+ blogs"].map((s) => (
                                                <span
                                                    key={s}
                                                    className="px-2 py-1 rounded-md bg-surface-850 border border-surface-700 text-[10px] font-semibold text-surface-400"
                                                >
                                                    {s}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {activeTab === 1 && (
                                    <div>
                                        <p className="text-[13px] text-surface-400 leading-relaxed mb-3">We keep the recipe and drop everything else.</p>
                                        <ul className="space-y-1 mb-3">
                                            {["14 banner ads", "2,200-word life story", "Auto-play video walls", "Newsletter pop-ups"].map((x) => (
                                                <li key={x} className="text-[12px] text-surface-500 line-through decoration-red-400/70">
                                                    {x}
                                                </li>
                                            ))}
                                        </ul>
                                        <div className="flex items-center justify-between rounded-xl bg-surface-850 border border-surface-700 px-3 py-2">
                                            <span className="text-[10px] uppercase tracking-wider text-surface-500 font-bold">Web page → Recipe</span>
                                            <span className="text-[11px] font-bold text-surface-300">4,800 → 142 words</span>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5 mt-3">
                                            {["Prep & cook time", "Servings", "Ingredients", "Steps", "Macros"].map((f) => (
                                                <span
                                                    key={f}
                                                    className="px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-semibold text-emerald-600"
                                                >
                                                    {f}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {activeTab === 2 && (
                                    <div>
                                        <p className="text-[13px] text-surface-400 leading-relaxed mb-3">
                                            One step at a time, screen always on. Tap a step on the phone to tick it off.
                                        </p>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="text-[10px] uppercase tracking-wider text-surface-500 font-bold">Your progress</span>
                                            <span className="text-sm font-black text-surface-300">
                                                {cookProgress}
                                                <span className="text-surface-500 text-xs font-bold">/{cookTotal}</span>
                                            </span>
                                        </div>
                                        <div className="h-1.5 rounded-full bg-surface-800 overflow-hidden mb-3">
                                            <div
                                                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                                                style={{ width: `${(cookProgress / cookTotal) * 100}%` }}
                                            />
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            {["Screen on", "Tap to tick", "Scales up"].map((t) => (
                                                <span
                                                    key={t}
                                                    className="text-center rounded-lg bg-surface-850 border border-surface-700 py-2 text-[10px] font-semibold text-surface-400"
                                                >
                                                    {t}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </RevealOnScroll>

                    <RevealOnScroll delay="0.2s" className="order-1 lg:order-2">
                        <div className="relative flex justify-center items-center min-h-0 py-0">
                            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[360px] h-[460px] bg-accent/10 rounded-full blur-[110px] pointer-events-none" />
                            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[220px] h-[320px] bg-[#34D399]/[0.06] rounded-full blur-[80px] pointer-events-none" />

                            <div className="relative z-10 w-full max-w-[320px] rounded-[2.6rem] bg-[#0d0d0d] p-2.5 shadow-2xl shadow-black/30 border border-neutral-800">
                                <div className="absolute top-3.5 left-1/2 -translate-x-1/2 w-28 h-4 bg-[#0d0d0d] rounded-full z-20 flex items-center justify-center pointer-events-none">
                                    <div className="w-10 h-0.5 bg-neutral-800/70 rounded-full" />
                                </div>
                                <div className="rounded-[2rem] overflow-hidden relative bg-[#0A0A0F] border border-black/40" style={{ aspectRatio: "9 / 19.5" }}>
                                    {activeTab === 0 && (
                                        <div className="absolute inset-0 flex flex-col animate-fadeIn">
                                            <div className="flex items-center justify-between px-4 pt-7 pb-3 border-b border-[#1A1A26]">
                                                <span className="w-7 h-7 rounded-full bg-[#1A1A26] flex items-center justify-center">
                                                    <Icon d={ICONS.close} className="w-3.5 h-3.5 text-white" />
                                                </span>
                                                <span className="text-[13px] font-bold text-white">Add Recipe</span>
                                                <span className="w-7 h-7" />
                                            </div>

                                            <div className="px-4 pt-4 space-y-2">
                                                {[
                                                    { k: "url" as const, icon: ICONS.link, t: "Paste a link", color: "#FF6B35" },
                                                    { k: "camera" as const, icon: ICONS.camera, t: "Scan cookbook", color: "#34D399" },
                                                    { k: "video" as const, icon: ICONS.play, t: "Import video", color: "#60A5FA" },
                                                ].map((tile) => {
                                                    const on = captureSource === tile.k;
                                                    return (
                                                        <button
                                                            key={tile.k}
                                                            onClick={() => setCaptureSource(tile.k)}
                                                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl border transition-all cursor-pointer ${
                                                                on ? "bg-[#1A1A26] border-[#FF6B35]/60" : "bg-[#0F0F18] border-[#1A1A26]"
                                                            }`}
                                                        >
                                                            <span
                                                                className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                                                                style={{ backgroundColor: `${tile.color}22` }}
                                                            >
                                                                <Icon d={tile.icon} className="w-4 h-4" style={{ color: tile.color }} />
                                                            </span>
                                                            <span className={`text-[12px] font-semibold ${on ? "text-white" : "text-[#C8C8D4]"}`}>{tile.t}</span>
                                                            {on && <Icon d={ICONS.check} className="w-3.5 h-3.5 text-[#FF6B35] ml-auto" stroke={2.5} />}
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            <div className="px-4 pt-3">
                                                {captureSource === "url" && (
                                                    <div className="bg-[#0F0F18] border border-[#1A1A26] rounded-2xl p-3 animate-fadeIn">
                                                        <p className="text-[9px] font-bold uppercase tracking-widest text-[#6E6E85] mb-2">Source URL</p>
                                                        <div className="flex items-center gap-1.5 text-[10px] font-mono truncate">
                                                            <span className="text-[#FF6B35] font-bold">https://</span>
                                                            <span className="text-[#9D9DB0] truncate">nytcooking.com/creamy-tuscan</span>
                                                        </div>
                                                        <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#34D399]/15 border border-[#34D399]/25">
                                                            <Icon d={ICONS.check} className="w-2.5 h-2.5 text-[#34D399]" stroke={3} />
                                                            <span className="text-[9px] font-bold text-[#34D399]">Valid source</span>
                                                        </div>
                                                    </div>
                                                )}
                                                {captureSource === "camera" && (
                                                    <div className="bg-[#0F0F18] border border-dashed border-[#FF6B35]/40 rounded-2xl p-3 animate-fadeIn">
                                                        <div className="h-16 rounded-xl bg-[#1A1A26] flex items-center justify-center mb-2">
                                                            <Icon d={ICONS.camera} className="w-5 h-5 text-[#6E6E85]" />
                                                        </div>
                                                        <p className="text-[9px] font-mono text-[#9D9DB0] leading-snug">
                                                            <span className="text-[#FF6B35] font-bold">Scanned text ›</span> 2 cups cream, 3 cloves garlic, 50g parmesan...
                                                        </p>
                                                    </div>
                                                )}
                                                {captureSource === "video" && (
                                                    <div className="bg-[#0F0F18] border border-[#1A1A26] rounded-2xl p-3 animate-fadeIn">
                                                        <div className="flex items-center gap-2">
                                                            <span className="w-7 h-7 rounded-lg bg-[#60A5FA]/15 flex items-center justify-center">
                                                                <Icon d={ICONS.play} className="w-3.5 h-3.5 text-[#60A5FA]" />
                                                            </span>
                                                            <p className="text-[10px] font-semibold text-[#C8C8D4] flex-1">Parsing audio & captions</p>
                                                            <span className="text-[9px] font-mono font-bold text-[#FF6B35]">1.2s</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="mt-auto px-4 pb-4 pt-3">
                                                <div className="rounded-2xl bg-[#1A1A26]/70 border border-[#2D2D3D] py-3 flex items-center justify-center gap-2">
                                                    <Icon d={ICONS.spark} className="w-4 h-4 text-[#FF6B35]" stroke={2} />
                                                    <span className="text-[12px] font-bold text-[#FF6B35]">Extract Recipe</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 1 && extractPhase === "extracting" && (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center px-6 animate-fadeIn">
                                            <div className="relative w-16 h-16 mb-6 flex items-center justify-center">
                                                <div className="absolute inset-0 rounded-full bg-[#FF6B35]/25 blur-md animate-pulse" />
                                                <div className="w-12 h-12 rounded-full bg-[#FF6B35]/15 border border-[#FF6B35]/40 flex items-center justify-center animate-[spin_6s_linear_infinite]">
                                                    <Icon d={ICONS.spark} className="w-6 h-6 text-[#FF6B35]" stroke={1.6} />
                                                </div>
                                            </div>
                                            <p className="text-[13px] font-bold text-white text-center min-h-[1.2rem] animate-pulse">
                                                {LOADER_STEPS[loaderIdx]}
                                            </p>
                                            <div className="w-32 h-1 rounded-full bg-[#1A1A26] mt-5 overflow-hidden">
                                                <div
                                                    className="h-full rounded-full bg-[#FF6B35] transition-all duration-500 ease-out"
                                                    style={{ width: `${Math.min(95, ((loaderIdx + 1) / LOADER_STEPS.length) * 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 1 && extractPhase === "done" && (
                                        <div className="absolute inset-0 flex flex-col animate-fadeIn">
                                            <div className="relative h-[34%] flex-shrink-0">
                                                <PhoneImage />
                                                <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#0A0A0F] to-transparent" />
                                                <button
                                                    onClick={() => startExtract()}
                                                    className="absolute top-6 right-3 z-10 px-2 py-1 rounded-full bg-black/55 border border-white/10 text-[9px] font-bold text-white/90 cursor-pointer"
                                                >
                                                    Replay
                                                </button>
                                            </div>

                                            <div className="px-4 pt-2.5 flex flex-col min-h-0">
                                                <p className="text-[15px] font-bold text-white leading-tight">Creamy Tuscan Chicken Pasta</p>

                                                <div className="flex flex-wrap gap-1.5 mt-2">
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#1A1A26]">
                                                        <Icon d={ICONS.clock} className="w-3 h-3 text-[#9D9DB0]" />
                                                        <span className="text-[9px] text-[#C8C8D4]">Prep 10m</span>
                                                    </span>
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#1A1A26]">
                                                        <Icon d={ICONS.flame} className="w-3 h-3 text-[#FF6B35]" />
                                                        <span className="text-[9px] text-[#C8C8D4]">Cook 25m</span>
                                                    </span>
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#1A1A26]">
                                                        <Icon d={ICONS.users} className="w-3 h-3 text-[#34D399]" />
                                                        <span className="text-[9px] text-[#C8C8D4]">Serves 4</span>
                                                    </span>
                                                </div>

                                                <div className="mt-2.5 bg-[#0F0F18] rounded-2xl px-3 py-1">
                                                    {INGREDIENTS.map((ing, i) => (
                                                        <div
                                                            key={ing.name}
                                                            className={`flex items-center py-1.5 ${i < INGREDIENTS.length - 1 ? "border-b border-[#1A1A26]" : ""}`}
                                                        >
                                                            <span className="min-w-[44px] text-[10px] font-bold text-[#FF6B35]">{ing.qty}</span>
                                                            {ing.unit && <span className="text-[10px] text-[#9D9DB0] mr-1">{ing.unit}</span>}
                                                            <span className="text-[10px] text-white">{ing.name}</span>
                                                        </div>
                                                    ))}
                                                </div>

                                                <div className="mt-2.5 flex gap-2">
                                                    <span className="w-5 h-5 rounded-full bg-[#FF6B35]/15 text-[#FF6B35] flex items-center justify-center text-[9px] font-bold flex-shrink-0 mt-0.5">
                                                        1
                                                    </span>
                                                    <p className="text-[9.5px] text-[#E1E1EA] leading-snug">
                                                        Boil rigatoni in salted water until al dente; reserve ½ cup pasta water.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 2 && (
                                        <div className="absolute inset-0 flex flex-col animate-fadeIn">
                                            <div className="flex items-center justify-between px-3 pt-7 pb-2">
                                                <span className="w-7 h-7 rounded-full bg-[#1A1A26] flex items-center justify-center">
                                                    <Icon d={ICONS.back} className="w-3.5 h-3.5 text-white" />
                                                </span>
                                                <span className="text-[13px] font-bold text-white">Cook Mode</span>
                                                <span className="w-7 h-7 rounded-full bg-[#1A1A26] flex items-center justify-center">
                                                    <Icon d={ICONS.ellipsis} className="w-3.5 h-3.5 text-white" stroke={3} />
                                                </span>
                                            </div>

                                            <div className="px-3">
                                                <div className="relative h-20 rounded-2xl overflow-hidden">
                                                    <PhoneImage />
                                                </div>
                                            </div>

                                            <div className="px-3 mt-2">
                                                <div className="rounded-2xl bg-[#0F0F18]/90 border border-[#34D399]/25 px-3 py-2 flex items-center justify-between">
                                                    <span className="text-[10px] font-bold text-[#34D399]">Step 2 of 4</span>
                                                    <div className="flex gap-1.5">
                                                        <span className="px-2.5 py-1 rounded-lg bg-[#1A1A26] text-[9px] font-semibold text-white">Prev</span>
                                                        <span className="px-2.5 py-1 rounded-lg bg-[#34D399] text-[9px] font-bold text-[#0A0A0F]">Next</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="px-3 mt-2 space-y-1.5 flex-1 overflow-hidden">
                                                {COOK_TASKS.map((task) => {
                                                    const done = cookDone.includes(task.id);
                                                    const open = task.expanded;
                                                    return (
                                                        <div
                                                            key={task.id}
                                                            className={`rounded-2xl overflow-hidden ${open ? "bg-[#1A1A26]/60 border border-[#34D399]/30" : "bg-[#0F0F18]/50"}`}
                                                        >
                                                            <button
                                                                onClick={() => task.id === "s2" && toggleCook("s2")}
                                                                className="w-full flex items-center gap-2 px-2.5 py-2 cursor-pointer text-left"
                                                            >
                                                                <span
                                                                    className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                                                                        done ? "bg-[#34D399]" : open ? "border-2 border-[#34D399]" : "border-2 border-[#4A4A5E]"
                                                                    }`}
                                                                >
                                                                    {done && <Icon d={ICONS.check} className="w-3 h-3 text-[#0A0A0F]" stroke={3} />}
                                                                </span>
                                                                <span
                                                                    className={`flex-1 text-[10px] font-semibold truncate ${
                                                                        done ? "text-[#6E6E85] line-through" : open ? "text-white" : "text-[#C8C8D4]"
                                                                    }`}
                                                                >
                                                                    {task.kind === "prep" ? "Prepare ingredients" : task.label}
                                                                </span>
                                                                {!open && (
                                                                    <Icon d={ICONS.chevron} className="w-3 h-3 text-[#6E6E85]" stroke={2.5} />
                                                                )}
                                                            </button>
                                                            {open && (
                                                                <div className="px-2.5 pb-2.5 flex items-start gap-2">
                                                                    <p className="flex-1 text-[10px] text-white leading-snug">
                                                                        Sauté garlic in olive oil. Pour cream in slowly and simmer 5 minutes until thickened.
                                                                    </p>
                                                                    <button
                                                                        onClick={() => toggleCook("s2")}
                                                                        className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 cursor-pointer ${
                                                                            done ? "bg-[#34D399]" : "border-2 border-[#4A4A5E]"
                                                                        }`}
                                                                    >
                                                                        {done && <Icon d={ICONS.check} className="w-3.5 h-3.5 text-[#0A0A0F]" stroke={3} />}
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            <div className="px-3 pb-3 pt-1.5">
                                                <div className="rounded-2xl bg-[#1A1A26] border border-[#2D2D3D] py-2.5 flex items-center justify-center gap-1.5">
                                                    <Icon d={ICONS.close} className="w-3.5 h-3.5 text-[#FF6B35]" />
                                                    <span className="text-[10px] font-semibold text-[#FF6B35]">Exit Cook Mode</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </RevealOnScroll>
                </div>
            </div>
        </section>
    );
}
