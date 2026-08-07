"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.deanfieldz.yummy";

export default function Navbar() {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();
    const isDashboard = pathname?.startsWith('/dashboard');

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push("/");
    };

    return (
        <>
            <nav className={`fixed top-0 left-0 right-0 z-50 glass border-b border-surface-800/50 ${isDashboard ? 'hidden md:block' : ''}`}>
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <Link href="/" className="flex items-center gap-3">
                            <Image src="/icon.png" alt="Snap Recipes" width={40} height={40} className="rounded-xl shadow-lg" />
                            <span className="text-xl font-bold">Snap Recipes</span>
                        </Link>
                        <div className="hidden md:flex items-center gap-8">
                            <Link href="/#features" className="text-surface-500 hover:text-surface-300 transition-colors">Features</Link>
                            <Link href="/#how-it-works" className="text-surface-500 hover:text-surface-300 transition-colors">How It Works</Link>
                            <Link href="/#pricing" className="text-surface-500 hover:text-surface-300 transition-colors">Pricing</Link>
                            <Link href="/recipes" className="text-surface-500 hover:text-surface-300 transition-colors">Recipes</Link>
                            {session && (
                                <Link href="/dashboard" className="text-surface-500 hover:text-surface-300 transition-colors font-semibold">My Library</Link>
                            )}
                        </div>
                        <div className="hidden md:flex items-center gap-4">
                            {!loading && (
                                <>
                                    {session ? (
                                        <>
                                            <Link href="/dashboard" className="px-5 py-2.5 bg-accent hover:bg-accent-light rounded-full font-semibold text-sm transition-all hover:shadow-lg hover:shadow-accent/25 hover:-translate-y-0.5 text-center text-white">
                                                Dashboard
                                            </Link>
                                            <button 
                                                onClick={handleSignOut}
                                                className="px-4 py-2 text-surface-500 hover:text-surface-300 font-semibold text-sm transition-colors cursor-pointer"
                                            >
                                                Sign Out
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <Link href="/auth" className="text-surface-500 hover:text-surface-300 font-semibold text-sm transition-colors mr-4">
                                                Sign In
                                            </Link>
                                            <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" className="px-5 py-2.5 bg-accent hover:bg-accent-light rounded-full font-semibold text-sm transition-all hover:shadow-lg hover:shadow-accent/25 hover:-translate-y-0.5 text-white">
                                                Download Free
                                            </a>
                                        </>
                                    )}
                                </>
                            )}
                        </div>
                        <button className="md:hidden text-surface-300 cursor-pointer" onClick={() => setMobileOpen(!mobileOpen)}>
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                    </div>
                </div>
            </nav>

            {/* Mobile Menu */}
            {mobileOpen && !isDashboard && (
                <div className="fixed inset-0 z-40 glass flex flex-col items-center justify-center gap-8 text-2xl" onClick={() => setMobileOpen(false)}>
                    <Link href="/#features" className="text-surface-300 hover:text-accent transition-colors">Features</Link>
                    <Link href="/#how-it-works" className="text-surface-300 hover:text-accent transition-colors">How It Works</Link>
                    <Link href="/#pricing" className="text-surface-300 hover:text-accent transition-colors">Pricing</Link>
                    <Link href="/recipes" className="text-surface-300 hover:text-accent transition-colors">Recipes</Link>
                    {session && (
                        <Link href="/dashboard" className="text-surface-300 hover:text-accent transition-colors font-medium">My Library</Link>
                    )}
                    {!loading && (
                        <>
                            {session ? (
                                <>
                                    <Link href="/dashboard" className="px-8 py-3 bg-accent rounded-full font-semibold text-white">Dashboard</Link>
                                    <button onClick={handleSignOut} className="text-surface-500 hover:text-surface-350 cursor-pointer">Sign Out</button>
                                </>
                            ) : (
                                <>
                                    <Link href="/auth" className="text-surface-300 hover:text-accent">Sign In</Link>
                                    <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" className="px-8 py-3 bg-accent rounded-full font-semibold text-white">Download</a>
                                </>
                            )}
                        </>
                    )}
                </div>
            )}
        </>
    );
}
