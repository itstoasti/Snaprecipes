"use client";

import RevealOnScroll from "@/components/RevealOnScroll";

const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.deanfieldz.yummy";

export default function Pricing() {
    return (
        <section id="pricing" className="py-32 relative">
            <div className="absolute inset-0 bg-gradient-to-b from-surface-950 via-surface-900/30 to-surface-950" />
            <div className="relative max-w-5xl mx-auto px-6">
                <RevealOnScroll>
                    <div className="text-center mb-16">
                        <span className="text-accent font-semibold text-sm uppercase tracking-wider">Pricing</span>
                        <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-6">Start free, go Pro</h2>
                        <p className="text-surface-400 text-lg">Try Snap Recipes free. Upgrade for unlimited everything.</p>
                    </div>
                </RevealOnScroll>

                <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    <RevealOnScroll className="rounded-3xl bg-surface-900 border border-surface-800 p-8">
                        <h3 className="text-2xl font-bold mb-2">Free</h3>
                        <p className="text-surface-400 mb-6">Perfect for trying it out</p>
                        <div className="mb-8"><span className="text-5xl font-bold">$0</span></div>
                        <ul className="space-y-4 mb-8">
                            {[
                                { text: "5 recipe saves / month", included: true },
                                { text: "Camera & link import", included: true },
                                { text: "Cook Mode", included: true },
                                { text: "Cloud sync", included: false },
                            ].map((item) => (
                                <li key={item.text} className="flex items-center gap-3">
                                    <svg className={`w-5 h-5 ${item.included ? "text-emerald-500" : "text-surface-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.included ? "M5 13l4 4L19 7" : "M6 18L18 6M6 6l12 12"} />
                                    </svg>
                                    <span className={item.included ? "text-surface-300" : "text-surface-500"}>{item.text}</span>
                                </li>
                            ))}
                        </ul>
                        <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" className="block w-full py-4 rounded-2xl text-center font-semibold bg-surface-800 hover:bg-surface-700 border border-surface-700 transition-colors">
                            Get Started Free
                        </a>
                    </RevealOnScroll>

                    <RevealOnScroll delay="0.1s" className="gradient-border rounded-3xl p-8 relative">
                        <div className="absolute top-6 right-6 px-3 py-1 bg-accent/20 rounded-full text-accent text-sm font-semibold">Popular</div>
                        <h3 className="text-2xl font-bold mb-2">Pro</h3>
                        <p className="text-surface-400 mb-6">For serious home cooks</p>
                        <div className="mb-8"><span className="text-5xl font-bold">$2.99</span><span className="text-surface-400">/mo</span></div>
                        <ul className="space-y-4 mb-8">
                            {["Unlimited recipe saves", "All import methods", "Cloud sync across devices", "Cook Mode"].map((text) => (
                                <li key={text} className="flex items-center gap-3">
                                    <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    <span className="text-surface-300">{text}</span>
                                </li>
                            ))}
                        </ul>
                        <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" className="block w-full py-4 rounded-2xl text-center font-semibold bg-accent hover:bg-accent-light transition-all hover:shadow-lg hover:shadow-accent/25">
                            Upgrade to Pro
                        </a>
                    </RevealOnScroll>
                </div>
            </div>
        </section>
    );
}
