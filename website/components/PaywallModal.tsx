"use client";

import { useState } from "react";

interface PaywallModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    userEmail?: string;
}

export default function PaywallModal({ isOpen, onClose, userId, userEmail }: PaywallModalProps) {
    const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleCheckout = async (priceId: string, planLabel: string) => {
        setLoadingPlan(planLabel);
        try {
            const res = await fetch("/api/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ priceId, userId, userEmail }),
            });
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                throw new Error(data.error || "Failed to start checkout");
            }
        } catch (err: any) {
            console.error("Checkout error:", err);
            alert(err.message || "Something went wrong. Please try again.");
            setLoadingPlan(null);
        }
    };

    const monthlyPriceId = process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID || "";
    const yearlyPriceId = process.env.NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID || "";

    return (
        <div
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md p-3 sm:p-4 md:p-6 flex justify-center items-center"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="bg-surface-950 border border-surface-700/60 rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden relative transition-all animate-scaleIn my-auto">
                
                {/* Close Button (Universal) */}
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 sm:top-4 sm:right-4 z-50 w-8 h-8 flex items-center justify-center rounded-full bg-surface-950/90 hover:bg-surface-900 text-surface-300 hover:text-accent transition-all cursor-pointer border border-surface-750 shadow-md"
                    aria-label="Close modal"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-0 items-center">
                    
                    {/* Left Column: App Preview (Visible on desktop only) */}
                    <div className="hidden md:flex md:col-span-5 bg-surface-900 border-r border-surface-700/50 flex-col items-center justify-center p-6 h-full relative overflow-hidden">
                        <div className="absolute inset-0 bg-radial-gradient from-accent/5 to-transparent pointer-events-none" />
                        <div className="relative w-full max-w-[260px] lg:max-w-[280px] rounded-2xl shadow-xl overflow-hidden transform hover:scale-102 transition-transform duration-300">
                            {/* Flat image display - large, clear phone mockup */}
                            <img 
                                src="/images/hero_mockup.jpg" 
                                alt="Snap Recipes Pro App View" 
                                className="w-full h-auto object-contain rounded-2xl" 
                            />
                        </div>
                    </div>

                    {/* Right Column: Checkout & Paywall details */}
                    <div className="col-span-1 md:col-span-7 flex flex-col justify-between p-5 sm:p-6 lg:p-7 relative">
                        
                        {/* Value Proposition Badge */}
                        <div className="flex items-center gap-1.5 text-xs font-extrabold text-accent uppercase tracking-wider bg-accent/10 border border-accent/20 px-3.5 py-1 rounded-full w-max mx-auto md:mx-0 shadow-sm mb-2.5">
                            <span>✨ UNLOCK UNLIMITED RECIPE IMPORTS</span>
                        </div>

                        {/* Value Proposition Title */}
                        <div className="text-center md:text-left mb-3">
                            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-surface-300 font-display tracking-tight leading-tight">
                                Save Any Recipe from Anywhere, Ad-Free
                            </h2>
                            <p className="text-xs sm:text-sm text-surface-450 mt-1.5 max-w-lg mx-auto md:mx-0 leading-relaxed font-medium">
                                Turn social videos & web links into clean recipes with 1-tap grocery lists & instant macro tracking.
                            </p>
                        </div>

                        {/* Real Core Features (2-Column Grid) */}
                        <div className="mb-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-surface-900 border border-surface-700/60 rounded-2xl p-3 sm:p-4">
                                <div className="flex gap-2.5 items-start">
                                    <span className="text-base mt-0.5">📸</span>
                                    <div>
                                        <h4 className="text-xs sm:text-sm font-extrabold text-surface-300">AI Recipe Extraction</h4>
                                        <p className="text-[11px] sm:text-xs text-surface-450 leading-tight mt-0.5 font-medium">Import clean recipes from any blog, video, or photo.</p>
                                    </div>
                                </div>
                                <div className="flex gap-2.5 items-start">
                                    <span className="text-base mt-0.5">🥗</span>
                                    <div>
                                        <h4 className="text-xs sm:text-sm font-extrabold text-surface-300">Nutrition Tracking</h4>
                                        <p className="text-[11px] sm:text-xs text-surface-450 leading-tight mt-0.5 font-medium">Instant calorie, protein, carb & fat calculations.</p>
                                    </div>
                                </div>
                                <div className="flex gap-2.5 items-start">
                                    <span className="text-base mt-0.5">👨‍🍳</span>
                                    <div>
                                        <h4 className="text-xs sm:text-sm font-extrabold text-surface-300">Interactive Cook Mode</h4>
                                        <p className="text-[11px] sm:text-xs text-surface-450 leading-tight mt-0.5 font-medium">Keep screen awake, check steps & scale portions.</p>
                                    </div>
                                </div>
                                <div className="flex gap-2.5 items-start">
                                    <span className="text-base mt-0.5">🛒</span>
                                    <div>
                                        <h4 className="text-xs sm:text-sm font-extrabold text-surface-300">Smart Grocery Lists</h4>
                                        <p className="text-[11px] sm:text-xs text-surface-450 leading-tight mt-0.5 font-medium">Auto-merges ingredient quantities in 1 tap.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Pricing Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                            
                            {/* Monthly Card */}
                            <button
                                onClick={() => handleCheckout(monthlyPriceId, "monthly")}
                                disabled={loadingPlan !== null}
                                className="group relative bg-surface-900 hover:bg-surface-850 border border-surface-700/80 rounded-2xl p-3.5 text-left transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex flex-col justify-between shadow-sm"
                            >
                                <div>
                                    <p className="text-[10px] sm:text-xs uppercase tracking-widest text-surface-500 font-black mb-0.5">Monthly</p>
                                    <p className="text-2xl sm:text-3xl font-black text-surface-300 font-display">
                                        $2.99
                                        <span className="text-xs font-semibold text-surface-500"> / mo</span>
                                    </p>
                                    <p className="text-xs text-surface-450 mt-0.5 font-semibold">Cancel anytime</p>
                                </div>
                                <div className="mt-2.5 w-full py-2.5 bg-surface-300 group-hover:bg-surface-400 rounded-xl text-center text-xs sm:text-sm font-extrabold text-surface-950 transition-all shadow-sm">
                                    {loadingPlan === "monthly" ? (
                                        <svg className="animate-spin h-4 w-4 text-surface-950 mx-auto" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                    ) : (
                                        "Choose Monthly"
                                    )}
                                </div>
                            </button>

                            {/* Yearly Card */}
                            <button
                                onClick={() => handleCheckout(yearlyPriceId, "yearly")}
                                disabled={loadingPlan !== null}
                                className="group relative bg-gradient-to-b from-accent/10 to-surface-900 border-2 border-accent hover:border-accent-light rounded-2xl p-3.5 text-left transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex flex-col justify-between shadow-md shadow-accent/10"
                            >
                                {/* Best Value Badge */}
                                <div className="absolute -top-3 right-4 px-3 py-1 bg-accent rounded-full text-[9px] sm:text-[10px] font-black text-white uppercase tracking-wider shadow-md shadow-accent/30">
                                    Best Value
                                </div>
                                <div>
                                    <p className="text-[10px] sm:text-xs uppercase tracking-widest text-accent font-black mb-0.5">Yearly Savings</p>
                                    <p className="text-2xl sm:text-3xl font-black text-surface-300 font-display">
                                        $1.66
                                        <span className="text-xs font-semibold text-surface-500"> / mo</span>
                                    </p>
                                    <p className="text-xs text-accent font-bold mt-0.5">Billed annually ($19.99/yr) · Save 44%</p>
                                </div>
                                <div className="mt-2.5 w-full py-2.5 bg-accent group-hover:bg-accent-light rounded-xl text-center text-xs sm:text-sm font-extrabold text-white transition-all shadow-md shadow-accent/25">
                                    {loadingPlan === "yearly" ? (
                                        <svg className="animate-spin h-4 w-4 text-white mx-auto" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                    ) : (
                                        "Choose Yearly"
                                    )}
                                </div>
                            </button>
                        </div>

                        {/* Trust Footer */}
                        <div className="text-center md:text-left border-t border-surface-700/60 pt-2">
                            <p className="text-xs text-surface-450 font-medium leading-normal">
                                Cancel anytime in 1 tap · Powered by Stripe · Secure SSL Checkout
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
