const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.deanfieldz.yummy";

export default function HeroSection() {
    return (
        <section className="relative min-h-screen flex items-center overflow-hidden pt-20">
            {/* Background blurs */}
            <div className="absolute inset-0">
                <div className="absolute top-20 left-10 w-72 h-72 bg-accent/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-20 right-10 w-96 h-96 bg-emerald-500/10 rounded-full blur-[150px]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[200px]" />
            </div>

            <div className="relative max-w-7xl mx-auto px-6 py-20 w-full">
                <div className="grid lg:grid-cols-2 gap-16 items-center">
                    {/* Text */}
                    <div className="text-center lg:text-left">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-900/80 border border-surface-700 text-sm text-surface-400 mb-8" style={{ animation: "fadeIn 0.6s ease-out 0.2s forwards", opacity: 0 }}>
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            Now available on Android
                        </div>

                        <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold leading-[1.1] mb-6" style={{ animation: "slideUp 0.6s ease-out 0.3s forwards", opacity: 0 }}>
                            Save Any Recipe
                            <span className="gradient-text block">Instantly</span>
                        </h1>

                        <p className="text-xl text-surface-400 mb-10 max-w-lg mx-auto lg:mx-0" style={{ animation: "slideUp 0.6s ease-out 0.4s forwards", opacity: 0 }}>
                            Snap a photo, paste a link, or share from any app. We extract the recipe and ditch the 10-page life stories. Just clean, beautiful recipes.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start" style={{ animation: "slideUp 0.6s ease-out 0.5s forwards", opacity: 0 }}>
                            <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" className="group inline-flex items-center justify-center gap-3 px-8 py-4 bg-accent hover:bg-accent-light rounded-2xl font-semibold text-lg transition-all hover:shadow-xl hover:shadow-accent/25 hover:-translate-y-1">
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 010 1.73l-2.808 1.626L15.206 12l2.492-2.491zM5.864 2.658L16.802 8.99l-2.303 2.303-8.635-8.635z" />
                                </svg>
                                Download for Android
                            </a>
                        </div>

                        {/* Social proof */}
                        <div className="flex items-center gap-6 mt-10 justify-center lg:justify-start" style={{ animation: "fadeIn 0.6s ease-out 0.7s forwards", opacity: 0 }}>
                            <div className="flex -space-x-3">
                                {["photo-1494790108377-be9c29b29330", "photo-1507003211169-0a1dd7228f2d", "photo-1438761681033-6461ffad8d80", "photo-1472099645785-5658abf4ff4e"].map((id) => (
                                    <img key={id} src={`https://images.unsplash.com/${id}?w=100&h=100&fit=crop`} className="w-10 h-10 rounded-full border-2 border-surface-950 object-cover" alt="" />
                                ))}
                            </div>
                            <div className="text-left">
                                <div className="flex items-center gap-0.5 text-amber-400">
                                    {[...Array(5)].map((_, i) => (
                                        <svg key={i} className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                        </svg>
                                    ))}
                                </div>
                                <p className="text-surface-400 text-sm">Loved by 10,000+ home cooks</p>
                            </div>
                        </div>
                    </div>

                    {/* Phone mockup */}
                    <div className="relative flex justify-center lg:justify-end" style={{ animation: "scaleIn 0.8s ease-out 0.4s forwards", opacity: 0 }}>
                        <div className="phone-mockup w-72 h-[600px] p-3 animate-float">
                            <div className="w-full h-full rounded-[2.25rem] bg-surface-950 overflow-hidden relative">
                                <div className="absolute top-0 left-0 right-0 h-8 flex items-center justify-center z-20">
                                    <div className="w-28 h-7 bg-black rounded-b-2xl" />
                                </div>
                                <div className="pt-10 px-4 h-full overflow-hidden">
                                    <div className="flex items-center justify-between mb-5">
                                        <div>
                                            <p className="text-surface-500 text-xs">Good evening</p>
                                            <h3 className="text-lg font-bold">My Recipes</h3>
                                        </div>
                                        <div className="w-9 h-9 rounded-full bg-accent/20 flex items-center justify-center">
                                            <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                            </svg>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        {[
                                            { img: "photo-1499636136210-6f4ee915583e", title: "Chocolate Chip Cookies", time: "15 min", serves: "24 cookies" },
                                            { img: "photo-1546069901-ba9599a7e63c", title: "Fresh Garden Salad", time: "10 min", serves: "4 servings" },
                                            { img: "photo-1563379926898-05f4575a45d8", title: "Creamy Garlic Pasta", time: "25 min", serves: "6 servings" },
                                        ].map((card) => (
                                            <div key={card.title} className="recipe-card rounded-2xl overflow-hidden">
                                                <div className="h-24 relative">
                                                    <img src={`https://images.unsplash.com/${card.img}?w=400&h=200&fit=crop`} className="w-full h-full object-cover" alt={card.title} />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-surface-900/90 to-transparent" />
                                                    <div className="absolute bottom-2 left-3 right-3">
                                                        <h4 className="font-bold text-sm">{card.title}</h4>
                                                    </div>
                                                </div>
                                                <div className="p-3 pt-2">
                                                    <div className="flex items-center gap-3 text-[10px] text-surface-400">
                                                        <span className="flex items-center gap-1">
                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                            {card.time}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                            {card.serves}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Scroll indicator */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
                <svg className="w-6 h-6 text-surface-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
            </div>
        </section>
    );
}
