"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabase";

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    if (!isOpen) return null;

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
                
                // Check if user needs to confirm email or if they are logged in directly
                if (data.session) {
                    if (onSuccess) onSuccess();
                    onClose();
                } else {
                    setSuccessMessage("Sign up successful! Please check your email to verify your account.");
                }
            } else {
                const { error: signInError } = await supabase.auth.signInWithPassword({
                    email: email.trim(),
                    password,
                });

                if (signInError) throw signInError;

                if (onSuccess) onSuccess();
                onClose();
            }
        } catch (err: any) {
            setError(err.message || "An authentication error occurred.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md transition-all duration-300">
            {/* Backdrop click to close */}
            <div className="absolute inset-0" onClick={onClose} />

            {/* Split Modal Container */}
            <div className="relative w-full max-w-2xl flex rounded-[2.5rem] border border-surface-700/50 bg-surface-900/90 shadow-2xl overflow-hidden transform transition-transform duration-300 scale-100 mx-4 z-10">
                
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-surface-400 hover:text-white transition-colors p-1.5 rounded-full hover:bg-surface-800 z-30"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {/* Left Side: Login Form */}
                <div className="w-full md:w-1/2 p-8 flex flex-col justify-center">
                    {/* Content Header */}
                    <div className="text-center mb-6">
                        <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-4">
                            <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-black text-surface-200 mb-1.5 tracking-tight">
                            {isSignUp ? "Create Account" : "Welcome Back"}
                        </h2>
                        <p className="text-xs text-surface-500 font-medium">
                            {isSignUp
                                ? "Get started with unlimited recipe collections."
                                : "Log in to view your recipe library."}
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="p-3 text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl font-semibold">
                                {error}
                            </div>
                        )}
                        
                        {successMessage && (
                            <div className="p-3 text-xs text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 rounded-xl font-semibold">
                                {successMessage}
                            </div>
                        )}

                        <div>
                            <label className="block text-[10px] font-bold text-surface-500 uppercase tracking-widest mb-1.5 ml-1">
                                Email Address
                            </label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-surface-500">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.206" />
                                    </svg>
                                </span>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="name@example.com"
                                    className="w-full pl-11 pr-4 py-3 bg-surface-950 border border-surface-700/60 rounded-xl text-surface-300 font-sans text-xs focus:outline-none focus:border-accent transition-all placeholder:text-surface-600 focus:shadow-[0_0_10px_rgba(255,107,53,0.15)]"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold text-surface-500 uppercase tracking-widest mb-1.5 ml-1">
                                Password
                            </label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-surface-500">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                </span>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full pl-11 pr-4 py-3 bg-surface-950 border border-surface-700/60 rounded-xl text-surface-300 font-sans text-xs focus:outline-none focus:border-accent transition-all placeholder:text-surface-600 focus:shadow-[0_0_10px_rgba(255,107,53,0.15)]"
                                    required
                                />
                            </div>
                        </div>

                        {isSignUp && (
                            <div>
                                <label className="block text-[10px] font-bold text-surface-500 uppercase tracking-widest mb-1.5 ml-1">
                                    Confirm Password
                                </label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-surface-500">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                    </span>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full pl-11 pr-4 py-3 bg-surface-950 border border-surface-700/60 rounded-xl text-surface-300 font-sans text-xs focus:outline-none focus:border-accent transition-all placeholder:text-surface-600 focus:shadow-[0_0_10px_rgba(255,107,53,0.15)]"
                                        required
                                    />
                                </div>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-accent hover:bg-accent-light text-white font-bold rounded-xl text-xs transition-all hover:shadow-lg hover:shadow-accent/20 flex items-center justify-center disabled:opacity-50 active:scale-[0.98] cursor-pointer"
                        >
                            {loading ? (
                                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
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
                    <div className="mt-5 text-center text-xs font-semibold">
                        <span className="text-surface-500">
                            {isSignUp ? "Already registered? " : "New here? "}
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

                {/* Right Side: Warm Culinary Image Panel */}
                <div className="hidden md:block md:w-1/2 relative bg-surface-900 border-l border-surface-800">
                    <img
                        src="https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&q=80&w=600"
                        alt="Cooking setup"
                        className="absolute inset-0 w-full h-full object-cover select-none"
                    />
                    {/* Shadow overlay matching our premium dark palettes */}
                    <div className="absolute inset-0 bg-gradient-to-t from-surface-950 via-surface-950/80 to-surface-950/30" />
                    
                    {/* Floating mini review card overlay inside modal! */}
                    <div className="absolute bottom-6 left-6 right-6 z-20 bg-surface-950/85 backdrop-blur-md border border-surface-800 rounded-2xl p-4 shadow-xl">
                        <p className="text-[10px] text-surface-300 font-sans leading-relaxed italic">
                            "Snap Recipes has saved me hours. Importing links is completely flawless and clean."
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                            <span className="text-[10px] font-black text-white">Sarah M.</span>
                            <span className="text-[9px] text-surface-500 font-semibold">• Home Cook</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
