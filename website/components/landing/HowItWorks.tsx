"use client";

import RevealOnScroll from "@/components/RevealOnScroll";

const steps = [
    { title: "Capture", desc: "Snap a photo, paste a link, or share from any app.", img: "photo-1551218808-94e220e084d2", color: "bg-accent", num: 1 },
    { title: "Extract", desc: "AI reads and extracts ingredients, steps, and timing.", img: "photo-1555939594-58d7cb561ad1", color: "bg-blue-500", num: 2 },
    { title: "Cook", desc: "Recipe saved forever. Cook with distraction-free mode.", img: "photo-1547592180-85f173990554", color: "bg-emerald-500", num: 3 },
];

export default function HowItWorks() {
    return (
        <section id="how-it-works" className="py-32 relative overflow-hidden">
            <div className="max-w-7xl mx-auto px-6">
                <RevealOnScroll>
                    <div className="text-center mb-20">
                        <span className="text-accent font-semibold text-sm uppercase tracking-wider">How It Works</span>
                        <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-6">Three simple steps</h2>
                        <p className="text-surface-400 text-lg max-w-2xl mx-auto">From discovery to dinner in seconds. No more lost bookmarks.</p>
                    </div>
                </RevealOnScroll>

                <div className="grid md:grid-cols-3 gap-8">
                    {steps.map((step, i) => (
                        <RevealOnScroll key={step.title} delay={`${i * 0.15}s`} className="text-center">
                            <div className="relative inline-block mb-8">
                                <div className="w-32 h-32 rounded-3xl overflow-hidden shadow-2xl mx-auto">
                                    <img src={`https://images.unsplash.com/${step.img}?w=300&h=300&fit=crop`} className="w-full h-full object-cover" alt={step.title} />
                                </div>
                                <div className={`absolute -bottom-3 -right-3 w-12 h-12 rounded-xl ${step.color} flex items-center justify-center text-2xl font-bold shadow-lg`}>{step.num}</div>
                            </div>
                            <h3 className="text-2xl font-bold mb-4">{step.title}</h3>
                            <p className="text-surface-400">{step.desc}</p>
                        </RevealOnScroll>
                    ))}
                </div>
            </div>
        </section>
    );
}
