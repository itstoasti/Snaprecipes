"use client";

import { useState, useEffect, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import RevealOnScroll from "@/components/RevealOnScroll";

function Icon({ d, className = "", stroke = 2, style }: { d: string; className?: string; stroke?: number; style?: CSSProperties }) {
    return (
        <svg className={className} style={style} fill="none" stroke="currentColor" strokeWidth={stroke} viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d={d} />
        </svg>
    );
}

const I = {
    check: "M5 13l4 4L19 7",
    x: "M6 18L18 6M6 6l12 12",
    lock: "M12 11V7a4 4 0 10-8 0v4 M5 11h14a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2v-7a2 2 0 012-2z",
    shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z",
    clock: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
    card: "M3 7h18a2 2 0 012 2v8a2 2 0 01-2 2H3a2 2 0 01-2-2V9a2 2 0 012-2z M3 11h18",
    bolt: "M13 2L4 14h7l-1 8 9-12h-7l1-8z",
    spark: "M12 3l1.6 4.2L18 9l-4.4 1.8L12 15l-1.6-4.2L6 9l4.4-1.8L12 3z M18.5 14l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8z",
    arrow: "M5 12h14m-6-6l6 6-6 6",
};

const FREE_FEATURES = [
    { text: "10 recipe saves every month", ok: true },
    { text: "Import from links, camera & share sheet", ok: true },
    { text: "Meal planning & smart grocery lists", ok: true },
    { text: "Cook Mode + calorie & macro tracker", ok: true },
    { text: "Cross-device sync & offline access", ok: true },
    { text: "Unlimited recipe saves", ok: false },
    { text: "AI Food Scanner (photo to macros)", ok: false },
];

const PRO_FEATURES = [
    { text: "Unlimited recipe saves & imports", highlight: true },
    { text: "AI Food Scanner — snap a plate for macros", highlight: true },
    { text: "Everything in the Free plan, included", highlight: false },
    { text: "Meal planning, grocery lists & Cook Mode", highlight: false },
    { text: "Sync across phone, tablet & web", highlight: false },
    { text: "7-day risk-free trial, cancel anytime", highlight: false },
];

const COMPARE: { feature: string; free: string | boolean; pro: string | boolean }[] = [
    { feature: "Recipe saves per month", free: "10", pro: "Unlimited" },
    { feature: "Import from links, camera & share sheet", free: true, pro: true },
    { feature: "Recipe library & cookbooks", free: true, pro: true },
    { feature: "Weekly meal planning calendar", free: true, pro: true },
    { feature: "Smart grocery lists, sorted by aisle", free: true, pro: true },
    { feature: "Cook Mode (hands-free, screen stays on)", free: true, pro: true },
    { feature: "Calorie & macro tracker (manual + barcode)", free: true, pro: true },
    { feature: "Cross-device sync & offline access", free: true, pro: true },
    { feature: "Community recipe library", free: true, pro: true },
    { feature: "Ad-free, clutter-free recipes", free: true, pro: true },
    { feature: "AI Food Scanner (photo to macros)", free: false, pro: true },
];

const TRUST = [
    { icon: I.clock, text: "7-day risk-free Pro trial" },
    { icon: I.shield, text: "Cancel anytime" },
    { icon: I.lock, text: "Secure Stripe checkout" },
];

function CompareCell({ value, accent }: { value: string | boolean; accent?: boolean }) {
    if (value === true) {
        return (
            <span
                className={`inline-flex w-6 h-6 rounded-full items-center justify-center ${
                    accent ? "bg-accent/15 text-accent" : "bg-emerald-500/15 text-emerald-600"
                }`}
            >
                <Icon d={I.check} className="w-3.5 h-3.5" stroke={3} />
            </span>
        );
    }
    if (value === false) {
        return (
            <span className="inline-flex w-6 h-6 rounded-full items-center justify-center bg-surface-800 text-surface-550">
                <Icon d={I.x} className="w-3.5 h-3.5" stroke={2.5} />
            </span>
        );
    }
    return <span className={`text-sm font-bold ${accent ? "text-accent" : "text-surface-300"}`}>{value}</span>;
}

export default function Pricing() {
    const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("yearly");
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const router = useRouter();

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setIsLoggedIn(!!session);
        });
    }, []);

    const handleUpgradeClick = () => {
        if (isLoggedIn) {
            router.push("/dashboard?upgrade=true");
        } else {
            router.push("/auth?upgrade=true");
        }
    };

    const yearly = billingCycle === "yearly";
    const proPrice = yearly ? "$1.66" : "$2.99";

    return (
        <section id="pricing" className="relative py-24 md:py-28 bg-surface-950 border-t border-surface-700/60 overflow-hidden">
            <div
                className="absolute inset-0 pointer-events-none opacity-[0.5]"
                style={{
                    backgroundImage: "radial-gradient(circle, rgba(28,25,20,0.05) 1px, transparent 1px)",
                    backgroundSize: "24px 24px",
                    maskImage: "radial-gradient(ellipse 80% 60% at 50% 30%, #000 30%, transparent 75%)",
                    WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 30%, #000 30%, transparent 75%)",
                }}
            />
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[680px] h-[360px] bg-accent/[0.07] rounded-full blur-[130px] pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-[420px] h-[420px] bg-accent/[0.05] rounded-full blur-[120px] pointer-events-none" />

            <div className="relative max-w-6xl mx-auto px-6 z-10">
                <RevealOnScroll>
                    <div className="text-center max-w-3xl mx-auto mb-12">
                        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-surface-900 border border-surface-750 text-xs font-bold text-accent mb-5 shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                            <span className="uppercase tracking-widest text-[10px]">Pricing</span>
                        </div>
                        <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-surface-300 tracking-tight leading-[1.05] mb-5">
                            Start free. Go Pro for less than <span className="italic font-serif text-accent">a coffee a month</span>
                        </h2>
                        <p className="text-surface-500 text-base md:text-lg leading-relaxed max-w-xl mx-auto">
                            The free plan is genuinely useful. Pro removes the limits and adds the AI Food Scanner — for about the price of a single coffee each month.
                        </p>
                    </div>
                </RevealOnScroll>

                <RevealOnScroll delay="0.05s">
                    <div className="flex justify-center mb-12">
                        <div className="relative inline-flex items-center p-1 rounded-full bg-surface-900 border border-surface-700/70 shadow-inner">
                            {(["monthly", "yearly"] as const).map((cycle) => {
                                const active = billingCycle === cycle;
                                return (
                                    <button
                                        key={cycle}
                                        onClick={() => setBillingCycle(cycle)}
                                        className={`relative z-10 px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer flex items-center gap-2 ${
                                            active ? "bg-accent text-white shadow-md shadow-accent/30" : "text-surface-500 hover:text-surface-300"
                                        }`}
                                    >
                                        {cycle}
                                        {cycle === "yearly" && (
                                            <span
                                                className={`px-1.5 py-0.5 rounded-full text-[9px] font-black tracking-wide transition-all duration-300 ${
                                                    active ? "bg-white text-accent" : "bg-emerald-500/15 text-emerald-600"
                                                } ${active ? "scale-100" : "scale-95"}`}
                                            >
                                                -44%
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </RevealOnScroll>

                <div className="grid lg:grid-cols-2 gap-6 lg:gap-8 items-stretch max-w-5xl mx-auto">
                    <RevealOnScroll delay="0.1s" className="h-full">
                        <div className="group relative h-full flex flex-col rounded-3xl bg-surface-900 border border-surface-700/70 p-8 transition-all duration-300 hover:-translate-y-1 hover:border-surface-600 hover:shadow-xl hover:shadow-black/[0.04]">
                            <div className="flex-1">
                                <span className="text-[11px] font-black uppercase tracking-widest text-surface-500">Free</span>
                                <div className="flex items-end gap-1 mt-3 mb-1">
                                    <span className="text-5xl font-black text-surface-300 tracking-tight tabular-nums">$0</span>
                                    <span className="text-surface-500 text-sm font-semibold mb-1.5">/ mo</span>
                                </div>
                                <p className="text-surface-500 text-sm mb-7">Everything you need to start cooking smarter.</p>

                                <ul className="space-y-3">
                                    {FREE_FEATURES.map((f) => (
                                        <li key={f.text} className="flex items-start gap-3 text-sm">
                                            <span
                                                className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                                                    f.ok ? "bg-emerald-500/15 text-emerald-600" : "bg-surface-800 text-surface-550"
                                                }`}
                                            >
                                                <Icon d={f.ok ? I.check : I.x} className="w-3 h-3" stroke={3} />
                                            </span>
                                            <span className={f.ok ? "text-surface-400" : "text-surface-550"}>{f.text}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <button
                                onClick={() => router.push("/auth")}
                                className="mt-8 w-full py-3.5 rounded-2xl font-bold text-sm bg-surface-800 hover:bg-surface-750 text-surface-300 border border-surface-700 transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.99] cursor-pointer"
                            >
                                Start for free
                            </button>
                        </div>
                    </RevealOnScroll>

                    <RevealOnScroll delay="0.18s" className="h-full">
                        <div className="relative h-full">
                            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-30 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-accent text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-accent/30">
                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                Most popular
                            </div>
                            <div className="absolute -inset-3 bg-accent/20 rounded-[2rem] blur-2xl pointer-events-none" />

                            <div className="group relative h-full flex flex-col rounded-[1.75rem] bg-surface-900 border-2 border-accent/50 p-8 shadow-2xl shadow-accent/10 overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-accent/70 hover:shadow-accent/20">
                                <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
                                    <div className="absolute -inset-y-10 -left-1/3 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/[0.08] to-transparent -translate-x-full group-hover:translate-x-[400%] transition-transform duration-[1100ms] ease-out" />
                                </div>

                                <div className="relative flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[11px] font-black uppercase tracking-widest text-accent">Pro</span>
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/10 border border-accent/20 text-[10px] font-bold text-accent">
                                            <Icon d={I.spark} className="w-3 h-3" stroke={1.5} />
                                            AI included
                                        </span>
                                    </div>

                                    <div className="flex items-end gap-2 mt-3 mb-1">
                                        <span key={proPrice} className="text-6xl font-black text-surface-300 tracking-tight tabular-nums leading-none animate-[slideUp_0.35s_ease-out]">
                                            {proPrice}
                                        </span>
                                        <span className="text-surface-500 text-sm font-semibold mb-1">/mo</span>
                                        {yearly && (
                                            <span className="mb-1.5 text-sm font-bold text-surface-550 line-through decoration-red-400/60">$35.88/yr</span>
                                        )}
                                    </div>
                                    <p className="text-surface-500 text-xs font-semibold mb-1">
                                        {yearly ? "$19.99 billed once a year" : "Billed monthly, cancel anytime"}
                                    </p>
                                    <p className="text-surface-400 text-sm mb-7">For cooks who never want to hit a limit.</p>

                                    <ul className="space-y-3">
                                        {PRO_FEATURES.map((f) => (
                                            <li key={f.text} className="flex items-start gap-3 text-sm">
                                                <span className="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 bg-accent/15 text-accent">
                                                    <Icon d={I.check} className="w-3 h-3" stroke={3} />
                                                </span>
                                                <span className={f.highlight ? "text-surface-300 font-semibold" : "text-surface-400"}>{f.text}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <button
                                    onClick={handleUpgradeClick}
                                    className="group/btn relative mt-8 w-full py-4 rounded-2xl font-black text-sm bg-accent hover:bg-accent-light text-white shadow-lg shadow-accent/30 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-accent/40 active:scale-[0.99] cursor-pointer overflow-hidden flex items-center justify-center gap-2"
                                >
                                    <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent group-hover/btn:translate-x-full transition-transform duration-700" />
                                    <span className="relative">Upgrade to Pro</span>
                                    <Icon d={I.arrow} className="relative w-4 h-4 transition-transform duration-300 group-hover/btn:translate-x-1" stroke={2.5} />
                                </button>
                            </div>
                        </div>
                    </RevealOnScroll>
                </div>

                <RevealOnScroll delay="0.1s">
                    <div className="flex flex-wrap items-center justify-center gap-x-7 gap-y-3 mt-10 text-xs font-semibold text-surface-500">
                        {TRUST.map((t) => (
                            <span key={t.text} className="flex items-center gap-2">
                                <Icon d={t.icon} className="w-4 h-4 text-accent/80" />
                                {t.text}
                            </span>
                        ))}
                    </div>
                </RevealOnScroll>

                <RevealOnScroll delay="0.1s">
                    <div className="mt-20 max-w-4xl mx-auto">
                        <div className="text-center mb-8">
                            <span className="text-accent font-semibold text-sm uppercase tracking-wider">Compare</span>
                            <h3 className="text-2xl md:text-3xl font-extrabold text-surface-300 mt-2">Every feature, side by side</h3>
                        </div>

                        <div className="rounded-3xl border border-surface-700/70 bg-surface-900 overflow-hidden shadow-xl shadow-black/[0.03]">
                            <div className="grid grid-cols-[1.6fr_0.7fr_0.7fr] items-center px-5 sm:px-7 py-5 bg-surface-850/60 border-b border-surface-700/60">
                                <span className="text-[11px] font-black uppercase tracking-widest text-surface-500">Features</span>
                                <div className="text-center">
                                    <span className="text-sm font-extrabold text-surface-300">Free</span>
                                </div>
                                <div className="text-center">
                                    <span className="inline-flex items-center gap-1 text-sm font-extrabold text-accent">
                                        <Icon d={I.bolt} className="w-3.5 h-3.5" stroke={2} />
                                        Pro
                                    </span>
                                </div>
                            </div>

                            {COMPARE.map((row, idx) => (
                                <div
                                    key={row.feature}
                                    className={`grid grid-cols-[1.6fr_0.7fr_0.7fr] items-center px-5 sm:px-7 py-4 transition-colors hover:bg-surface-850/40 ${
                                        idx !== COMPARE.length - 1 ? "border-b border-surface-700/30" : ""
                                    }`}
                                >
                                    <span className="text-sm text-surface-400 pr-3">{row.feature}</span>
                                    <div className="flex justify-center">
                                        <CompareCell value={row.free} />
                                    </div>
                                    <div className="flex justify-center">
                                        <CompareCell value={row.pro} accent />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </RevealOnScroll>
            </div>
        </section>
    );
}
