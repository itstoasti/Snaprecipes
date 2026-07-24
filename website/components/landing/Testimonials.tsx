"use client";

import RevealOnScroll from "@/components/RevealOnScroll";

interface Testimonial {
    name: string;
    role: string;
    quote: string;
    rating: number;
}

const TESTIMONIALS: Testimonial[] = [
    {
        name: "Sarah J.",
        role: "Home Cook & Busy Mom",
        quote: "Finally, all my scattered recipes are in one beautiful place! I just paste links from Pinterest and it extracts the clean ingredients instantly.",
        rating: 5,
    },
    {
        name: "Mark L.",
        role: "Meal Prep Enthusiast",
        quote: "Finding dinner ideas is so easy now. No life stories, no ads, just the step-by-step instructions. Saved me hours of planning every single week.",
        rating: 5,
    },
    {
        name: "Emily R.",
        role: "Aspiring Chef",
        quote: "Snap Recipes is my daily cooking companion. The mobile-to-web sync is seamless. Opening the grocery list in the market makes shopping a breeze.",
        rating: 5,
    },
];

export default function Testimonials() {
    return (
        <section className="pt-16 pb-24 bg-surface-950 relative overflow-hidden">
            <div className="max-w-7xl mx-auto px-6 relative z-10">
                <RevealOnScroll>
                    <div className="text-center mb-16">
                        <span className="text-accent font-semibold text-sm uppercase tracking-wider">Reviews</span>
                        <h2 className="text-3xl md:text-5xl font-bold text-surface-300 mt-4 mb-4">
                            Loved by home cooks
                        </h2>
                        <p className="text-surface-500 text-base md:text-lg max-w-xl mx-auto">
                            See how home cooks are simplifying their kitchens with Snap Recipes.
                        </p>
                    </div>
                </RevealOnScroll>

                <div className="grid md:grid-cols-3 gap-8">
                    {TESTIMONIALS.map((t, idx) => (
                        <RevealOnScroll key={t.name} delay={`${idx * 0.1}s`}>
                            <div className="bg-surface-900 border border-surface-700/60 rounded-3xl p-8 shadow-sm flex flex-col justify-between h-full hover:shadow-md hover:border-surface-600 transition-all">
                                <div>
                                    {/* Star Rating */}
                                    <div className="flex items-center gap-1 mb-5 text-amber-400">
                                        {[...Array(t.rating)].map((_, i) => (
                                            <svg key={i} className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                            </svg>
                                        ))}
                                    </div>
                                    <p className="text-surface-450 italic leading-relaxed text-sm mb-6">
                                        “{t.quote}”
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-accent/15 border border-accent/25 flex items-center justify-center text-sm font-bold text-accent capitalize">
                                        {t.name[0]}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-sm text-surface-300">{t.name}</h4>
                                        <p className="text-[10px] text-surface-500 font-medium">{t.role}</p>
                                    </div>
                                </div>
                            </div>
                        </RevealOnScroll>
                    ))}
                </div>
            </div>
        </section>
    );
}
