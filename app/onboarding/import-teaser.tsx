import React, { useEffect } from "react";
import { View, Text, Pressable, Image, StyleSheet, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
    FadeIn,
    ZoomIn,
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    withDelay,
    Easing,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { OnboardingHeader } from "@/components/onboarding/OnboardingHeader";

const ORANGE = "#FF6B35";
const ORANGE_LIGHT = "#FF8F5E";
const ORANGE_DARK = "#E05520";
const INK = "#1F2937";
const CREAM = "#FAF7F2";

const FOOD_PHOTO = require("../../assets/recime_lifestyle_1.jpg");

/* gentle continuous vertical float (one hook-set per instance) */
function useFloat(amp: number, duration: number, delay: number) {
    const y = useSharedValue(0);
    useEffect(() => {
        y.value = withDelay(
            delay,
            withRepeat(
                withTiming(-amp, { duration, easing: Easing.inOut(Easing.ease) }),
                -1,
                true,
            ),
        );
    }, []);
    return useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
}

function FloatingBadge({
    delay,
    amp,
    duration,
    entering,
    style,
    children,
}: {
    delay: number;
    amp: number;
    duration: number;
    entering: any;
    style?: any;
    children: React.ReactNode;
}) {
    const float = useFloat(amp, duration, delay);
    return (
        <Animated.View entering={entering} style={[s.badgeAnchor, style]}>
            <Animated.View style={[s.badgeShadow, float]}>{children}</Animated.View>
        </Animated.View>
    );
}

function AmbientEmoji({
    emoji,
    delay,
    duration,
    style,
}: {
    emoji: string;
    delay: number;
    duration: number;
    style?: any;
}) {
    const y = useSharedValue(0);
    useEffect(() => {
        y.value = withDelay(
            delay,
            withRepeat(
                withTiming(-16, { duration, easing: Easing.inOut(Easing.ease) }),
                -1,
                true,
            ),
        );
    }, []);
    const anim = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
    return (
        <Animated.View style={[s.ambientEmoji, style]} pointerEvents="none">
            <Animated.Text style={[s.ambientEmojiText, anim]}>{emoji}</Animated.Text>
        </Animated.View>
    );
}

/* the floating "just saved" toast */
function SavedToast() {
    const float = useFloat(6, 2200, 400);
    return (
        <Animated.View entering={ZoomIn.delay(700).springify()} style={s.toastAnchor}>
            <Animated.View style={[s.toast, float]}>
                <View style={s.toastCheck}>
                    <Ionicons name="checkmark" size={12} color="#FFF" />
                </View>
                <Text style={s.toastText}>Saved to library</Text>
            </Animated.View>
        </Animated.View>
    );
}

export default function ImportTeaserScreen() {
    const router = useRouter();
    const press = useSharedValue(0);
    const btnAnim = useAnimatedStyle(() => ({
        transform: [{ scale: 1 - press.value * 0.035 }],
    }));

    const handleShowMeHow = () => router.push("/onboarding/interactive-guide");

    return (
        <View style={s.root}>
            {/* ambient warm life behind everything */}
            <View style={s.ambient} pointerEvents="none">
                <View style={[s.glow, s.glowA]} />
                <View style={[s.glow, s.glowB]} />
                <AmbientEmoji emoji="🥑" delay={0} duration={3600} style={{ top: "16%", left: "8%" }} />
                <AmbientEmoji emoji="🍅" delay={500} duration={4200} style={{ top: "30%", right: "10%" }} />
                <AmbientEmoji emoji="🥦" delay={900} duration={3900} style={{ bottom: "24%", left: "12%" }} />
            </View>

            <OnboardingHeader progress={0.65} />

            <View style={s.body}>
                {/* Title */}
                <Animated.View entering={FadeIn.duration(600)} style={s.head}>
                    <Text style={s.title}>
                        Awesome <Text style={s.titlePop}>🎉</Text>
                    </Text>
                    <Text style={s.subtitle}>
                        SnapRecipes supports recipe importing from{" "}
                        <Text style={s.subtitleBold}>95% of sites</Text> such as Instagram,
                        Facebook, TikTok, Pinterest, YouTube and more!
                    </Text>
                </Animated.View>

                {/* Collage: clean IG-post card + floating brand badges */}
                <View style={s.collage}>
                    {/* center phone frame matching slide 1 & website */}
                    <Animated.View entering={ZoomIn.duration(650).springify()} style={s.cardFrame}>
                        {/* Dynamic Island Notch */}
                        <View style={s.bezelNotch}>
                            <View style={s.bezelSpeaker} />
                        </View>

                        <View style={s.cardInner}>
                            {/* status bar */}
                            <View style={s.statusBar}>
                                <Text style={s.statusTime}>11:33</Text>
                                <View style={s.statusRight}>
                                    <Ionicons name="cellular" size={12} color="#000" />
                                    <Ionicons name="wifi" size={12} color="#000" />
                                    <Ionicons name="battery-full" size={15} color="#000" />
                                </View>
                            </View>
                            {/* IG top bar */}
                            <View style={s.igTop}>
                                <Ionicons name="chevron-back" size={16} color="#000" />
                                <View style={{ alignItems: "center" }}>
                                    <Text style={s.igTopSmall}>SNAPRECIPES.APP</Text>
                                    <Text style={s.igTopTitle}>Posts</Text>
                                </View>
                                <View style={s.igTopAvatar}>
                                    <Text style={s.igTopAvatarText}>S</Text>
                                </View>
                            </View>
                            {/* account row */}
                            <View style={s.igAccount}>
                                <View style={s.igAccountLeft}>
                                    <View style={s.igAccountAvatar}>
                                        <Text style={s.igAccountAvatarText}>CN</Text>
                                    </View>
                                    <Text style={s.igHandle}>chef.noelle</Text>
                                </View>
                                <Ionicons name="ellipsis-horizontal" size={15} color="#262626" />
                            </View>
                            {/* photo */}
                            <View style={s.igPhoto}>
                                <Image source={FOOD_PHOTO} style={s.igPhotoImg} resizeMode="cover" />
                                <View style={s.igCarousel}>
                                    <Text style={s.igCarouselText}>1/5</Text>
                                </View>
                                <View style={s.igTime}>
                                    <Ionicons name="time-outline" size={10} color="#FFF" />
                                    <Text style={s.igTimeText}>25 min</Text>
                                </View>
                            </View>
                            {/* carousel dots */}
                            <View style={s.dots}>
                                <View style={[s.dot, s.dotActive]} />
                                <View style={s.dot} />
                                <View style={s.dot} />
                                <View style={s.dot} />
                                <View style={s.dot} />
                            </View>
                            {/* actions */}
                            <View style={s.igActions}>
                                <View style={s.igActionsLeft}>
                                    <Ionicons name="heart" size={19} color="#ED4956" />
                                    <Ionicons name="chatbubble-outline" size={18} color="#262626" />
                                    <Ionicons name="paper-plane-outline" size={18} color="#262626" />
                                </View>
                                <Ionicons name="bookmark-outline" size={18} color="#262626" />
                            </View>
                            {/* caption */}
                            <View style={s.igCaption}>
                                <Text style={s.igLiked} numberOfLines={1}>
                                    Liked by taylah and 1,284 others
                                </Text>
                                <Text style={s.igCapText} numberOfLines={2}>
                                    <Text style={s.igCapHandle}>chef.noelle </Text>
                                    Slow-braised Beef Bourguignon 🍲 full recipe saved! 👇
                                </Text>
                            </View>
                        </View>
                    </Animated.View>

                    {/* floating saved toast */}
                    <SavedToast />

                    {/* brand badges — bold, dynamic, alive */}
                    <FloatingBadge delay={150} amp={7} duration={2600} entering={FadeIn.delay(250)} style={{ top: 24, left: 0 }}>
                        <LinearGradient colors={["#F4F4F6", "#C9C9CF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.badge}>
                            <Ionicons name="camera" size={24} color="#3A3A3C" />
                        </LinearGradient>
                    </FloatingBadge>

                    <FloatingBadge delay={300} amp={9} duration={3000} entering={FadeIn.delay(400)} style={{ top: 6, right: 6 }}>
                        <View style={[s.badge, { backgroundColor: "#E60023" }]}>
                            <Ionicons name="logo-pinterest" size={26} color="#FFF" />
                        </View>
                    </FloatingBadge>

                    <FloatingBadge delay={450} amp={8} duration={2800} entering={FadeIn.delay(550)} style={{ bottom: 96, left: -6 }}>
                        <View style={[s.badge, { backgroundColor: "#000" }]}>
                            <Ionicons name="logo-tiktok" size={24} color="#FFF" />
                        </View>
                    </FloatingBadge>

                    <FloatingBadge delay={600} amp={10} duration={3200} entering={FadeIn.delay(700)} style={{ bottom: 78, right: -2 }}>
                        <View style={[s.badge, { backgroundColor: "#1877F2" }]}>
                            <Ionicons name="logo-facebook" size={26} color="#FFF" />
                        </View>
                    </FloatingBadge>

                    <FloatingBadge delay={750} amp={6} duration={2400} entering={FadeIn.delay(850)} style={{ bottom: 18, right: 26 }}>
                        <LinearGradient
                            colors={["#F58529", "#DD2A7B", "#8134AF", "#515BD4"]}
                            start={{ x: 0, y: 1 }}
                            end={{ x: 1, y: 0 }}
                            style={[s.badge, s.badgeLg]}
                        >
                            <Ionicons name="camera-outline" size={28} color="#FFF" />
                        </LinearGradient>
                    </FloatingBadge>
                </View>

                {/* CTA with press micro-interaction */}
                <Animated.View entering={FadeIn.delay(500).duration(500)} style={s.ctaWrap}>
                    <Pressable
                        onPress={handleShowMeHow}
                        onPressIn={() => (press.value = withTiming(1, { duration: 110 }))}
                        onPressOut={() => (press.value = withTiming(0, { duration: 140 }))}
                    >
                        <Animated.View style={btnAnim}>
                            <LinearGradient
                                colors={[ORANGE_LIGHT, ORANGE, ORANGE_DARK]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={s.button}
                            >
                                <Text style={s.buttonText}>Show me how</Text>
                            </LinearGradient>
                        </Animated.View>
                    </Pressable>
                </Animated.View>
            </View>
        </View>
    );
}

const CARD_W = Math.min(Math.round(Dimensions.get("window").width * 0.62), 244);

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: CREAM },
    ambient: { ...StyleSheet.absoluteFillObject, overflow: "hidden" },
    glow: { position: "absolute", borderRadius: 9999 },
    glowA: { width: 260, height: 260, top: -60, right: -80, backgroundColor: ORANGE, opacity: 0.07 },
    glowB: { width: 300, height: 300, bottom: 40, left: -120, backgroundColor: ORANGE_LIGHT, opacity: 0.06 },
    ambientEmoji: { position: "absolute" },
    ambientEmojiText: { fontSize: 26, opacity: 0.16 },

    body: { flex: 1, paddingHorizontal: 22, paddingBottom: 18, paddingTop: 2 },

    head: { alignItems: "center", marginBottom: 4 },
    title: { fontFamily: "Inter_700Bold", fontSize: 34, color: INK, letterSpacing: -0.5 },
    titlePop: { fontSize: 30 },
    subtitle: {
        fontFamily: "Inter_400Regular",
        fontSize: 15,
        color: "#6B7280",
        textAlign: "center",
        lineHeight: 22,
        marginTop: 8,
        paddingHorizontal: 6,
    },
    subtitleBold: { fontFamily: "Inter_700Bold", color: INK },

    collage: { flex: 1, minHeight: 320, position: "relative", alignItems: "center", justifyContent: "center" },

    /* center phone frame matching slide 1 & website */
    cardFrame: {
        width: CARD_W,
        backgroundColor: "#000000",
        borderRadius: 44,
        padding: 10,
        borderWidth: 4,
        borderColor: "#1F2937",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 18 },
        shadowOpacity: 0.35,
        shadowRadius: 26,
        elevation: 14,
        position: "relative",
    },
    cardInner: {
        backgroundColor: "#FFFFFF",
        borderRadius: 34,
        overflow: "hidden",
    },
    bezelNotch: {
        position: "absolute",
        top: 14,
        alignSelf: "center",
        width: 88,
        height: 18,
        backgroundColor: "#000000",
        borderRadius: 9,
        zIndex: 50,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
    },
    bezelSpeaker: {
        width: 32,
        height: 3,
        backgroundColor: "#1F2937",
        borderRadius: 1.5,
    },

    statusBar: {
        height: 26,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 14,
        paddingTop: 6,
    },
    statusTime: { fontFamily: "Inter_600SemiBold", fontSize: 10, color: "#000" },
    statusRight: { flexDirection: "row", alignItems: "center", gap: 4 },

    igTop: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 11,
        paddingVertical: 6,
        backgroundColor: "#FAFAFA",
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: "#EAEAEA",
    },
    igTopSmall: { fontSize: 7, color: "#8E8E8E", letterSpacing: 0.5, fontFamily: "Inter_600SemiBold" },
    igTopTitle: { fontSize: 11, fontFamily: "Inter_700Bold", color: "#262626" },
    igTopAvatar: { width: 18, height: 18, borderRadius: 9, backgroundColor: ORANGE, alignItems: "center", justifyContent: "center" },
    igTopAvatarText: { color: "#FFF", fontSize: 9, fontFamily: "Inter_700Bold" },

    igAccount: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 10, paddingVertical: 6 },
    igAccountLeft: { flexDirection: "row", alignItems: "center", gap: 7 },
    igAccountAvatar: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: "#FFE2D1",
        borderWidth: 1.5,
        borderColor: ORANGE,
        alignItems: "center",
        justifyContent: "center",
    },
    igAccountAvatarText: { color: ORANGE, fontSize: 9, fontFamily: "Inter_700Bold" },
    igHandle: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#262626" },

    igPhoto: { width: "100%", height: 150, backgroundColor: "#EFEFEF", position: "relative" },
    igPhotoImg: { width: "100%", height: "100%" },
    igCarousel: { position: "absolute", top: 8, right: 8, backgroundColor: "rgba(0,0,0,0.45)", borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
    igCarouselText: { color: "#FFF", fontSize: 9, fontFamily: "Inter_600SemiBold" },
    igTime: {
        position: "absolute",
        bottom: 8,
        right: 8,
        backgroundColor: "rgba(0,0,0,0.55)",
        borderRadius: 10,
        paddingHorizontal: 7,
        paddingVertical: 3,
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
    },
    igTimeText: { color: "#FFF", fontSize: 9, fontFamily: "Inter_600SemiBold" },

    dots: { flexDirection: "row", justifyContent: "center", gap: 4, paddingVertical: 7 },
    dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#D9D9D9" },
    dotActive: { backgroundColor: ORANGE, width: 12, borderRadius: 3 },

    igActions: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 11 },
    igActionsLeft: { flexDirection: "row", alignItems: "center", gap: 13 },
    igCaption: { paddingHorizontal: 11, paddingTop: 6, paddingBottom: 12, gap: 3 },
    igLiked: { fontSize: 10, color: "#262626", fontFamily: "Inter_600SemiBold" },
    igCapText: { fontSize: 10, color: "#262626", lineHeight: 14 },
    igCapHandle: { fontFamily: "Inter_700Bold" },

    /* floating badges */
    badgeAnchor: { position: "absolute", zIndex: 20 },
    badgeShadow: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.22,
        shadowRadius: 12,
        elevation: 8,
    },
    badge: {
        width: 52,
        height: 52,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
    },
    badgeLg: { width: 60, height: 60, borderRadius: 18 },

    /* saved toast */
    toastAnchor: { position: "absolute", top: 150, left: -10, zIndex: 30 },
    toast: {
        flexDirection: "row",
        alignItems: "center",
        gap: 7,
        backgroundColor: "#FFFFFF",
        borderRadius: 14,
        paddingVertical: 7,
        paddingHorizontal: 10,
        shadowColor: "#16A34A",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 7,
    },
    toastCheck: { width: 18, height: 18, borderRadius: 9, backgroundColor: "#16A34A", alignItems: "center", justifyContent: "center" },
    toastText: { fontFamily: "Inter_700Bold", fontSize: 11, color: INK },

    /* cta */
    ctaWrap: { marginTop: 8 },
    button: {
        width: Dimensions.get("window").width - 44,
        paddingVertical: 18,
        borderRadius: 18,
        alignItems: "center",
        shadowColor: ORANGE_DARK,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.35,
        shadowRadius: 14,
        elevation: 6,
    },
    buttonText: { color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 18 },
});
