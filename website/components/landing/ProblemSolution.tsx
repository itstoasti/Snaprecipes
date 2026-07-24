"use client";

import RevealOnScroll from "@/components/RevealOnScroll";

export default function ProblemSolution() {
    return (
        <section className="pt-24 pb-16 bg-surface-950 relative overflow-hidden">
            <div className="max-w-7xl mx-auto px-6">
                <div className="grid lg:grid-cols-2 gap-16 items-center">
                    {/* Problem */}
                    <RevealOnScroll>
                        <span className="text-red-500 font-semibold text-sm uppercase tracking-wider">The Problem</span>
                        <h2 className="text-3xl md:text-5xl font-extrabold text-surface-300 mt-4 mb-8 leading-tight">
                            Recipe blogs are<br />
                            <span className="text-surface-500 font-medium">a complete nightmare</span>
                        </h2>
                        <div className="space-y-4">
                            {[
                                { title: "Cluttered Recipe Blogs", desc: "Pop-ups, heavy video ads, and cookies that freeze your browser while you are cooking." },
                                { title: "Lost Social Bookmarks", desc: "Recipes saved on Instagram, TikTok, or Pinterest that you can never find when it's time to eat." },
                                { title: "Manual Grocery Math", desc: "Jotting down ingredients by hand and trying to combine items for your grocery trip." },
                                { title: "Scattered Cooking Tools", desc: "Switching between apps for calendars, nutrition calculators, and screens that keep falling asleep." },
                            ].map((item) => (
                                <div key={item.title} className="flex items-start gap-4 p-4 bg-red-500/[0.04] border border-red-500/20 rounded-2xl">
                                    <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
                                        <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-red-750 text-sm mb-1">{item.title}</h4>
                                        <p className="text-surface-500 text-xs leading-relaxed">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </RevealOnScroll>
 
                    {/* Solution */}
                    <RevealOnScroll delay="0.1s">
                        <span className="text-emerald-600 font-semibold text-sm uppercase tracking-wider">The Solution</span>
                        <h2 className="text-3xl md:text-5xl font-extrabold text-surface-300 mt-4 mb-8 leading-tight">
                            Snap Recipes<br />
                            <span className="text-accent">makes cooking easy</span>
                        </h2>
                        <div className="space-y-4">
                            {[
                                { title: "Ad-Free Clean Layouts", desc: "Strip away the clutter and instantly get a clean view of prep times, ingredients, and directions." },
                                { title: "Save From Any Platform", desc: "Import and save recipes from any website, Instagram, TikTok, or Pinterest directly into your private library." },
                                { title: "Smart Grocery Aggregation", desc: "Automatically group and combine ingredients from multiple recipes into a single, duplicate-free shopping list." },
                                { title: "All-in-One Kitchen Suite", desc: "Plan meals, track calorie/macro counts, use hands-free cook mode, and explore community recipes in one place." },
                            ].map((item) => (
                                <div key={item.title} className="flex items-start gap-4 p-4 bg-emerald-500/[0.04] border border-emerald-500/20 rounded-2xl">
                                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                                        <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-emerald-700 text-sm mb-1">{item.title}</h4>
                                        <p className="text-surface-500 text-xs leading-relaxed">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </RevealOnScroll>
                </div>
            </div>
        </section>
    );
}
