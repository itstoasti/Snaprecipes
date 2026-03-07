"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.deanfieldz.yummy";

export default function Navbar() {
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <>
            <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-surface-800/50">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <Link href="/" className="flex items-center gap-3">
                            <Image src="/icon.png" alt="Snap Recipes" width={40} height={40} className="rounded-xl shadow-lg" />
                            <span className="text-xl font-bold">Snap Recipes</span>
                        </Link>
                        <div className="hidden md:flex items-center gap-8">
                            <Link href="/#features" className="text-surface-400 hover:text-white transition-colors">Features</Link>
                            <Link href="/#how-it-works" className="text-surface-400 hover:text-white transition-colors">How It Works</Link>
                            <Link href="/#pricing" className="text-surface-400 hover:text-white transition-colors">Pricing</Link>
                            <Link href="/recipes" className="text-surface-400 hover:text-white transition-colors">Recipes</Link>
                        </div>
                        <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" className="hidden md:inline-flex px-5 py-2.5 bg-accent hover:bg-accent-light rounded-full font-semibold text-sm transition-all hover:shadow-lg hover:shadow-accent/25 hover:-translate-y-0.5">
                            Download Free
                        </a>
                        <button className="md:hidden text-white" onClick={() => setMobileOpen(!mobileOpen)}>
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                    </div>
                </div>
            </nav>

            {/* Mobile Menu */}
            {mobileOpen && (
                <div className="fixed inset-0 z-40 glass flex flex-col items-center justify-center gap-8 text-2xl" onClick={() => setMobileOpen(false)}>
                    <Link href="/#features" className="text-white hover:text-accent transition-colors">Features</Link>
                    <Link href="/#how-it-works" className="text-white hover:text-accent transition-colors">How It Works</Link>
                    <Link href="/#pricing" className="text-white hover:text-accent transition-colors">Pricing</Link>
                    <Link href="/recipes" className="text-white hover:text-accent transition-colors">Recipes</Link>
                    <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" className="px-8 py-3 bg-accent rounded-full font-semibold">Download</a>
                </div>
            )}
        </>
    );
}
