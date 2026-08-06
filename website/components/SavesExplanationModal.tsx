"use client";

import React from "react";

interface SavesExplanationModalProps {
    isOpen: boolean;
    usageCount: number;
    maxLimit?: number;
    onClose: () => void;
    onUpgrade: () => void;
}

export default function SavesExplanationModal({
    isOpen,
    usageCount,
    maxLimit = 10,
    onClose,
    onUpgrade,
}: SavesExplanationModalProps) {
    if (!isOpen) return null;

    const progressPercent = Math.min((usageCount / maxLimit) * 100, 100);
    const savesLeft = Math.max(maxLimit - usageCount, 0);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]">
            <div
                className="relative w-full max-w-md bg-surface-900 border border-surface-700/80 rounded-3xl p-7 shadow-2xl overflow-hidden text-center glass"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Background Glow Effect */}
                <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-48 bg-accent/20 rounded-full blur-3xl pointer-events-none" />

                {/* Icon Badge */}
                <div className="relative w-16 h-16 rounded-2xl bg-accent/15 border border-accent/30 text-accent flex items-center justify-center mx-auto mb-5 shadow-inner">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                        />
                    </svg>
                </div>

                {/* Title & Description */}
                <h3 className="text-2xl font-bold text-surface-300 mb-2">Monthly Free Saves</h3>
                <p className="text-surface-450 text-sm leading-relaxed mb-6 px-2">
                    Free accounts receive <strong className="text-surface-300">10 recipe saves or imports</strong> every calendar month. Your allowance resets automatically on the 1st of each month.
                </p>

                {/* Progress Box */}
                <div className="bg-surface-950/70 border border-surface-800/80 rounded-2xl p-4 mb-6 text-left shadow-inner">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-surface-500">
                            Usage Tracker
                        </span>
                        <span className="text-xs font-extrabold text-surface-300">
                            {usageCount} / {maxLimit} saves
                        </span>
                    </div>

                    <div className="w-full h-2.5 bg-surface-800 rounded-full overflow-hidden mb-2">
                        <div
                            className={`h-full transition-all duration-500 rounded-full ${
                                usageCount >= maxLimit ? "bg-red-500" : "bg-accent"
                            }`}
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>

                    <p className="text-xs text-surface-500 font-medium">
                        {usageCount >= maxLimit ? (
                            <span className="text-red-400 font-semibold">Monthly limit reached</span>
                        ) : (
                            <span>
                                <strong className="text-surface-300">{savesLeft}</strong> free saves remaining this month
                            </span>
                        )}
                    </p>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                    <button
                        onClick={() => {
                            onClose();
                            onUpgrade();
                        }}
                        className="w-full py-3.5 rounded-2xl font-bold text-sm bg-accent hover:bg-accent-light text-white shadow-lg shadow-accent/25 transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.99] cursor-pointer"
                    >
                        Go Pro for Unlimited Saves
                    </button>

                    <button
                        onClick={onClose}
                        className="w-full py-3 rounded-2xl font-semibold text-sm bg-surface-800 hover:bg-surface-750 text-surface-400 hover:text-surface-200 border border-surface-700/60 transition-all cursor-pointer"
                    >
                        Maybe Later
                    </button>
                </div>
            </div>
        </div>
    );
}
