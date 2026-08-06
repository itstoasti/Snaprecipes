import React, { useEffect, useRef, useState } from "react";
import { View, Text, LayoutChangeEvent } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";
import Animated, {
    FadeIn,
    FadeOut,
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withSequence,
    withDelay,
    withTiming,
    runOnJS,
    Easing,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/hooks/useTheme";

interface ExtractionProgressProps {
    stage: string | null;
    aiText: string;
    contextSnippet: string | null;
}

const STAGE_MAP: Record<string, number> = {
    "start": 0,
    "social:meta": 0,
    "scrape:client": 0,
    "scrape:server": 0,
    "youtube": 1,
    "video:process": 1,
    "slideshow:process": 1,
    "generate:start": 2,
    "image:cache": 3,
    "community:save": 3,
};

const INGREDIENT_EMOJI = ["🍅", "🧄", "🧅", "🌿", "🥕", "🍋", "🧀", "🌶️", "🫑", "🍄", "🥩", "🦐"];

const FALLBACK_LINES = [
    "Preheating the oven and prepping the pans...",
    "Sharpening the chef's knife for clean cuts...",
    "Gathering fresh herbs and aromatics...",
    "The secret ingredient is always patience.",
    "Tasting as we go to get the seasoning just right...",
    "Good recipes take time. Great ones take a little longer.",
    "Simmering gently... zero fluff, just pure flavor.",
    "Whisking ingredients together for the perfect bite...",
    "Chopping garlic and measuring the spices...",
    "Simmering slowly to let all the flavors meld...",
];

const WAVE_PATH = "M0 9 Q 19 0 38 9 T 76 9 T 114 9 T 152 9 T 190 9 T 228 9 T 266 9 T 304 9 T 342 9 T 380 9 T 418 9 T 456 9 T 494 9 T 532 9 T 570 9 T 608 9 V 24 H 0 Z";

function computeFill(stageIdx: number, tokenChars: number): number {
    if (stageIdx <= 0) return 0.16;
    if (stageIdx === 1) return 0.34;
    if (stageIdx === 2) return 0.4 + Math.min(tokenChars / 5500, 1) * 0.44;
    return 0.94;
}

function SteamPuff({ left, size, delay, duration }: { left: number; size: number; delay: number; duration: number }) {
    const progress = useSharedValue(0);

    useEffect(() => {
        progress.value = withRepeat(
            withSequence(
                withDelay(delay, withTiming(0.001, { duration: 1 })),
                withTiming(1, { duration, easing: Easing.out(Easing.ease) })
            ),
            -1,
            false
        );
    }, []);

    const style = useAnimatedStyle(() => ({
        opacity: progress.value < 0.02 ? 0 : (1 - progress.value) * 0.34,
        transform: [
            { translateY: -78 * progress.value },
            { translateX: Math.sin(delay) * 10 * progress.value },
            { scale: 0.5 + progress.value * 1.1 },
        ],
    }));

    return (
        <Animated.View
            style={[
                style,
                {
                    position: "absolute",
                    left,
                    bottom: 96,
                    width: size,
                    height: size,
                    borderRadius: size,
                    backgroundColor: "#E8E4F0",
                },
            ]}
        />
    );
}

function EmberMote({ left, top, size, delay, color }: { left: number; top: number; size: number; delay: number; color: string }) {
    const progress = useSharedValue(0);

    useEffect(() => {
        progress.value = withRepeat(
            withSequence(
                withDelay(delay, withTiming(0.001, { duration: 1 })),
                withTiming(1, { duration: 5200, easing: Easing.inOut(Easing.ease) })
            ),
            -1,
            true
        );
    }, []);

    const style = useAnimatedStyle(() => ({
        opacity: 0.12 + progress.value * 0.4,
        transform: [{ translateY: -16 * progress.value }],
    }));

    return (
        <Animated.View
            style={[style, { position: "absolute", left, top, width: size, height: size, borderRadius: size, backgroundColor: color }]}
        />
    );
}

interface Drop {
    id: number;
    emoji: string;
    startX: number;
    landX: number;
    spin: number;
}

function FallingIngredient({ drop, sceneWidth, onLanded }: { drop: Drop; sceneWidth: number; onLanded: (id: number, x: number) => void }) {
    const y = useSharedValue(-26);
    const x = useSharedValue(drop.startX * sceneWidth);
    const rot = useSharedValue(-drop.spin);
    const opacity = useSharedValue(0);
    const scale = useSharedValue(1);
    const landed = useRef(false);

    useEffect(() => {
        opacity.value = withTiming(1, { duration: 140 });
        x.value = withTiming(drop.landX * sceneWidth, { duration: 950, easing: Easing.out(Easing.quad) });
        rot.value = withTiming(drop.spin, { duration: 950, easing: Easing.inOut(Easing.ease) });
        y.value = withTiming(118, { duration: 950, easing: Easing.bezier(0.45, 0, 0.85, 1) }, (finished) => {
            if (finished && !landed.current) {
                landed.current = true;
                runOnJS(onLanded)(drop.id, drop.landX * sceneWidth);
            }
        });
    }, []);

    const style = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [
            { translateX: x.value },
            { translateY: y.value },
            { rotate: `${rot.value}deg` },
            { scale: scale.value },
        ],
    }));

    useEffect(() => {
        const timer = setTimeout(() => {
            scale.value = withTiming(0.2, { duration: 260, easing: Easing.in(Easing.ease) });
            opacity.value = withTiming(0, { duration: 300 });
        }, 1000);
        return () => clearTimeout(timer);
    }, []);

    return (
        <Animated.Text style={[{ position: "absolute", left: -12, top: 0, fontSize: 24 }, style]}>
            {drop.emoji}
        </Animated.Text>
    );
}

function SplashRing({ x, id }: { x: number; id: number }) {
    const scale = useSharedValue(0.3);
    const opacity = useSharedValue(0.85);

    useEffect(() => {
        scale.value = withTiming(2.4, { duration: 480, easing: Easing.out(Easing.ease) });
        opacity.value = withTiming(0, { duration: 480 });
    }, []);

    const style = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: opacity.value,
    }));

    return (
        <Animated.View
            style={[
                style,
                {
                    position: "absolute",
                    left: x - 13,
                    top: 108,
                    width: 26,
                    height: 12,
                    borderRadius: 13,
                    borderWidth: 2,
                    borderColor: "#FFB37A",
                },
            ]}
        />
    );
}

function PopWord({ word, delay }: { word: string; delay: number }) {
    const p = useSharedValue(0);
    const { colors } = useTheme();

    useEffect(() => {
        p.value = withDelay(delay, withTiming(1, { duration: 340, easing: Easing.out(Easing.back(1.8)) }));
    }, []);

    const style = useAnimatedStyle(() => ({
        opacity: p.value,
        transform: [{ translateY: (1 - p.value) * 12 }, { scale: 0.5 + p.value * 0.5 }],
    }));

    return (
        <Animated.Text style={[style, { color: colors.text, fontFamily: "Inter_700Bold", fontSize: 18, lineHeight: 27 }]}>
            {word}
        </Animated.Text>
    );
}

function ChefQuote({ line }: { line: string }) {
    const words = line.split(" ");
    return (
        <Animated.View exiting={FadeOut.duration(180)} className="items-center">
            <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", columnGap: 7, rowGap: 1 }}>
                {words.map((w, i) => (
                    <PopWord key={`${i}-${w}`} word={w} delay={120 + i * 80} />
                ))}
            </View>
        </Animated.View>
    );
}

function Wave({ color, duration, height, flip }: { color: string; duration: number; height: number; flip?: boolean }) {
    const tx = useSharedValue(flip ? -304 : 0);

    useEffect(() => {
        tx.value = withRepeat(
            withTiming(flip ? 0 : -304, { duration, easing: Easing.linear }),
            -1,
            false
        );
    }, []);

    const style = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }] }));

    return (
        <Animated.View style={[{ position: "absolute", top: 0, left: 0 }, style]}>
            <Svg width={608} height={height} viewBox={`0 0 608 ${height}`}>
                <Path d={WAVE_PATH} fill={color} />
            </Svg>
        </Animated.View>
    );
}

export default function ExtractionProgress({ stage, aiText, contextSnippet }: ExtractionProgressProps) {
    const currentIdx = stage ? (STAGE_MAP[stage] ?? 0) : -1;
    const isCooking = currentIdx === 2;

    const [sceneW, setSceneW] = useState(320);
    const [drops, setDrops] = useState<Drop[]>([]);
    const [splashes, setSplashes] = useState<{ id: number; x: number }[]>([]);
    const [narrationLines, setNarrationLines] = useState<string[]>(FALLBACK_LINES);
    const [narrationIdx, setNarrationIdx] = useState(0);

    const dropSeq = useRef(0);
    const splashSeq = useRef(0);
    const charBucket = useRef(0);
    const lastChars = useRef(0);
    const lastStageIdx = useRef(-1);

    const fillTarget = computeFill(Math.max(currentIdx, 0), aiText.length);
    const fill = useSharedValue(0.08);
    const glow = useSharedValue(0.5);
    const potBob = useSharedValue(0);

    useEffect(() => {
        fill.value = withTiming(fillTarget, { duration: 900, easing: Easing.out(Easing.ease) });
    }, [fillTarget]);

    useEffect(() => {
        glow.value = withTiming(isCooking ? 1 : 0.45, { duration: 700 });
    }, [isCooking]);

    useEffect(() => {
        potBob.value = withRepeat(
            withSequence(
                withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
                withTiming(0, { duration: 1600, easing: Easing.inOut(Easing.ease) })
            ),
            -1,
            false
        );
    }, []);

    const spawnDrop = (count = 1) => {
        setDrops((prev) => {
            if (prev.length >= 4) return prev;
            const next = [...prev];
            for (let i = 0; i < count; i++) {
                const id = dropSeq.current++;
                next.push({
                    id,
                    emoji: INGREDIENT_EMOJI[id % INGREDIENT_EMOJI.length],
                    startX: 0.08 + Math.random() * 0.84,
                    landX: 0.42 + Math.random() * 0.16,
                    spin: (Math.random() > 0.5 ? 1 : -1) * (140 + Math.random() * 220),
                });
            }
            return next;
        });
    };

    const handleLanded = (id: number, x: number) => {
        setDrops((prev) => prev.filter((d) => d.id !== id));
        const splashId = splashSeq.current++;
        setSplashes((prev) => [...prev.slice(-3), { id: splashId, x }]);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        setTimeout(() => setSplashes((prev) => prev.filter((s) => s.id !== splashId)), 600);
    };

    useEffect(() => {
        const delta = aiText.length - lastChars.current;
        lastChars.current = aiText.length;
        if (delta <= 0) return;
        charBucket.current += delta;
        if (charBucket.current >= 170) {
            charBucket.current = 0;
            spawnDrop(1);
        }
    }, [aiText]);

    useEffect(() => {
        if (currentIdx > lastStageIdx.current && currentIdx >= 0) {
            spawnDrop(2);
        }
        lastStageIdx.current = currentIdx;
        if (currentIdx >= 0) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        }
    }, [currentIdx]);

    useEffect(() => {
        const timer = setInterval(() => {
            setNarrationIdx((i) => (i + 1) % Math.max(narrationLines.length, 1));
        }, 3400);
        return () => clearInterval(timer);
    }, [narrationLines.length]);

    const fetchedSnippetRef = useRef<string | null>(null);
    useEffect(() => {
        if (!contextSnippet || fetchedSnippetRef.current === contextSnippet) return;
        fetchedSnippetRef.current = contextSnippet;
        (async () => {
            try {
                const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
                const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
                if (!supabaseUrl || !supabaseKey) return;
                const { data: { session } } = await supabase.auth.getSession();
                const authToken = session?.access_token || supabaseKey;
                const resp = await fetch(`${supabaseUrl}/functions/v1/chef-narration`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${authToken}`,
                        "apikey": supabaseKey,
                    },
                    body: JSON.stringify({ snippet: contextSnippet }),
                });
                if (!resp.ok) return;
                const data = await resp.json();
                if (Array.isArray(data.lines) && data.lines.length > 0) {
                    setNarrationLines(data.lines);
                    setNarrationIdx(0);
                }
            } catch {
                // Narration is garnish — fall back silently
            }
        })();
    }, [contextSnippet]);

    const glowStyle = useAnimatedStyle(() => ({
        opacity: 0.16 + glow.value * 0.3,
        transform: [{ scale: 0.9 + glow.value * 0.25 }],
    }));

    const liquidStyle = useAnimatedStyle(() => ({
        height: 112 * fill.value,
    }));

    const potStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: -3 * potBob.value }],
    }));

    return (
        <View className="items-center w-full">
            {/* ── KITCHEN SCENE ─────────────────────────────────── */}
            <View
                className="w-full rounded-[32px] overflow-hidden border border-white/5"
                style={{ height: 248, backgroundColor: "#0D0D14" }}
                onLayout={(e: LayoutChangeEvent) => setSceneW(e.nativeEvent.layout.width)}
            >
                <Animated.View
                    style={[
                        glowStyle,
                        {
                            position: "absolute",
                            alignSelf: "center",
                            top: 38,
                            width: 280,
                            height: 280,
                            borderRadius: 140,
                            backgroundColor: "#FF6B35",
                        },
                    ]}
                />
                <Animated.View
                    style={[
                        glowStyle,
                        {
                            position: "absolute",
                            alignSelf: "center",
                            top: 72,
                            width: 170,
                            height: 170,
                            borderRadius: 85,
                            backgroundColor: "#FFB37A",
                        },
                    ]}
                />

                <EmberMote left={26} top={52} size={5} delay={0} color="#FF6B35" />
                <EmberMote left={54} top={128} size={3} delay={900} color="#FFB37A" />
                <EmberMote left={sceneW - 52} top={64} size={4} delay={400} color="#FFB37A" />
                <EmberMote left={sceneW - 76} top={136} size={5} delay={1500} color="#FF6B35" />
                <EmberMote left={96} top={34} size={3} delay={2100} color="#FF8C42" />
                <EmberMote left={sceneW - 110} top={30} size={3} delay={2600} color="#FF8C42" />

                {drops.map((d) => (
                    <FallingIngredient key={d.id} drop={d} sceneWidth={sceneW} onLanded={handleLanded} />
                ))}
                {splashes.map((s) => (
                    <SplashRing key={s.id} id={s.id} x={s.x} />
                ))}

                <SteamPuff left={sceneW / 2 - 38} size={17} delay={0} duration={2600} />
                <SteamPuff left={sceneW / 2 - 8} size={24} delay={700} duration={3000} />
                <SteamPuff left={sceneW / 2 + 22} size={15} delay={1300} duration={2700} />
                <SteamPuff left={sceneW / 2 + 2} size={19} delay={2000} duration={3300} />
                <SteamPuff left={sceneW / 2 - 22} size={13} delay={2600} duration={2900} />

                {/* The pot */}
                <Animated.View style={[{ position: "absolute", top: 74, alignSelf: "center" }, potStyle]}>
                    <View style={{ position: "absolute", left: -18, top: 18, width: 20, height: 11, borderRadius: 6, backgroundColor: "#23232E", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }} />
                    <View style={{ position: "absolute", right: -18, top: 18, width: 20, height: 11, borderRadius: 6, backgroundColor: "#23232E", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }} />

                    <View style={{ width: 192, height: 23, borderRadius: 12, backgroundColor: "#2C2C38", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" }} />

                    <View style={{ width: 184, height: 120, alignSelf: "center", marginTop: -7, overflow: "hidden", borderBottomLeftRadius: 62, borderBottomRightRadius: 62, backgroundColor: "#1B1B25", borderWidth: 1, borderColor: "rgba(255,255,255,0.07)" }}>
                        <Animated.View style={[{ position: "absolute", bottom: 0, left: 0, right: 0 }, liquidStyle]}>
                            <View style={{ position: "absolute", top: 0, left: 0, right: 0, height: 22, overflow: "hidden" }}>
                                <Wave color="rgba(255,140,66,0.85)" duration={3400} height={22} />
                                <Wave color="#FF6B35" duration={2500} height={22} flip />
                            </View>
                            <LinearGradient
                                colors={["#FF8C42", "#E5541F"]}
                                style={{ position: "absolute", top: 14, left: 0, right: 0, bottom: 0 }}
                            />
                        </Animated.View>
                    </View>
                </Animated.View>

                {isCooking && (
                    <Animated.View
                        entering={FadeIn.duration(300)}
                        exiting={FadeOut.duration(200)}
                        className="absolute top-3 right-3 flex-row items-center bg-accent/15 border border-accent/40 rounded-full px-2.5 py-1"
                    >
                        <Ionicons name="flame" size={11} color="#FF6B35" style={{ marginRight: 4 }} />
                        <Text className="text-accent font-sans-bold text-[10px] uppercase tracking-widest">Simmering</Text>
                    </Animated.View>
                )}
            </View>

            {/* ── SOUS-CHEF ONE-LINER ───────────────────────────── */}
            <View className="items-center px-6 mt-7">
                <View className="justify-center items-center px-4" style={{ minHeight: 86 }}>
                    <Text
                        style={{
                            position: "absolute",
                            top: -26,
                            left: -6,
                            fontSize: 72,
                            color: "rgba(255,107,53,0.16)",
                            fontFamily: "Inter_700Bold",
                        }}
                    >
                        "
                    </Text>
                    <ChefQuote
                        key={narrationIdx}
                        line={narrationLines[narrationIdx % narrationLines.length]}
                    />
                </View>
            </View>
        </View>
    );
}
