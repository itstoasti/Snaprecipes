"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import RevealOnScroll from "@/components/RevealOnScroll";

function Icon({ d, className = "", stroke = 1.8, style }: { d: string; className?: string; stroke?: number; style?: CSSProperties }) {
    return (
        <svg className={className} style={style} fill="none" stroke="currentColor" strokeWidth={stroke} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d={d} />
        </svg>
    );
}

const I = {
    back: "M15 19l-7-7 7-7",
    cart: "M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z",
    add: "M12 4v16m8-8H4",
    trash: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3",
    info: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    close: "M6 18L18 6M6 6l12 12",
    check: "M5 13l4 4L19 7",
    sun: "M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z",
    fork: "M3 2v7c0 1.1.9 2 2 2h0a2 2 0 002-2V2 M5 2v20 M21 15V2a5 5 0 00-3 9v11",
    moon: "M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z",
    sparkles:
        "M12 3l1.6 4.2L18 9l-4.4 1.8L12 15l-1.6-4.2L6 9l4.4-1.8L12 3z M18.5 14l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8z",
};

function Ring({
    size,
    stroke,
    current,
    goal,
    color,
    centerSub,
}: {
    size: number;
    stroke: number;
    current: number;
    goal: number;
    color: string;
    centerSub?: string;
}) {
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const p = Math.min(current / Math.max(goal, 1), 1);
    const off = c * (1 - p);
    const over = current > goal;
    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} fill="none" />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    stroke={over ? "#EF4444" : color}
                    strokeWidth={stroke}
                    strokeLinecap="round"
                    strokeDasharray={`${c} ${c}`}
                    strokeDashoffset={off}
                    fill="none"
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-white font-bold leading-none" style={{ fontSize: size * 0.26 }}>
                    {Math.round(current)}
                </span>
                {centerSub && (
                    <span className="text-white/45 leading-none" style={{ fontSize: size * 0.1, marginTop: size * 0.04 }}>
                        {centerSub}
                    </span>
                )}
            </div>
        </div>
    );
}

function Thumb({ src }: { src: string }) {
    const [err, setErr] = useState(false);
    return (
        <div className="w-full h-full bg-[#1A1A26] flex items-center justify-center relative">
            <span className="text-base opacity-70">🍽️</span>
            {!err && <img src={src} alt="" onError={() => setErr(true)} className="absolute inset-0 w-full h-full object-cover" />}
        </div>
    );
}

function PhoneBezel({ children }: { children: ReactNode }) {
    return (
        <div className="relative w-full max-w-[272px] rounded-[2.6rem] bg-[#0d0d0d] p-2.5 shadow-2xl shadow-black/30 border border-neutral-800">
            <div className="absolute top-3.5 left-1/2 -translate-x-1/2 w-28 h-4 bg-[#0d0d0d] rounded-full z-20 flex items-center justify-center pointer-events-none">
                <div className="w-10 h-0.5 bg-neutral-800/70 rounded-full" />
            </div>
            <div className="rounded-[2rem] overflow-hidden relative bg-[#0A0A0F] border border-black/40" style={{ aspectRatio: "9 / 19.5" }}>
                {children}
            </div>
        </div>
    );
}

function Check({ children }: { children: ReactNode }) {
    return (
        <span className="flex items-center gap-1.5">
            <span className="text-accent text-lg">✓</span>
            {children}
        </span>
    );
}

const GROCERY_GROUPS = [
    { cat: "Produce", items: [{ n: "Garlic", q: "3 cloves" }, { n: "Sun-Dried Tomatoes", q: "1/2 cup" }] },
    { cat: "Dairy", items: [{ n: "Heavy Cream", q: "1/2 cup" }, { n: "Parmesan", q: "50 g" }] },
];
const GROCERY_DONE = ["Avocado", "Chicken Breasts"];

function GroceryScreen() {
    return (
        <div className="absolute inset-0 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 pt-7 pb-3">
                <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-full bg-[#0F0F18] border border-[#1A1A26] flex items-center justify-center">
                        <Icon d={I.back} className="w-3.5 h-3.5 text-white" />
                    </span>
                    <div>
                        <p className="text-[13px] font-bold text-white leading-tight">Shopping List</p>
                        <p className="text-[7px] font-bold uppercase tracking-widest text-[#6E6E85] mt-0.5">Your Grocery List</p>
                    </div>
                </div>
                <div className="flex gap-1.5">
                    <span className="w-7 h-7 rounded-full bg-[#10B981]/10 border border-[#10B981]/20 flex items-center justify-center">
                        <Icon d={I.sparkles} className="w-3.5 h-3.5 text-[#34D399]" stroke={1.4} />
                    </span>
                    <span className="w-7 h-7 rounded-full bg-[#0F0F18] border border-[#1A1A26] flex items-center justify-center">
                        <Icon d={I.trash} className="w-3 h-3 text-[#FF6B35]" />
                    </span>
                </div>
            </div>

            <div className="px-4 mb-3">
                <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
                    <span className="flex-1 text-[10px] text-[#6E6E85] px-2">Add something else...</span>
                    <span className="w-7 h-7 rounded-xl bg-[#FF6B35] flex items-center justify-center flex-shrink-0">
                        <Icon d={I.add} className="w-3.5 h-3.5 text-white" stroke={2.6} />
                    </span>
                </div>
                <div className="mt-2 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                    <Icon d={I.fork} className="w-3 h-3 text-[#FF6B35]" />
                    <span className="text-[9px] font-bold text-white">Add Ingredients from Recipe</span>
                </div>
            </div>

            <div className="px-4 overflow-hidden">
                {GROCERY_GROUPS.map((g) => (
                    <div key={g.cat} className="mb-3">
                        <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-[8px] font-bold uppercase tracking-[0.18em] text-[#6E6E85]">{g.cat}</span>
                            <span className="flex-1 h-px bg-white/10" />
                        </div>
                        {g.items.map((it) => (
                            <div key={it.n} className="flex items-center gap-2.5 p-2 rounded-2xl bg-white/[0.03] border border-white/[0.06] mb-1.5">
                                <span className="w-5 h-5 rounded-full border-2 border-[#4A4A5E] flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-semibold text-white truncate">{it.n}</p>
                                    <p className="text-[8px] text-[#9D9DB0] mt-0.5">{it.q}</p>
                                </div>
                                <span className="w-5 h-5 rounded-full bg-white/[0.04] flex items-center justify-center flex-shrink-0">
                                    <Icon d={I.close} className="w-2.5 h-2.5 text-[#6E6E85]" />
                                </span>
                            </div>
                        ))}
                    </div>
                ))}

                <div className="flex items-center gap-2 mb-1.5 mt-1">
                    <span className="text-[8px] font-bold uppercase tracking-[0.18em] text-[#4A4A5E]">Completed ({GROCERY_DONE.length})</span>
                    <span className="flex-1 h-px bg-white/[0.06]" />
                </div>
                {GROCERY_DONE.map((n) => (
                    <div key={n} className="flex items-center gap-2.5 p-2 rounded-2xl bg-white/[0.02] border border-white/[0.04] mb-1.5 opacity-50">
                        <span className="w-5 h-5 rounded-full bg-[#10B981] flex items-center justify-center flex-shrink-0">
                            <Icon d={I.check} className="w-3 h-3 text-white" stroke={3} />
                        </span>
                        <p className="flex-1 text-[10px] font-bold text-white/50 line-through truncate">{n}</p>
                        <span className="w-5 h-5 rounded-full bg-white/[0.03] flex items-center justify-center flex-shrink-0">
                            <Icon d={I.close} className="w-2.5 h-2.5 text-[#4A4A5E]" />
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

const MEAL_DAYS = [
    { d: "M", n: "14", dot: true },
    { d: "T", n: "15", dot: false },
    { d: "W", n: "16", dot: true, active: true },
    { d: "T", n: "17", dot: true },
    { d: "F", n: "18", dot: false },
    { d: "S", n: "19", dot: true },
    { d: "S", n: "20", dot: false },
];

const MEALS = [
    { title: "Berry Oats Bowl", meta: "Breakfast • 2 Servings", img: "https://images.unsplash.com/photo-1511690656952-34342bb7c2f2?auto=format&fit=crop&q=80&w=120" },
    { title: "Avocado Salad", meta: "Lunch • 1 Serving", img: "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&q=80&w=120" },
    { title: "Garlic Salmon", meta: "Dinner • 2 Servings", img: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&q=80&w=120" },
];

const CAL_DAYS = [
    { d: "M", n: "13" },
    { d: "T", n: "14" },
    { d: "W", n: "15" },
    { d: "T", n: "16", active: true },
    { d: "F", n: "17" },
    { d: "S", n: "18" },
    { d: "S", n: "19" },
];

function MealPrepScreen() {
    return (
        <div className="absolute inset-0 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 pt-7 pb-3">
                <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-full bg-[#1A1A26] flex items-center justify-center">
                        <Icon d={I.back} className="w-3.5 h-3.5 text-white" />
                    </span>
                    <span className="text-[14px] font-bold text-white">Meal Prep</span>
                </div>
                <span className="w-7 h-7 rounded-full bg-[#FB7185]/20 flex items-center justify-center">
                    <Icon d={I.cart} className="w-3.5 h-3.5 text-[#FB7185]" />
                </span>
            </div>

            <div className="flex gap-1.5 px-4 overflow-hidden">
                {MEAL_DAYS.map((day, i) => (
                    <div
                        key={i}
                        className={`flex flex-col items-center justify-center w-9 h-14 rounded-2xl flex-shrink-0 ${
                            day.active ? "bg-[#10B981]" : "bg-[#1A1A26]"
                        }`}
                    >
                        <span className={`text-[8px] font-bold uppercase ${day.active ? "text-white/80" : "text-[#6E6E85]"}`}>{day.d}</span>
                        <span className="text-[13px] font-bold text-white leading-tight">{day.n}</span>
                        <span className={`w-1 h-1 rounded-full mt-1 ${day.active ? "bg-white" : day.dot ? "bg-[#10B981]" : "bg-transparent"}`} />
                    </div>
                ))}
            </div>

            <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <span className="text-[12px] font-bold text-white">Today&apos;s Meals</span>
                <span className="px-2.5 py-1 rounded-full bg-[#10B981]/20 text-[8px] font-bold text-[#34D399]">+ Add Recipe</span>
            </div>

            <div className="px-4 space-y-2 overflow-hidden">
                {MEALS.map((m) => (
                    <div key={m.title} className="flex items-center gap-2.5 p-2 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
                        <div className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0">
                            <Thumb src={m.img} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-bold text-white truncate">{m.title}</p>
                            <p className="text-[9px] text-[#9D9DB0] mt-0.5">{m.meta}</p>
                        </div>
                        <span className="w-7 h-7 rounded-lg bg-[#EF4444]/10 flex items-center justify-center flex-shrink-0">
                            <Icon d={I.trash} className="w-3 h-3 text-[#EF4444]" />
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function CalorieScreen() {
    const sections = [
        { key: "b", icon: I.sun, color: "#FBBF24", label: "Breakfast", cal: "320 cal", filled: true },
        { key: "l", icon: I.fork, color: "#34D399", label: "Lunch", cal: "", filled: false },
        { key: "d", icon: I.moon, color: "#818CF8", label: "Dinner", cal: "", filled: false },
    ];
    return (
        <div className="absolute inset-0 flex flex-col overflow-hidden">
            <div className="flex items-center gap-2 px-4 pt-7 pb-3">
                <span className="w-7 h-7 rounded-full bg-[#1A1A26] flex items-center justify-center">
                    <Icon d={I.back} className="w-3.5 h-3.5 text-white" />
                </span>
                <span className="text-[14px] font-bold text-white">Calorie Counter</span>
            </div>

            <div className="flex gap-1.5 px-4 overflow-hidden">
                {CAL_DAYS.map((day, i) => (
                    <div
                        key={i}
                        className={`flex flex-col items-center justify-center w-8 h-12 rounded-2xl flex-shrink-0 ${
                            day.active ? "bg-[#EF4444]" : "bg-white/[0.04]"
                        }`}
                    >
                        <span className={`text-[8px] font-bold uppercase ${day.active ? "text-white/80" : "text-[#6E6E85]"}`}>{day.d}</span>
                        <span className="text-[12px] font-bold text-white leading-tight">{day.n}</span>
                    </div>
                ))}
            </div>

            <div className="mx-4 mt-3 rounded-3xl p-3 bg-[#EF4444]/[0.06] border border-[#EF4444]/15">
                <div className="flex items-center justify-between mb-1">
                    <span className="text-[8px] font-bold uppercase tracking-widest text-[#6E6E85]">Daily Goals</span>
                    <Icon d={I.info} className="w-3.5 h-3.5 text-[#9D9DB0]" />
                </div>
                <div className="flex flex-col items-center">
                    <Ring size={84} stroke={8} current={1280} goal={2000} color="#EF4444" centerSub="/ 2000 kcal" />
                    <span className="text-[9px] text-white/40 mt-1">720 kcal remaining</span>
                </div>
                <div className="flex justify-around mt-2">
                    {[
                        { label: "Protein", cur: 86, goal: 150, color: "#60A5FA" },
                        { label: "Carbs", cur: 142, goal: 250, color: "#FBBF24" },
                        { label: "Fat", cur: 48, goal: 70, color: "#F472B6" },
                    ].map((m) => (
                        <div key={m.label} className="flex flex-col items-center">
                            <Ring size={38} stroke={4} current={m.cur} goal={m.goal} color={m.color} />
                            <span className="text-[7px] font-semibold uppercase tracking-wide text-white/55 mt-1">{m.label}</span>
                            <span className="text-[7px] text-white/30">/{m.goal}g</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="px-4 mt-3 space-y-2.5 overflow-hidden">
                {sections.map((s) => (
                    <div key={s.key}>
                        <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${s.color}20` }}>
                                    <Icon d={s.icon} className="w-3 h-3" style={{ color: s.color }} />
                                </span>
                                <span className="text-[11px] font-bold text-white">{s.label}</span>
                                {s.cal && <span className="text-[9px] text-[#9D9DB0]">{s.cal}</span>}
                            </div>
                            <span className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: `${s.color}20` }}>
                                <Icon d={I.add} className="w-3 h-3" style={{ color: s.color }} stroke={2.4} />
                            </span>
                        </div>

                        {s.filled ? (
                            <div className="flex items-center gap-2 p-2 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-bold text-white truncate">Greek Yogurt</p>
                                    <p className="text-[8px] text-[#9D9DB0] mt-0.5">Chobani • 1 container</p>
                                    <div className="flex gap-2 mt-1">
                                        <span className="text-[8px] font-semibold text-[#60A5FA]">18g Protein</span>
                                        <span className="text-[8px] font-semibold text-[#FBBF24]">24g Carbs</span>
                                        <span className="text-[8px] font-semibold text-[#F472B6]">3g Fat</span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-center mr-1">
                                    <span className="text-[10px] font-bold text-white leading-none">180</span>
                                    <span className="text-[7px] text-[#6E6E85]">cal</span>
                                </div>
                                <span className="w-6 h-6 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/15 flex items-center justify-center flex-shrink-0">
                                    <Icon d={I.trash} className="w-2.5 h-2.5 text-[#EF4444]" />
                                </span>
                            </div>
                        ) : (
                            <div className="rounded-2xl border border-dashed border-white/10 py-2.5 text-center">
                                <span className="text-[9px] text-[#6E6E85]">Tap to add {s.label.toLowerCase()}</span>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="absolute bottom-3 right-3 w-9 h-9 rounded-full bg-[#EF4444] flex items-center justify-center shadow-lg shadow-[#EF4444]/40">
                <Icon d={I.add} className="w-4 h-4 text-white" stroke={2.6} />
            </div>
        </div>
    );
}

export default function Features() {
    return (
        <section id="features" className="pt-16 pb-16 bg-surface-950 relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-1/3 right-10 w-72 h-72 bg-accent/5 rounded-full blur-[100px]" />
                <div className="absolute bottom-1/3 left-10 w-96 h-96 bg-accent/5 rounded-full blur-[120px]" />
            </div>

            <div className="relative max-w-7xl mx-auto px-6 z-10 space-y-32">
                <div className="grid lg:grid-cols-2 gap-16 items-center">
                    <RevealOnScroll>
                        <span className="text-accent font-semibold text-sm uppercase tracking-wider">Aisle Consolidation</span>
                        <h3 className="text-3xl md:text-4xl font-extrabold text-surface-300 mt-4 mb-6 leading-tight">
                            Create grocery lists, <span className="italic font-serif text-accent">in seconds</span>
                        </h3>
                        <p className="text-surface-500 text-base mb-6 leading-relaxed">
                            Don&apos;t waste time writing down items. Add recipes directly to your grocery cart. Snap Recipes automatically consolidates duplicate ingredients and organizes them by supermarket category (like Produce, Pantry, and Dairy) so you can get in and out of the store faster.
                        </p>
                        <div className="flex items-center gap-3 text-xs font-semibold text-surface-500">
                            <Check>Smart grouping</Check>
                            <Check>Consolidated items</Check>
                            <Check>Offline access</Check>
                        </div>
                    </RevealOnScroll>

                    <RevealOnScroll delay="0.1s" className="flex justify-center">
                        <div className="relative flex justify-center items-center min-h-[520px] w-[272px] max-w-full">
                            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[420px] bg-accent/10 rounded-full blur-[100px] pointer-events-none" />
                            <PhoneBezel>
                                <GroceryScreen />
                            </PhoneBezel>
                        </div>
                    </RevealOnScroll>
                </div>

                <div className="grid lg:grid-cols-2 gap-16 items-center">
                    <RevealOnScroll className="lg:order-2">
                        <span className="text-accent font-semibold text-sm uppercase tracking-wider">Stress-free Meals</span>
                        <h3 className="text-3xl md:text-4xl font-extrabold text-surface-300 mt-4 mb-6 leading-tight">
                            Meal plan <span className="italic font-serif text-accent">with ease</span>
                        </h3>
                        <p className="text-surface-500 text-base mb-6 leading-relaxed">
                            Take the guesswork out of dinner. Schedule your favorite breakfast, lunch, and dinner recipes into a beautifully organized weekly calendar. Plan ahead, reduce grocery waste, and cook with absolute peace of mind.
                        </p>
                        <div className="flex items-center gap-3 text-xs font-semibold text-surface-500">
                            <Check>Calendar view</Check>
                            <Check>Auto-calculating grocery</Check>
                            <Check>Flexible swaps</Check>
                        </div>
                    </RevealOnScroll>

                    <RevealOnScroll delay="0.1s" className="flex justify-center lg:order-1">
                        <div className="relative flex justify-center items-center min-h-[520px] w-[272px] max-w-full">
                            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[420px] bg-[#10B981]/10 rounded-full blur-[100px] pointer-events-none" />
                            <PhoneBezel>
                                <MealPrepScreen />
                            </PhoneBezel>
                        </div>
                    </RevealOnScroll>
                </div>

                <div className="grid lg:grid-cols-2 gap-16 items-center lg:items-end">
                    <RevealOnScroll>
                        <span className="text-accent font-semibold text-sm uppercase tracking-wider">Nutritional Tracking</span>
                        <h3 className="text-3xl md:text-4xl font-extrabold text-surface-300 mt-4 mb-6 leading-tight">
                            Track calories and macros, <span className="italic font-serif text-accent">automatically</span>
                        </h3>
                        <p className="text-surface-500 text-base mb-6 leading-relaxed">
                            Take control of your nutrition without the manual logging. For every recipe you extract, Snap Recipes automatically calculates calories, protein, fats, and carbs. Stay on top of your fitness goals with instant, per-serving nutritional breakdowns.
                        </p>
                        <div className="flex items-center gap-3 text-xs font-semibold text-surface-500">
                            <Check>Automatic calorie counts</Check>
                            <Check>Full macro breakdowns</Check>
                            <Check>Per-serving details</Check>
                        </div>
                    </RevealOnScroll>

                    <RevealOnScroll delay="0.1s" className="flex justify-center">
                        <div className="relative flex justify-center items-center min-h-[520px] w-[272px] max-w-full">
                            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[420px] bg-[#EF4444]/10 rounded-full blur-[100px] pointer-events-none" />
                            <PhoneBezel>
                                <CalorieScreen />
                            </PhoneBezel>
                        </div>
                    </RevealOnScroll>
                </div>
            </div>
        </section>
    );
}
