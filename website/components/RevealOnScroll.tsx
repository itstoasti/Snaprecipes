"use client";

import { useEffect, useRef, useState } from "react";

export default function RevealOnScroll({ children, className = "", delay = "0s" }: { children: React.ReactNode; className?: string; delay?: string }) {
    const ref = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.unobserve(el);
                }
            },
            { threshold: 0.1 }
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    return (
        <div
            ref={ref}
            className={className}
            style={{
                transitionDelay: delay,
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? "translateY(0)" : "translateY(30px)",
                transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
        >
            {children}
        </div>
    );
}
