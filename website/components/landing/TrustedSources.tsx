export default function TrustedSources() {
    return (
        <section className="py-16 border-y border-surface-800/50 overflow-hidden">
            <div className="max-w-7xl mx-auto px-6">
                <p className="text-center text-surface-500 text-sm mb-8">Extract recipes from anywhere</p>
                <div className="flex items-center justify-center gap-12 flex-wrap opacity-50">
                    {["Instagram", "TikTok", "YouTube", "Pinterest", "Websites", "Photos"].map((s) => (
                        <span key={s} className="text-2xl font-bold text-surface-400">{s}</span>
                    ))}
                </div>
            </div>
        </section>
    );
}
