"use client";

import RevealOnScroll from "@/components/RevealOnScroll";

export default function ProblemSolution() {
    return (
        <section className="py-32 relative overflow-hidden">
            <div className="max-w-7xl mx-auto px-6">
                <div className="grid lg:grid-cols-2 gap-16 items-center">
                    <RevealOnScroll>
                        <span className="text-red-400 font-semibold text-sm uppercase tracking-wider">The Problem</span>
                        <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-6">Recipe blogs are<br /><span className="text-surface-500">a nightmare</span></h2>
                        <div className="space-y-4">
                            {[
                                { title: "10-page life stories", desc: "Scroll forever to find the actual recipe" },
                                { title: "Pop-ups & video ads", desc: "Interruptions everywhere while you're cooking" },
                                { title: "Lost bookmarks", desc: "That recipe you saved? Gone forever" },
                            ].map((item) => (
                                <div key={item.title} className="flex items-start gap-4 p-4 bg-red-500/5 border border-red-500/20 rounded-2xl">
                                    <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                                        <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-red-300">{item.title}</h4>
                                        <p className="text-surface-400 text-sm">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </RevealOnScroll>

                    <RevealOnScroll delay="0.2s">
                        <span className="text-emerald-400 font-semibold text-sm uppercase tracking-wider">The Solution</span>
                        <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-6">Snap Recipes<br /><span className="gradient-text">fixes everything</span></h2>
                        <div className="space-y-4">
                            {[
                                { title: "Just the recipe", desc: "Ingredients, steps, timing. Nothing else." },
                                { title: "Always available", desc: "Saved locally and synced to the cloud" },
                                { title: "Beautiful & organized", desc: "Your own personal cookbook, searchable" },
                            ].map((item) => (
                                <div key={item.title} className="flex items-start gap-4 p-4 gradient-border rounded-2xl">
                                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                                        <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-white">{item.title}</h4>
                                        <p className="text-surface-400 text-sm">{item.desc}</p>
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
