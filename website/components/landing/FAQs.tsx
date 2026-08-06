"use client";

import { useState } from "react";
import RevealOnScroll from "@/components/RevealOnScroll";

interface FAQItem {
    question: string;
    answer: string;
}

const FAQS: FAQItem[] = [
    {
        question: "Is Snap Recipes free? What is the monthly limit?",
        answer:
            "Yes — Snap Recipes offers a free plan, and every core tool is included on the free tier: your recipe library, meal planning, smart grocery lists, Cook Mode, the calorie & macro tracker, the community library, and cross-device sync. The only limit is on imports: free accounts can save 10 recipes per calendar month (the count resets on the 1st). Need more than that? Pro removes the cap.",
    },
    {
        question: "What do I get with Pro, and what does it cost?",
        answer:
            "Pro gives you unlimited recipe saves and imports, plus the AI Food Scanner — snap a photo of a plate and Snap estimates the calories and macros for you (manual entry and barcode scanning stay free for everyone). Pro is $2.99/month, or $1.66/month when billed annually ($19.99/year — that is 44% off).",
    },
    {
        question: "Where can I save recipes from?",
        answer:
            "Almost anywhere. Paste a link from most recipe sites and blogs, snap a photo of a cookbook or printed page and Snap reads the words right off it, or use your phone's Share sheet to send a post, reel, or video straight to Snap — Instagram, TikTok, YouTube, Facebook, Pinterest and more all work. You can also type a recipe in by hand.",
    },
    {
        question: "Does it really strip out the ads and the life stories?",
        answer:
            "That is the whole point. When you import a link, Snap parses the page and pulls out just the recipe — the ingredients, the steps, the cook times, and nutrition when it is available — and leaves behind the banner ads, the pop-ups, and the 2,000-word personal preamble. You get a clean, readable recipe in seconds.",
    },
    {
        question: "Which devices and platforms are supported? Is there an iOS app?",
        answer:
            "Snap Recipes runs as a native Android app on the Google Play Store and as a web app at snaprecipes.xyz that works in any browser — on a laptop, a desktop, or a phone, including iPhone and iPad via Safari or Chrome. There is no dedicated iOS app right now, but the web app fully covers iPhone and syncs with the same account.",
    },
    {
        question: "Will my recipes sync between my phone and my computer?",
        answer:
            "Yes. Your library is tied to your account, so a recipe you save on your phone shows up on the web dashboard and vice versa. The mobile app also keeps a local copy, so you can browse and cook offline — anything you add while offline syncs back the next time you connect.",
    },
    {
        question: "What is Cook Mode?",
        answer:
            "Cook Mode turns any saved recipe into a fullscreen, distraction-free walkthrough — one instruction at a time with Previous and Next buttons. It keeps your screen awake so the phone will not lock while your hands are messy, and you can tap ingredients and steps to check them off as you go. Quantities follow whatever serving size you choose.",
    },
    {
        question: "How do meal planning and grocery lists work?",
        answer:
            "Schedule breakfast, lunch, and dinner onto a weekly calendar, then build a shopping list from your plan (or from any single recipe) in one tap. Snap merges duplicate ingredients and auto-sorts everything by supermarket category — Produce, Dairy, Pantry and so on — so you can tick items off aisle by aisle as you shop.",
    },
    {
        question: "How does the calorie and macro tracker work?",
        answer:
            "Log foods by searching, entering them yourself, or scanning a barcode (all free), or snap a photo with the Pro AI Food Scanner to estimate the macros instantly. Snap totals your calories, protein, carbs, and fat against daily goals with a ring per nutrient, and keeps everything organized by meal — breakfast, lunch, dinner, and snacks.",
    },
];

export default function FAQs() {
    const [openIdx, setOpenIdx] = useState<number | null>(0);

    const toggleOpen = (idx: number) => {
        setOpenIdx(openIdx === idx ? null : idx);
    };

    return (
        <section className="py-24 bg-surface-900 border-t border-surface-700/60 relative">
            <div className="max-w-4xl mx-auto px-6 relative z-10">
                <RevealOnScroll>
                    <div className="text-center mb-16">
                        <span className="text-accent font-semibold text-sm uppercase tracking-wider">FAQ</span>
                        <h2 className="text-3xl md:text-5xl font-bold text-surface-300 mt-4 mb-4">
                            Your questions, answered
                        </h2>
                        <p className="text-surface-500 text-base">
                            Everything you need to know about Snap Recipes on web and mobile.
                        </p>
                    </div>
                </RevealOnScroll>

                <div className="space-y-4">
                    {FAQS.map((faq, idx) => {
                        const isOpen = openIdx === idx;
                        const panelId = `faq-panel-${idx}`;
                        const buttonId = `faq-button-${idx}`;
                        return (
                            <RevealOnScroll key={faq.question} delay={`${idx * 0.05}s`}>
                                <div
                                    className={`border bg-surface-950 rounded-2xl overflow-hidden transition-colors ${
                                        isOpen ? "border-accent/40" : "border-surface-700/60 hover:border-surface-600"
                                    }`}
                                >
                                    <h3>
                                        <button
                                            id={buttonId}
                                            aria-expanded={isOpen}
                                            aria-controls={panelId}
                                            onClick={() => toggleOpen(idx)}
                                            className="w-full px-6 py-5 flex items-center justify-between gap-4 text-left font-bold text-surface-300 hover:text-accent transition-colors cursor-pointer"
                                        >
                                            <span>{faq.question}</span>
                                            <svg
                                                className={`w-5 h-5 flex-shrink-0 text-surface-500 transition-transform duration-300 ${
                                                    isOpen ? "rotate-180 text-accent" : ""
                                                }`}
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                                aria-hidden="true"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>
                                    </h3>
                                    <div
                                        id={panelId}
                                        role="region"
                                        aria-labelledby={buttonId}
                                        className={`transition-all duration-300 ease-in-out ${
                                            isOpen ? "max-h-96 opacity-100 border-t border-surface-700/40" : "max-h-0 opacity-0 pointer-events-none"
                                        }`}
                                    >
                                        <p className="px-6 py-5 text-surface-450 leading-relaxed text-sm">{faq.answer}</p>
                                    </div>
                                </div>
                            </RevealOnScroll>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
