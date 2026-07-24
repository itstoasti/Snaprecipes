"use client";

import React, { useState, useEffect } from "react";

const LOADING_STEPS = [
    "Analyzing source URL...",
    "Reading recipe structure...",
    "Extracting ingredients...",
    "Formatting instructions...",
    "Adding some magic...",
    "Sprinkling a pinch of salt...",
    "Simmering gently...",
    "Letting the flavors meld...",
    "Almost ready...",
    "Perfecting the details...",
    "Garnishing the final product...",
];

export default function ExtractionLoader() {
    const [stepIndex, setStepIndex] = useState(0);
    const [progress, setProgress] = useState(1 / LOADING_STEPS.length);

    useEffect(() => {
        let stepCount = 0;
        
        const interval = setInterval(() => {
            stepCount += 1;
            
            if (stepCount < LOADING_STEPS.length) {
                setProgress((stepCount + 1) / LOADING_STEPS.length);
                setStepIndex(stepCount);
            } else {
                // Loop back to index 4 ("Adding some magic...") and cycle
                const loopIndex = 4 + ((stepCount - LOADING_STEPS.length) % (LOADING_STEPS.length - 4));
                setProgress(0.95); // hold at 95%
                setStepIndex(loopIndex);
            }
        }, 2200);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/85 backdrop-blur-md text-white px-6">
            <div className="flex flex-col items-center max-w-sm w-full text-center">
                {/* Pulsing & Rotating Sparkles Icon */}
                <div className="relative items-center justify-center w-24 h-24 mb-8 flex">
                    {/* Glowing outer ring */}
                    <div className="absolute inset-0 rounded-full bg-accent/25 blur-xl animate-pulse" />
                    
                    {/* Rotating sparkle wrapper */}
                    <div className="w-16 h-16 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center animate-[spin_8s_linear_infinite] shadow-lg shadow-accent/10">
                        <svg className="w-8 h-8 text-accent" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 110-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM14 1a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0V7h-3a1 1 0 110-2h3V2a1 1 0 011-1z" clipRule="evenodd" />
                        </svg>
                    </div>
                </div>

                {/* Animated loading step phrase */}
                <h3 className="text-xl font-bold font-sans tracking-wide min-h-[1.75rem] transition-all duration-300 animate-pulse text-white">
                    {LOADING_STEPS[stepIndex]}
                </h3>

                {/* Progress bar container */}
                <div className="w-48 h-1.5 bg-surface-900 rounded-full mt-8 overflow-hidden relative border border-surface-800">
                    {/* Progress fill */}
                    <div 
                        className="absolute top-0 bottom-0 left-0 bg-accent rounded-full transition-all duration-500 ease-out shadow-md shadow-accent/50"
                        style={{ width: `${progress * 100}%` }}
                    />
                </div>
            </div>
        </div>
    );
}
