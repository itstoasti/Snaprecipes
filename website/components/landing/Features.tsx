"use client";

import RevealOnScroll from "@/components/RevealOnScroll";

const features = [
    { title: "Snap to Save", desc: "Point your camera at any recipe - cookbooks, magazines, handwritten cards. Our AI extracts it instantly.", img: "photo-1556909114-f6e7ad7d3136", color: "bg-accent/90", icon: "M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z M15 13a3 3 0 11-6 0 3 3 0 016 0z" },
    { title: "Import from Links", desc: "Paste any recipe URL. We extract just the recipe - no ads, no pop-ups, no life stories.", img: "photo-1504674900247-0877df9cc836", color: "bg-blue-500/90", icon: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" },
    { title: "Share from Anywhere", desc: "Share from Instagram, TikTok, YouTube, or any app. We'll grab the recipe automatically.", img: "photo-1476224203421-9ac39bcb3327", color: "bg-purple-500/90", icon: "M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" },
    { title: "Cook Mode", desc: "Screen stays on while you cook. Check off ingredients and steps as you go.", img: "photo-1495521821757-a1efb6729352", color: "bg-emerald-500/90", icon: "M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" },
    { title: "Cloud Sync", desc: "Your recipes sync across all devices. Start on your phone, continue on your tablet.", img: "photo-1540189549336-e6e99c3679fe", color: "bg-cyan-500/90", icon: "M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" },
    { title: "Collections", desc: "Organize into collections - weeknight dinners, holiday baking, meal prep. Your way.", img: "photo-1606787366850-de6330128bfc", color: "bg-amber-500/90", icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" },
];

export default function Features() {
    return (
        <section id="features" className="py-32 relative">
            <div className="absolute inset-0 bg-gradient-to-b from-surface-950 via-surface-900/50 to-surface-950" />
            <div className="relative max-w-7xl mx-auto px-6">
                <RevealOnScroll>
                    <div className="text-center mb-20">
                        <span className="text-accent font-semibold text-sm uppercase tracking-wider">Features</span>
                        <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-6">Everything you need</h2>
                        <p className="text-surface-400 text-lg max-w-2xl mx-auto">Powerful features designed for home cooks who want their recipes clean, organized, and always accessible.</p>
                    </div>
                </RevealOnScroll>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {features.map((f, i) => (
                        <RevealOnScroll key={f.title} delay={`${i * 0.1}s`} className="food-grid-item gradient-border rounded-3xl overflow-hidden">
                            <div className="h-48 relative">
                                <img src={`https://images.unsplash.com/${f.img}?w=600&h=400&fit=crop`} className="w-full h-full object-cover" alt={f.title} />
                                <div className="absolute inset-0 bg-gradient-to-t from-surface-900 via-surface-900/50 to-transparent" />
                                <div className="absolute bottom-4 left-4">
                                    <div className={`w-12 h-12 rounded-xl ${f.color} flex items-center justify-center mb-3`}>
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={f.icon} />
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-bold">{f.title}</h3>
                                </div>
                            </div>
                            <div className="p-6 pt-4">
                                <p className="text-surface-400">{f.desc}</p>
                            </div>
                        </RevealOnScroll>
                    ))}
                </div>
            </div>
        </section>
    );
}
