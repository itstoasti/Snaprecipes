"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function AuthPage() {
    const router = useRouter();
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const getRedirectUrl = () => {
        if (typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search);
            const customRedirect = params.get("redirect");
            if (customRedirect) {
                return decodeURIComponent(customRedirect);
            }
            if (params.get("upgrade") === "true") {
                return "/dashboard?upgrade=true";
            }
        }
        return "/dashboard";
    };

    // Redirect to dashboard if user is already logged in
    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                router.push(getRedirectUrl());
            }
        };
        checkSession();
    }, [router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);

        if (!email || !password) {
            setError("Please fill in all fields.");
            return;
        }

        if (password.length < 8) {
            setError("Password must be at least 8 characters long.");
            return;
        }

        if (isSignUp && password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setLoading(true);

        try {
            if (isSignUp) {
                const { data, error: signUpError } = await supabase.auth.signUp({
                    email: email.trim(),
                    password,
                });

                if (signUpError) throw signUpError;
                
                if (data.session) {
                    router.push(getRedirectUrl());
                } else {
                    setSuccessMessage("Sign up successful! Please check your email to verify your account.");
                }
            } else {
                const { error: signInError } = await supabase.auth.signInWithPassword({
                    email: email.trim(),
                    password,
                });

                if (signInError) throw signInError;

                router.push(getRedirectUrl());
            }
        } catch (err: any) {
            setError(err.message || "An authentication error occurred.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Navbar />
            <main className="relative min-h-screen flex overflow-hidden bg-surface-950">
                {/* Left Column: Form Container */}
                <div className="w-full lg:w-1/2 flex items-center justify-center px-6 md:px-12 pt-28 pb-16 z-10 relative">
                    {/* Background blurs for mobile/left column */}
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                        <div className="absolute top-20 left-10 w-72 h-72 bg-accent/5 rounded-full blur-[120px]" />
                        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/5 rounded-full blur-[150px]" />
                    </div>

                    {/* Form Box */}
                    <div className="relative w-full max-w-md p-8 rounded-3xl border border-surface-700/50 bg-surface-900/60 backdrop-blur-md shadow-xl z-10">
                        {/* Header */}
                        <div className="text-center mb-8">
                            <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-4">
                                <svg className="w-7 h-7 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </div>
                            <h2 className="text-3xl font-black text-surface-300 mb-2 tracking-tight">
                                {isSignUp ? "Get Started" : "Welcome Back"}
                            </h2>
                            <p className="text-xs text-surface-500 font-medium leading-relaxed">
                                {isSignUp
                                    ? "Create a free account to extract, save, and sync recipes."
                                    : "Log in to access your recipe dashboard and library."}
                            </p>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <div className="p-3.5 text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl font-semibold">
                                    {error}
                                </div>
                            )}
                            
                            {successMessage && (
                                <div className="p-3.5 text-xs text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 rounded-xl font-semibold">
                                    {successMessage}
                                </div>
                            )}

                            <div>
                                <label className="block text-[10px] font-bold text-surface-500 uppercase tracking-widest mb-2 ml-1">
                                    Email Address
                                </label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-surface-500">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.206" />
                                        </svg>
                                    </span>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="name@example.com"
                                        className="w-full pl-11 pr-4 py-3.5 bg-surface-950 border border-surface-700/60 rounded-2xl text-surface-300 font-sans text-sm focus:outline-none focus:border-accent transition-all placeholder:text-surface-600 focus:shadow-[0_0_12px_rgba(255,107,53,0.15)]"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-surface-500 uppercase tracking-widest mb-2 ml-1">
                                    Password
                                </label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-surface-500">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                    </span>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full pl-11 pr-4 py-3.5 bg-surface-950 border border-surface-700/60 rounded-2xl text-surface-300 font-sans text-sm focus:outline-none focus:border-accent transition-all placeholder:text-surface-600 focus:shadow-[0_0_12px_rgba(255,107,53,0.15)]"
                                        required
                                    />
                                </div>
                            </div>

                            {isSignUp && (
                                <div>
                                    <label className="block text-[10px] font-bold text-surface-500 uppercase tracking-widest mb-2 ml-1">
                                        Confirm Password
                                    </label>
                                    <div className="relative">
                                        <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-surface-500">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                            </svg>
                                        </span>
                                        <input
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="w-full pl-11 pr-4 py-3.5 bg-surface-950 border border-surface-700/60 rounded-2xl text-surface-300 font-sans text-sm focus:outline-none focus:border-accent transition-all placeholder:text-surface-600 focus:shadow-[0_0_12px_rgba(255,107,53,0.15)]"
                                            required
                                        />
                                    </div>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 bg-accent hover:bg-accent-light text-white font-bold rounded-2xl text-sm transition-all hover:shadow-lg hover:shadow-accent/20 flex items-center justify-center disabled:opacity-50 cursor-pointer active:scale-[0.98]"
                            >
                                {loading ? (
                                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                ) : isSignUp ? (
                                    "Sign Up"
                                ) : (
                                    "Sign In"
                                )}
                            </button>
                        </form>

                        {/* Switch link */}
                        <div className="mt-6 text-center text-xs font-semibold">
                            <span className="text-surface-500">
                                {isSignUp ? "Already have an account? " : "New to Snap Recipes? "}
                            </span>
                            <button
                                onClick={() => {
                                    setError(null);
                                    setSuccessMessage(null);
                                    setIsSignUp(!isSignUp);
                                }}
                                className="text-accent hover:text-accent-light font-bold focus:outline-none hover:underline cursor-pointer"
                            >
                                {isSignUp ? "Sign In" : "Sign Up Free"}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Column: Aesthetic Culinary Cover Image */}
                <div className="hidden lg:block lg:w-1/2 relative bg-surface-900 border-l border-surface-800">
                    <img
                        src="https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&q=80&w=1200"
                        alt="Warm kitchen cooking aesthetic"
                        className="absolute inset-0 w-full h-full object-cover select-none"
                    />
                    {/* Dark gradient overlay matching the website's brand surfaces */}
                    <div className="absolute inset-0 bg-gradient-to-t from-surface-950 via-surface-950/70 to-surface-950/20" />
                    
                    {/* Cozy text callouts overlay */}
                    <div className="absolute bottom-16 left-16 right-16 z-20 text-left">
                        <span className="text-accent font-semibold text-xs uppercase tracking-wider block mb-2">Designed for home cooks</span>
                        <h3 className="text-4xl font-extrabold text-white leading-tight max-w-md">
                            Organize your culinary world <span className="italic font-serif text-accent font-normal">beautifully</span>.
                        </h3>
                        <p className="text-surface-400 text-sm mt-4 max-w-sm leading-relaxed">
                            Paste any online link or scan physical pages to import recipes. We remove all ads, cooking stories, and clutter instantly.
                        </p>
                    </div>
                </div>
            </main>
            <Footer />
        </>
    );
}
