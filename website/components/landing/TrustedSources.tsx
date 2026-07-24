"use client";

export default function TrustedSources() {
    return (
        <section className="py-12 bg-surface-900 border-y border-surface-700/60 overflow-hidden relative z-10">
            <div className="max-w-7xl mx-auto px-6">
                <p className="text-center text-surface-500 text-xs font-bold uppercase tracking-wider mb-6">Extract recipes from anywhere</p>
                <div className="flex items-center justify-center gap-10 md:gap-16 flex-wrap opacity-40 font-semibold text-lg md:text-xl">
                    {["Instagram", "TikTok", "YouTube", "Pinterest", "All Blogs", "Cookbooks"].map((s) => (
                        <span key={s} className="text-surface-400">{s}</span>
                    ))}
                </div>
            </div>
        </section>
    );
}
