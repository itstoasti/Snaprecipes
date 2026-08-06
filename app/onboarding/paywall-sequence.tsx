import React, { useState, useEffect } from "react";
import { View, Text, Pressable, ScrollView, Switch, StyleSheet, Dimensions, Modal, ActivityIndicator, Image, Linking } from "react-native";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import * as Haptics from "expo-haptics";
import Purchases from "react-native-purchases";
import { useRevenueCat } from "@/hooks/useRevenueCat";
import { ONBOARDING_COMPLETE_KEY } from "./first-save";
import Animated, {
    FadeIn,
    SlideInDown,
    ZoomIn,
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    withSequence,
    Easing,
    interpolate,
    withDelay,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useOnboarding } from "@/components/onboarding/onboardingContext";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Floating sway component
function FloatingShape({
    children,
    delay = 0,
    duration = 2600,
    translateYDist = 12,
    rotateDeg = 6,
    style,
}: {
    children: React.ReactNode;
    delay?: number;
    duration?: number;
    translateYDist?: number;
    rotateDeg?: number;
    style?: any;
}) {
    const translateY = useSharedValue(0);
    const rotate = useSharedValue(0);

    useEffect(() => {
        translateY.value = withSequence(
            withTiming(0, { duration: delay }),
            withRepeat(
                withSequence(
                    withTiming(-translateYDist, { duration: duration / 2, easing: Easing.inOut(Easing.ease) }),
                    withTiming(translateYDist / 2, { duration: duration / 2, easing: Easing.inOut(Easing.ease) })
                ),
                -1,
                true
            )
        );

        rotate.value = withSequence(
            withTiming(0, { duration: delay }),
            withRepeat(
                withSequence(
                    withTiming(rotateDeg, { duration: duration * 0.7, easing: Easing.inOut(Easing.ease) }),
                    withTiming(-rotateDeg, { duration: duration * 0.7, easing: Easing.inOut(Easing.ease) })
                ),
                -1,
                true
            )
        );
    }, []);

    const animStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }, { rotate: `${rotate.value}deg` }],
    }));

    return <Animated.View style={[style, animStyle]}>{children}</Animated.View>;
}

// ----------------------------------------------------
// Confetti Explosion Component (Full Screen Coverage)
// ----------------------------------------------------
const CONFETTI_COLORS = [
    "#FF6B35", "#FF3B30", "#F59E0B", "#FBBF24",
    "#10B981", "#34D399", "#3B82F6", "#60A5FA",
    "#EC4899", "#F472B6", "#8B5CF6", "#C084FC"
];

type ConfettiPieceProps = {
    color: string;
    angle: number;
    distance: number;
    size: number;
    delay: number;
    shapeType: number; // 0 = Circle, 1 = Square, 2 = Ribbon
};

const CONFETTI_PIECES_DATA = Array.from({ length: 64 }).map((_, i) => ({
    id: i,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    angle: (i * 360) / 64 + ((i * 17) % 12 - 6),
    distance: 170 + ((i * 29) % 300),
    size: 10 + ((i * 13) % 10),
    delay: (i % 8) * 12, // Instant burst (0ms to 84ms max)
    shapeType: i % 3,
}));

function ConfettiPiece({ color, angle, distance, size, delay, shapeType }: ConfettiPieceProps) {
    const progress = useSharedValue(0);

    useEffect(() => {
        progress.value = withDelay(
            delay,
            withTiming(1, { duration: 2000, easing: Easing.out(Easing.cubic) })
        );
    }, []);

    const animStyle = useAnimatedStyle(() => {
        const rad = (angle * Math.PI) / 180;
        const currentDist = progress.value * distance;
        const tx = Math.cos(rad) * currentDist;
        // Natural arc with gravity pulling downwards
        const ty = Math.sin(rad) * currentDist + progress.value * progress.value * 90;
        const rot = progress.value * 1080;
        const opacity = interpolate(progress.value, [0, 0.04, 0.75, 1], [0, 1, 1, 0]);
        const scale = interpolate(progress.value, [0, 0.1, 0.75, 1], [0.5, 1.4, 1.1, 0]);

        return {
            transform: [{ translateX: tx }, { translateY: ty }, { rotate: `${rot}deg` }, { scale }],
            opacity,
        };
    });

    const isCircle = shapeType === 0;
    const isRibbon = shapeType === 2;

    return (
        <Animated.View
            style={[
                {
                    position: "absolute",
                    width: size,
                    height: isRibbon ? size * 2.8 : size,
                    borderRadius: isCircle ? size / 2 : 3,
                    backgroundColor: color,
                    shadowColor: color,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.3,
                    shadowRadius: 3,
                },
                animStyle,
            ]}
        />
    );
}

function ConfettiExplosion() {
    return (
        <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
            <View style={s.confettiCenter}>
                {CONFETTI_PIECES_DATA.map((p) => (
                    <ConfettiPiece key={p.id} {...p} />
                ))}
            </View>
        </View>
    );
}

// ----------------------------------------------------
// VIP 7-Day Gold Pass Ticket
// ----------------------------------------------------
function GoldPassTicket() {
    const tilt = useSharedValue(0);

    useEffect(() => {
        tilt.value = withRepeat(
            withSequence(
                withTiming(3, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
                withTiming(-3, { duration: 1800, easing: Easing.inOut(Easing.ease) })
            ),
            -1,
            true
        );
    }, []);

    const ticketAnimStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${tilt.value}deg` }],
    }));

    return (
        <View style={s.ticketStage}>
            {/* Confetti Burst */}
            <ConfettiExplosion />

            {/* Glowing Golden Background Aura */}
            <View style={s.ticketGlowAura} />

            {/* Floating Sparkle Accents */}
            <FloatingShape delay={0} duration={2000} translateYDist={10} style={{ position: "absolute", top: 0, left: 10 }}>
                <Ionicons name="sparkles" size={24} color="#FBBF24" />
            </FloatingShape>
            <FloatingShape delay={400} duration={2200} translateYDist={12} style={{ position: "absolute", bottom: 10, right: 10 }}>
                <Ionicons name="sparkles" size={20} color="#F59E0B" />
            </FloatingShape>

            {/* Golden VIP Pass Ticket */}
            <Animated.View style={[s.goldTicketCard, ticketAnimStyle]}>
                {/* Top Ticket Header */}
                <View style={s.ticketHeaderRow}>
                    <View style={s.ticketHeaderBadge}>
                        <Ionicons name="key" size={14} color="#78350F" />
                        <Text style={s.ticketHeaderBadgeText}>VIP ACCESS PASS</Text>
                    </View>
                    <Text style={s.ticketPriceTag}>$0.00 NOW</Text>
                </View>

                {/* Main Ticket Center Info */}
                <View style={s.ticketBody}>
                    <Text style={s.ticketTitle}>7 DAYS UNLIMITED PASS</Text>
                    <Text style={s.ticketSubtitle}>All Pro Features Unlocked • Cancel Anytime</Text>
                </View>

                {/* Ticket Divider with Notch Cutouts */}
                <View style={s.ticketDividerRow}>
                    <View style={[s.ticketNotch, s.ticketNotchLeft]} />
                    <View style={s.ticketDashedLine} />
                    <View style={[s.ticketNotch, s.ticketNotchRight]} />
                </View>

                {/* Ticket Footer Checklist */}
                <View style={s.ticketFooter}>
                    <View style={s.ticketFeatureItem}>
                        <Ionicons name="checkmark-circle" size={15} color="#FBBF24" />
                        <Text style={s.ticketFeatureText}>Recipe Extractor</Text>
                    </View>
                    <View style={s.ticketFeatureItem}>
                        <Ionicons name="checkmark-circle" size={15} color="#FBBF24" />
                        <Text style={s.ticketFeatureText}>AI Assistant</Text>
                    </View>
                    <View style={s.ticketFeatureItem}>
                        <Ionicons name="checkmark-circle" size={15} color="#FBBF24" />
                        <Text style={s.ticketFeatureText}>Nutrition Guide</Text>
                    </View>
                </View>
            </Animated.View>
        </View>
    );
}

// ----------------------------------------------------
// Main Paywall Component
// ----------------------------------------------------
export default function PaywallSequenceScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { state, setTrialPlan, setReminderEnabled } = useOnboarding();
    const { currentOffering } = useRevenueCat();

    const [stage, setStage] = useState(1);
    const [selectedPlan, setSelectedPlan] = useState<"free_7day" | "trial_30day_199" | "monthly_499" | "lifetime_9999">(state.trialPlan);
    const [reminderToggle, setReminderToggle] = useState<boolean>(state.reminderEnabled);
    const [purchasing, setPurchasing] = useState(false);
    const [showAllPlansModal, setShowAllPlansModal] = useState(false);

    const reminderDate = new Date();
    reminderDate.setDate(reminderDate.getDate() + 5);
    const formattedDateStr = reminderDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });

    // Skip directly into app without purchasing or creating account
    // X button: skip paywall and go to create-account / login screen
    const handleSkipToApp = () => {
        setTrialPlan(selectedPlan as any);
        setReminderEnabled(reminderToggle);
        router.push("/onboarding/create-account");
    };

    // Trigger Android / iOS Store purchasing via RevenueCat
    const handlePurchase = async () => {
        setTrialPlan(selectedPlan as any);
        setReminderEnabled(reminderToggle);

        try {
            setPurchasing(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            const Constants = require("expo-constants").default;
            if (Constants.appOwnership === "expo") {
                // Expo Go Sandbox: Simulate store purchase dialog
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                alert("Store purchase simulated in Expo Go. In production this opens the Google Play / App Store purchase dialog.");
                router.push("/onboarding/create-account");
                return;
            }

            const packages = currentOffering?.availablePackages || [];
            const targetPkg = packages.find((p) => {
                if (selectedPlan === "free_7day") {
                    return p.packageType === "ANNUAL" || p.identifier === "$rc_annual";
                }
                if (selectedPlan === "trial_30day_199") {
                    return (
                        p.identifier === "$rc_30day_199" ||
                        p.identifier.includes("30day") ||
                        p.identifier.includes("199")
                    );
                }
                return p.packageType === "MONTHLY" || p.identifier === "$rc_monthly";
            }) || packages.find(p => selectedPlan === "trial_30day_199" ? (p.packageType === "ANNUAL" || p.identifier === "$rc_annual") : true) || packages[0];

            if (targetPkg) {
                const product = targetPkg.product as any;
                const pkgAny = targetPkg as any;
                
                const subOptions = product?.subscriptionOptions || pkgAny?.subscriptionOptions || [];
                const defaultOption = product?.defaultOption || pkgAny?.defaultOption || pkgAny?.subscriptionOption || product?.subscriptionOption;
                
                let selectedOption: any = null;

                // Find trial/intro options from subscriptionOptions array
                if (subOptions.length > 0) {
                    if (selectedPlan === "free_7day") {
                        selectedOption = subOptions.find((opt: any) => 
                            opt.freePhase != null || (opt.isBasePlan === false && !opt.introPhase)
                        );
                    } else if (selectedPlan === "trial_30day_199") {
                        selectedOption = subOptions.find((opt: any) => 
                            opt.introPhase != null || (opt.isBasePlan === false && !opt.freePhase)
                        );
                    }
                }

                // Fallback: use defaultOption if it has the right phase
                if (!selectedOption && defaultOption) {
                    if (selectedPlan === "free_7day" && defaultOption.freePhase) {
                        selectedOption = defaultOption;
                    } else if (selectedPlan === "trial_30day_199" && defaultOption.introPhase) {
                        selectedOption = defaultOption;
                    }
                }

                if (selectedOption && typeof Purchases.purchaseSubscriptionOption === "function") {
                    await Purchases.purchaseSubscriptionOption(selectedOption);
                } else {
                    await Purchases.purchasePackage(targetPkg);
                }

                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                router.push("/onboarding/create-account");
            } else {
                // No packages available from RevenueCat — stay on screen
                alert("Unable to load subscription packages. Please try again.");
            }
        } catch (e: any) {
            if (e.userCancelled) {
                // User dismissed the store purchase dialog — stay on paywall screen
                console.log("Purchase cancelled by user");
            } else {
                console.error("Store purchase error:", e);
                alert("An error occurred during purchase. Please try again.");
            }
        } finally {
            setPurchasing(false);
        }
    };

    const handleNextStage = () => {
        if (stage < 4) {
            setStage(stage + 1);
        } else {
            handlePurchase();
        }
    };

    return (
        <View style={[s.root, { paddingTop: Math.max(insets.top, 12) }]}>
            {/* Top Pro Badge Header with Close X Button */}
            <View style={s.topHeader}>
                {/* Back button or Spacer */}
                {stage > 1 ? (
                    <Pressable onPress={() => setStage(stage - 1)} hitSlop={12} style={s.topNavBtn}>
                        <Ionicons name="chevron-back" size={22} color="#4B5563" />
                    </Pressable>
                ) : (
                    <View style={{ width: 32 }} />
                )}

                <View style={s.topHeaderTitleRow}>
                    <Image
                        source={require("../../assets/icon.png")}
                        style={s.topAppHeaderIcon}
                        resizeMode="cover"
                    />
                    <Text style={s.proBadgeText}>SnapRecipes Pro</Text>
                </View>

                {/* Top Right Close X Button to Skip directly into the app */}
                <Pressable onPress={handleSkipToApp} hitSlop={12} style={s.topNavBtn}>
                    <Ionicons name="close" size={24} color="#6B7280" />
                </Pressable>
            </View>

            {/* STAGE 1: TRIAL TEASER WITH CONFETTI & GOLD PASS */}
            {stage === 1 && (
                <View style={s.stageBody}>
                    <Animated.View entering={FadeIn.duration(600)} style={s.headerCopy}>
                        <Text style={s.subheadText}>SnapRecipes is free to use but...</Text>
                        <Text style={s.mainHeadline}>
                            We'd love you to try{"\n"}
                            <Text style={{ color: "#FF6B35" }}>
                                the full experience for 7 days for free!
                            </Text>
                        </Text>
                    </Animated.View>

                    <View style={s.artStage}>
                        <GoldPassTicket />
                    </View>

                    <Animated.View entering={SlideInDown.delay(400)} style={s.bottomCtaWrap}>
                        <Pressable onPress={handleNextStage} style={s.primaryButton}>
                            <Text style={s.primaryButtonText}>Try for $0.00</Text>
                        </Pressable>
                    </Animated.View>
                </View>
            )}

            {/* STAGE 2: BENEFITS COMPARISON TABLE (Matching High-Converting Stats & ReciMe Parity) */}
            {stage === 2 && (
                <View style={s.stageBody}>
                    <Animated.View entering={FadeIn.duration(600)} style={s.headerCopy}>
                        <Text style={s.mainHeadline}>
                            <Text style={{ color: "#FF6B35" }}>94% of members</Text> reported{"\n"}saving time & staying organized
                        </Text>
                    </Animated.View>

                    <Animated.View entering={ZoomIn.delay(200)} style={s.tableStage}>
                        <View style={s.tableCardUnified}>
                            {/* Absolute Soft Orange Pillar Highlight in Background on Right */}
                            <View style={s.proPillarBackground} />

                            {/* Table Header Row */}
                            <View style={s.tableHeaderRowUnified}>
                                <Text style={s.colHeaderFeature}>FEATURE</Text>
                                <Text style={s.colHeaderFree}>Free</Text>
                                <View style={s.colHeaderProPill}>
                                    <Ionicons name="ribbon" size={16} color="#FF6B35" />
                                </View>
                            </View>

                            {/* Unified Row Items (100% Mathematically Locked Baselines) */}
                            {[
                                { name: "Recipe imports", free: "5 / wk", pro: "Unlimited", isText: true },
                                { name: "Recipe nutrition calculator", free: "—", pro: "✓" },
                                { name: "Create shopping lists", free: "—", pro: "✓" },
                                { name: "AI-powered cooking assistant", free: "—", pro: "✓" },
                                { name: "Convert measurements", free: "—", pro: "✓" },
                                { name: "Step-by-step cooking mode", free: "—", pro: "✓" },
                                { name: "Print & export recipes", free: "—", pro: "✓" },
                            ].map((row, idx, arr) => (
                                <View
                                    key={idx}
                                    style={[
                                        s.tableRowUnified,
                                        idx < arr.length - 1 && s.tableRowDashedBorder,
                                    ]}
                                >
                                    <Text style={s.rowNameText}>{row.name}</Text>
                                    <Text style={s.rowFreeValueText}>{row.free}</Text>
                                    <View style={s.rowProCellWrap}>
                                        <Text style={[s.rowProCheckText, row.isText && s.rowProUnlimitedText]}>
                                            {row.pro}
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </Animated.View>

                    <Animated.View entering={SlideInDown.delay(300)} style={s.bottomCtaWrap}>
                        <Pressable onPress={handleNextStage} style={s.primaryButton}>
                            <Text style={s.primaryButtonText}>Start my free week</Text>
                        </Pressable>
                    </Animated.View>
                </View>
            )}

            {/* STAGE 3: REALISTIC iOS PUSH NOTIFICATION REMINDER */}
            {stage === 3 && (
                <View style={s.stageBody}>
                    <Animated.View entering={FadeIn.duration(600)} style={s.headerCopy}>
                        <Text style={s.mainHeadline}>
                            We'll remind you{"\n"}
                            <Text style={{ color: "#FF6B35" }}>2 days</Text> before your trial ends
                        </Text>
                        <Text style={s.reminderSubhead}>
                            You'll get a notification on <Text style={{ fontFamily: "Inter_700Bold" }}>{formattedDateStr}</Text>
                        </Text>
                    </Animated.View>

                    {/* Realistic iOS Push Notification Card Stage */}
                    <View style={s.artStage}>
                        <Animated.View entering={ZoomIn.delay(200)} style={s.iosNotificationCard}>
                            {/* Header: App Badge & Title */}
                            <View style={s.iosNotifHeader}>
                                <Image
                                    source={require("../../assets/icon.png")}
                                    style={s.iosAppIconImage}
                                    resizeMode="cover"
                                />
                                <Text style={s.iosAppName}>SNAPRECIPES</Text>
                                <Text style={s.iosNotifTime}>5 days away</Text>
                            </View>

                            {/* Main Push Content */}
                            <View style={s.iosNotifBody}>
                                <Text style={s.iosNotifTitle}>Free Trial Reminder 🔔</Text>
                                <Text style={s.iosNotifText}>
                                    Your 7-day free trial will end on {formattedDateStr}. Cancel anytime before then in Settings with no charge.
                                </Text>
                            </View>
                        </Animated.View>
                    </View>

                    <Animated.View entering={SlideInDown.delay(300)} style={s.bottomCtaWrap}>
                        <Text style={s.guaranteeFootnote}>Easy to cancel, no penalties or fees</Text>
                        <Pressable onPress={handleNextStage} style={s.primaryButton}>
                            <Text style={s.primaryButtonText}>Start my free week</Text>
                        </Pressable>
                    </Animated.View>
                </View>
            )}

            {/* STAGE 4: MAIN DUAL PAYWALL SELECTOR */}
            {stage === 4 && (
                <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scrollBody} showsVerticalScrollIndicator={false}>
                    {/* Food Photo Collage Hero */}
                    <Animated.View entering={FadeIn.duration(500)} style={s.foodCollageHero}>
                        <FloatingShape delay={0} duration={3000} translateYDist={8} rotateDeg={-8} style={[s.foodTile, { top: -8, left: 4 }]}>
                            <View style={[s.foodTileInner, { backgroundColor: "#FEF3C7" }]}>
                                <Text style={{ fontSize: 36 }}>🍰</Text>
                            </View>
                        </FloatingShape>
                        <FloatingShape delay={200} duration={3400} translateYDist={10} rotateDeg={6} style={[s.foodTile, { top: 30, left: 80 }]}>
                            <View style={[s.foodTileInner, { backgroundColor: "#DCFCE7" }]}>
                                <Text style={{ fontSize: 36 }}>🥗</Text>
                            </View>
                        </FloatingShape>
                        <FloatingShape delay={100} duration={2800} translateYDist={6} rotateDeg={-5} style={[s.foodTile, { top: -12, right: 80 }]}>
                            <View style={[s.foodTileInner, { backgroundColor: "#FEE2E2" }]}>
                                <Text style={{ fontSize: 36 }}>🍝</Text>
                            </View>
                        </FloatingShape>
                        <FloatingShape delay={300} duration={3200} translateYDist={9} rotateDeg={7} style={[s.foodTile, { top: 24, right: 4 }]}>
                            <View style={[s.foodTileInner, { backgroundColor: "#E0E7FF" }]}>
                                <Text style={{ fontSize: 36 }}>🌮</Text>
                            </View>
                        </FloatingShape>

                        {/* Center tile slightly lower */}
                        <FloatingShape delay={150} duration={3000} translateYDist={7} rotateDeg={0} style={[s.foodTile, { top: 60, left: SCREEN_WIDTH / 2 - 52 }]}>
                            <View style={[s.foodTileInner, { backgroundColor: "#FFF7ED" }]}>
                                <Text style={{ fontSize: 36 }}>🍲</Text>
                            </View>
                        </FloatingShape>

                        {/* Category Tag Badges */}
                        <View style={[s.foodCategoryTag, { bottom: 20, left: 12 }]}>
                            <Text style={s.foodCategoryTagText}>🥬 Healthy</Text>
                        </View>
                        <View style={[s.foodCategoryTag, { top: 8, right: 12, backgroundColor: "#FEF3C7" }]}>
                            <Text style={[s.foodCategoryTagText, { color: "#92400E" }]}>💪 High Protein</Text>
                        </View>
                    </Animated.View>

                    {/* Two-Tone Headline */}
                    <Animated.View entering={FadeIn.delay(200).duration(600)} style={{ alignItems: "center", marginBottom: 20 }}>
                        <Text style={s.s4HeadlineBlack}>Choose your</Text>
                        <Text style={s.s4HeadlineAccent}>trial experience</Text>
                    </Animated.View>

                    {/* Plan Cards */}
                    <Animated.View entering={SlideInDown.delay(300)} style={{ gap: 10, marginBottom: 16 }}>
                        <Pressable
                            onPress={() => {
                                setSelectedPlan("free_7day");
                                setPurchasing(false);
                            }}
                            style={[s.s4PlanCard, selectedPlan === "free_7day" ? s.s4PlanCardSelected : s.s4PlanCardUnselected]}
                        >
                            <View style={{ flex: 1 }}>
                                <Text style={s.s4PlanTag}>FREE</Text>
                                <Text style={s.s4PlanTitle}>7 Day Trial</Text>
                            </View>
                            <View style={[s.s4RadioCircle, selectedPlan === "free_7day" && s.s4RadioCircleActive]}>
                                {selectedPlan === "free_7day" && (
                                    <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                                )}
                            </View>
                        </Pressable>

                        <Pressable
                            onPress={() => {
                                setSelectedPlan("trial_30day_199");
                                setPurchasing(false);
                            }}
                            style={[s.s4PlanCard, selectedPlan === "trial_30day_199" ? s.s4PlanCardSelected : s.s4PlanCardUnselected]}
                        >
                            <View style={{ flex: 1 }}>
                                <Text style={s.s4PlanTag}>$0.99</Text>
                                <Text style={s.s4PlanTitle}>30 Day Trial</Text>
                            </View>
                            <View style={[s.s4RadioCircle, selectedPlan === "trial_30day_199" && s.s4RadioCircleActive]}>
                                {selectedPlan === "trial_30day_199" && (
                                    <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                                )}
                            </View>
                        </Pressable>
                    </Animated.View>

                    {/* Reminder Toggle */}
                    <Animated.View entering={FadeIn.delay(400)} style={s.s4ToggleBox}>
                        <Text style={s.s4ToggleText}>Remind me before my trial ends</Text>
                        <Switch
                            value={reminderToggle}
                            onValueChange={setReminderToggle}
                            trackColor={{ false: "#D1D5DB", true: "#FF6B35" }}
                            thumbColor="#FFFFFF"
                        />
                    </Animated.View>

                    {/* View All Plans (Interactive Modal Launcher) */}
                    <Animated.View entering={FadeIn.delay(450)} style={{ alignItems: "center", marginBottom: 18 }}>
                        <Pressable onPress={() => setShowAllPlansModal(true)} hitSlop={12}>
                            <Text style={s.s4ViewAllPlans}>View All Plans</Text>
                        </Pressable>
                    </Animated.View>

                    {/* Social Proof Section */}
                    <Animated.View entering={FadeIn.delay(500)} style={s.s4SocialProofSection}>
                        <View style={s.s4ProofItem}>
                            <Text style={s.s4ProofBigNumber}>10K+</Text>
                            <Text style={s.s4ProofLabel}>Happy Cooks</Text>
                            <Text style={{ fontSize: 14 }}>🍳⭐</Text>
                        </View>

                        <View style={s.s4ProofDivider} />

                        <View style={s.s4ProofItem}>
                            <Text style={s.s4ProofRating}>4.9 STAR RATING</Text>
                            <Text style={{ fontSize: 16 }}>⭐⭐⭐⭐⭐</Text>
                        </View>

                        <View style={s.s4ProofDivider} />

                        <View style={s.s4ProofItem}>
                            <Text style={s.s4ProofLabel}>Made with ❤️</Text>
                        </View>
                    </Animated.View>

                    {/* Bottom CTA Area */}
                    <Animated.View entering={SlideInDown.delay(600)} style={s.s4BottomCTA}>
                        <View style={s.s4NoPmtRow}>
                            <Ionicons name="checkmark-circle" size={18} color="#4B5563" />
                            <Text style={s.s4NoPmtText}>No Payment Now</Text>
                        </View>

                        <Pressable onPress={handleNextStage} disabled={purchasing} style={[s.primaryButton, purchasing && { opacity: 0.7 }]}>
                            {purchasing ? (
                                <ActivityIndicator color="#FFFFFF" size="small" />
                            ) : (
                                <Text style={s.primaryButtonText}>
                                    {selectedPlan === "free_7day"
                                        ? "Redeem 7 days for USD 0.00"
                                        : selectedPlan === "trial_30day_199"
                                        ? "Start 30 day trial for $0.99"
                                        : "Subscribe for $2.99 / mo"}
                                </Text>
                            )}
                        </Pressable>

                        <Text style={s.s4FinePrint}>
                            {selectedPlan === "free_7day"
                                ? "7 days free, then $19.99 (year).\nCancel anytime."
                                : selectedPlan === "trial_30day_199"
                                ? "30 days for $0.99, then $19.99 (year).\nCancel anytime."
                                : "$2.99 billed monthly. Cancel anytime."}
                        </Text>

                        <View style={{ flexDirection: "row", gap: 12, marginTop: 4 }}>
                            <Pressable onPress={() => Linking.openURL("https://snaprecipes.xyz/terms.html").catch(() => {})}>
                                <Text style={{ fontFamily: "Inter_500Medium", fontSize: 11, color: "#6B7280", textDecorationLine: "underline" }}>Terms of Service</Text>
                            </Pressable>
                            <Text style={{ fontSize: 11, color: "#9CA3AF" }}>•</Text>
                            <Pressable onPress={() => Linking.openURL("https://snaprecipes.xyz/privacy.html").catch(() => {})}>
                                <Text style={{ fontFamily: "Inter_500Medium", fontSize: 11, color: "#6B7280", textDecorationLine: "underline" }}>Privacy Policy</Text>
                            </Pressable>
                        </View>
                    </Animated.View>
                </ScrollView>
            )}

            {/* All Membership Plans Bottom Sheet Modal */}
            <Modal
                visible={showAllPlansModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowAllPlansModal(false)}
            >
                <View style={s.modalOverlay}>
                    <Pressable style={s.modalBackdrop} onPress={() => setShowAllPlansModal(false)} />
                    <Animated.View entering={SlideInDown.duration(400)} style={s.modalContent}>
                        <View style={s.modalHeader}>
                            <Text style={s.modalTitle}>All Membership Plans</Text>
                            <Pressable onPress={() => setShowAllPlansModal(false)} hitSlop={16}>
                                <Ionicons name="close-circle" size={26} color="#9CA3AF" />
                            </Pressable>
                        </View>

                        <ScrollView contentContainerStyle={{ gap: 12, paddingVertical: 12 }} showsVerticalScrollIndicator={false}>
                            {[
                                {
                                    id: "free_7day",
                                    badge: "BEST VALUE — SAVE 44%",
                                    badgeBg: "#DCFCE7",
                                    badgeColor: "#166534",
                                    title: "7-Day Free Trial",
                                    subtitle: "7 days free, then $19.99/year ($1.66/mo). Cancel anytime.",
                                    priceTag: "$0.00 TODAY",
                                },
                                {
                                    id: "trial_30day_199",
                                    badge: "EXTENDED TRIAL",
                                    badgeBg: "#FFEDD5",
                                    badgeColor: "#9A3412",
                                    title: "30-Day VIP Trial",
                                    subtitle: "$0.99 today for 30 full days, then $19.99/year.",
                                    priceTag: "$0.99 TODAY",
                                },
                                {
                                    id: "monthly_299",
                                    badge: "FLEXIBLE MONTHLY",
                                    badgeBg: "#F3F4F6",
                                    badgeColor: "#374151",
                                    title: "Monthly Pro Pass",
                                    subtitle: "$2.99 billed monthly. Full access, cancel anytime.",
                                    priceTag: "$2.99 / MO",
                                },
                            ].map((plan) => {
                                const isSelected = selectedPlan === plan.id;
                                return (
                                    <Pressable
                                        key={plan.id}
                                        onPress={() => {
                                            setSelectedPlan(plan.id as any);
                                            setShowAllPlansModal(false);
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        }}
                                        style={[s.modalPlanCard, isSelected && s.modalPlanCardSelected]}
                                    >
                                        <View style={{ flex: 1 }}>
                                            <View style={[s.modalBadge, { backgroundColor: plan.badgeBg }]}>
                                                <Text style={[s.modalBadgeText, { color: plan.badgeColor }]}>{plan.badge}</Text>
                                            </View>
                                            <Text style={s.modalPlanTitle}>{plan.title}</Text>
                                            <Text style={s.modalPlanSubtitle}>{plan.subtitle}</Text>
                                        </View>
                                        <View style={s.modalPriceWrap}>
                                            <Text style={s.modalPriceTag}>{plan.priceTag}</Text>
                                            <View style={[s.s4RadioCircle, isSelected && s.s4RadioCircleActive, { marginTop: 6 }]}>
                                                {isSelected && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                                            </View>
                                        </View>
                                    </Pressable>
                                );
                            })}
                        </ScrollView>

                        <Pressable
                            onPress={() => {
                                setShowAllPlansModal(false);
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            }}
                            style={s.primaryButton}
                        >
                            <Text style={s.primaryButtonText}>Select Plan</Text>
                        </Pressable>
                    </Animated.View>
                </View>
            </Modal>
        </View>
    );
}

const s = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: "#FAF7F2",
        justifyContent: "space-between",
    },
    topHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    topHeaderTitleRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    topNavBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#F3F4F6",
        alignItems: "center",
        justifyContent: "center",
    },
    topAppHeaderIcon: {
        width: 30,
        height: 30,
        borderRadius: 8,
    },
    proBadgeText: {
        fontFamily: "Inter_700Bold",
        fontSize: 18,
        color: "#FF6B35",
    },
    stageBody: {
        flex: 1,
        paddingHorizontal: 24,
        paddingBottom: 24,
        justifyContent: "space-between",
        alignItems: "center",
    },
    headerCopy: {
        alignItems: "center",
        marginTop: 8,
        gap: 6,
    },
    subheadText: {
        fontFamily: "Inter_500Medium",
        fontSize: 15,
        color: "#6B7280",
        textAlign: "center",
    },
    mainHeadline: {
        fontFamily: "Inter_700Bold",
        fontSize: 26,
        color: "#1F2937",
        textAlign: "center",
        lineHeight: 34,
    },
    mainHeadlineSmall: {
        fontFamily: "Inter_700Bold",
        fontSize: 24,
        color: "#1F2937",
        textAlign: "center",
        lineHeight: 32,
    },
    reminderSubhead: {
        fontFamily: "Inter_600SemiBold",
        fontSize: 16,
        color: "#FF6B35",
        textAlign: "center",
        marginTop: 4,
    },

    artStage: {
        flex: 1,
        width: "100%",
        alignItems: "center",
        justifyContent: "center",
    },

    /* Confetti Burst */
    confettiCenter: {
        position: "absolute",
        top: "50%",
        left: "50%",
        alignItems: "center",
        justifyContent: "center",
    },

    /* Unique Golden VIP Pass Ticket Styles */
    ticketStage: {
        width: Math.min(SCREEN_WIDTH - 32, 330),
        height: 250,
        position: "relative",
        alignItems: "center",
        justifyContent: "center",
    },
    ticketGlowAura: {
        position: "absolute",
        width: 240,
        height: 200,
        borderRadius: 100,
        backgroundColor: "rgba(245, 158, 11, 0.14)",
    },
    goldTicketCard: {
        width: Math.min(SCREEN_WIDTH - 40, 310),
        backgroundColor: "#1C130E",
        borderRadius: 24,
        padding: 18,
        borderWidth: 2,
        borderColor: "#F59E0B",
        shadowColor: "#F59E0B",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
        position: "relative",
        overflow: "hidden",
    },
    ticketHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 14,
    },
    ticketHeaderBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FEF3C7",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 5,
    },
    ticketHeaderBadgeText: {
        fontFamily: "Inter_700Bold",
        fontSize: 10,
        color: "#78350F",
        letterSpacing: 0.5,
    },
    ticketPriceTag: {
        fontFamily: "Inter_700Bold",
        fontSize: 13,
        color: "#FBBF24",
    },
    ticketBody: {
        alignItems: "center",
        marginVertical: 4,
    },
    ticketTitle: {
        fontFamily: "Inter_700Bold",
        fontSize: 18,
        color: "#FFFFFF",
        letterSpacing: 0.8,
        textAlign: "center",
    },
    ticketSubtitle: {
        fontFamily: "Inter_500Medium",
        fontSize: 11,
        color: "#FCD34D",
        marginTop: 4,
        textAlign: "center",
    },
    ticketDividerRow: {
        flexDirection: "row",
        alignItems: "center",
        marginVertical: 14,
        position: "relative",
    },
    ticketDashedLine: {
        flex: 1,
        height: 1,
        borderWidth: 1,
        borderColor: "#78350F",
        borderStyle: "dashed",
    },
    ticketNotch: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: "#FAF7F2",
        position: "absolute",
        top: -10,
        zIndex: 30,
    },
    ticketNotchLeft: {
        left: -28,
    },
    ticketNotchRight: {
        right: -28,
    },
    ticketFooter: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingTop: 4,
    },
    ticketFeatureItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    ticketFeatureText: {
        fontFamily: "Inter_500Medium",
        fontSize: 10,
        color: "#E5E7EB",
    },

    /* Stage 2 Comparison Table Styles (Unified Baselines) */
    tableStage: {
        flex: 1,
        width: "100%",
        justifyContent: "center",
        marginVertical: 12,
    },
    tableCardUnified: {
        backgroundColor: "#FFFFFF",
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 4,
        position: "relative",
    },
    proPillarBackground: {
        position: "absolute",
        top: 10,
        bottom: 10,
        right: 10,
        width: 82,
        backgroundColor: "#FFEDD5",
        borderRadius: 18,
        borderWidth: 1.5,
        borderColor: "#FED7AA",
        zIndex: 1,
    },
    tableHeaderRowUnified: {
        flexDirection: "row",
        alignItems: "center",
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderColor: "#E5E7EB",
        borderStyle: "dashed",
        marginBottom: 2,
        zIndex: 2,
    },
    colHeaderFeature: {
        fontFamily: "Inter_700Bold",
        fontSize: 11,
        color: "#9CA3AF",
        flex: 1,
        letterSpacing: 0.5,
    },
    colHeaderFree: {
        fontFamily: "Inter_700Bold",
        fontSize: 12,
        color: "#6B7280",
        width: 54,
        textAlign: "center",
    },
    colHeaderProPill: {
        width: 70,
        alignItems: "center",
        justifyContent: "center",
    },
    tableRowUnified: {
        flexDirection: "row",
        alignItems: "center",
        height: 38,
        zIndex: 2,
    },
    tableRowDashedBorder: {
        borderBottomWidth: 1,
        borderColor: "#F3F4F6",
        borderStyle: "dashed",
    },
    rowNameText: {
        fontFamily: "Inter_500Medium",
        fontSize: 13,
        color: "#1F2937",
        flex: 1,
        paddingRight: 4,
    },
    rowFreeValueText: {
        fontFamily: "Inter_500Medium",
        fontSize: 12,
        color: "#9CA3AF",
        width: 54,
        textAlign: "center",
    },
    rowProCellWrap: {
        width: 70,
        alignItems: "center",
        justifyContent: "center",
    },
    rowProCheckText: {
        fontFamily: "Inter_700Bold",
        fontSize: 16,
        color: "#FF6B35",
        textAlign: "center",
    },
    rowProUnlimitedText: {
        fontFamily: "Inter_700Bold",
        fontSize: 11,
        color: "#FF6B35",
        textAlign: "center",
    },

    /* Stage 3 iOS Push Notification Banner */
    iosNotificationCard: {
        width: Math.min(SCREEN_WIDTH - 40, 330),
        backgroundColor: "#FFFFFF",
        borderRadius: 22,
        padding: 16,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
        elevation: 6,
        gap: 10,
    },
    iosNotifHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    iosAppIconImage: {
        width: 28,
        height: 28,
        borderRadius: 7,
    },
    iosAppName: {
        fontFamily: "Inter_700Bold",
        fontSize: 11,
        color: "#4B5563",
        letterSpacing: 0.5,
        flex: 1,
    },
    iosNotifTime: {
        fontFamily: "Inter_500Medium",
        fontSize: 11,
        color: "#9CA3AF",
    },
    iosNotifBody: {
        gap: 4,
    },
    iosNotifTitle: {
        fontFamily: "Inter_700Bold",
        fontSize: 15,
        color: "#1F2937",
    },
    iosNotifText: {
        fontFamily: "Inter_400Regular",
        fontSize: 13,
        color: "#4B5563",
        lineHeight: 18,
    },

    guaranteeFootnote: {
        fontFamily: "Inter_500Medium",
        fontSize: 12,
        color: "#6B7280",
        textAlign: "center",
        marginBottom: 8,
    },

    /* Stage 4 Styles — Premium Plan Selector */
    scrollBody: {
        paddingHorizontal: 24,
        paddingBottom: 40,
    },
    foodCollageHero: {
        width: "100%",
        height: 130,
        position: "relative",
        marginBottom: 10,
    },
    foodTile: {
        position: "absolute",
    },
    foodTileInner: {
        width: 72,
        height: 72,
        borderRadius: 18,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.10,
        shadowRadius: 8,
        elevation: 4,
    },
    foodCategoryTag: {
        position: "absolute",
        backgroundColor: "#DCFCE7",
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10,
    },
    foodCategoryTagText: {
        fontFamily: "Inter_700Bold",
        fontSize: 11,
        color: "#166534",
    },
    s4HeadlineBlack: {
        fontFamily: "Inter_700Bold",
        fontSize: 26,
        color: "#1F2937",
        textAlign: "center",
        lineHeight: 32,
    },
    s4HeadlineAccent: {
        fontFamily: "Inter_700Bold",
        fontSize: 26,
        color: "#FF6B35",
        textAlign: "center",
        lineHeight: 32,
    },
    s4PlanCard: {
        width: "100%",
        paddingVertical: 18,
        paddingHorizontal: 20,
        borderRadius: 16,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderWidth: 2,
        backgroundColor: "#FFFFFF",
    },
    s4PlanCardSelected: {
        borderColor: "#FF6B35",
        shadowColor: "#FF6B35",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 4,
    },
    s4PlanCardUnselected: {
        borderColor: "#E5E7EB",
    },
    s4PlanTag: {
        fontFamily: "Inter_700Bold",
        fontSize: 14,
        color: "#1F2937",
    },
    s4PlanTitle: {
        fontFamily: "Inter_600SemiBold",
        fontSize: 18,
        color: "#4B5563",
        marginTop: 2,
    },
    s4RadioCircle: {
        width: 30,
        height: 30,
        borderRadius: 15,
        borderWidth: 2,
        borderColor: "#D1D5DB",
        backgroundColor: "#FFFFFF",
        alignItems: "center",
        justifyContent: "center",
    },
    s4RadioCircleActive: {
        borderColor: "#FF6B35",
        backgroundColor: "#FF6B35",
    },
    s4ToggleBox: {
        backgroundColor: "#FFEDD5",
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 16,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderWidth: 1,
        borderColor: "#FED7AA",
        marginBottom: 14,
    },
    s4ToggleText: {
        fontFamily: "Inter_600SemiBold",
        fontSize: 14,
        color: "#1F2937",
    },
    s4ViewAllPlans: {
        fontFamily: "Inter_600SemiBold",
        fontSize: 14,
        color: "#6B7280",
        textDecorationLine: "underline",
    },
    s4SocialProofSection: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-evenly",
        paddingVertical: 16,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: "#E5E7EB",
        marginBottom: 20,
    },
    s4ProofItem: {
        alignItems: "center",
        gap: 2,
    },
    s4ProofBigNumber: {
        fontFamily: "Inter_700Bold",
        fontSize: 20,
        color: "#FF6B35",
    },
    s4ProofLabel: {
        fontFamily: "Inter_500Medium",
        fontSize: 11,
        color: "#6B7280",
    },
    s4ProofRating: {
        fontFamily: "Inter_700Bold",
        fontSize: 12,
        color: "#1F2937",
        letterSpacing: 0.3,
    },
    s4ProofDivider: {
        width: 1,
        height: 36,
        backgroundColor: "#E5E7EB",
    },
    s4BottomCTA: {
        gap: 10,
        alignItems: "center",
    },
    s4NoPmtRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    s4NoPmtText: {
        fontFamily: "Inter_600SemiBold",
        fontSize: 13,
        color: "#4B5563",
    },
    s4FinePrint: {
        fontFamily: "Inter_400Regular",
        fontSize: 11,
        color: "#9CA3AF",
        textAlign: "center",
        lineHeight: 16,
    },

    /* Global Buttons */
    bottomCtaWrap: {
        width: "100%",
    },
    primaryButton: {
        width: "100%",
        backgroundColor: "#FF6B35",
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: "center",
        shadowColor: "#FF6B35",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 4,
    },
    primaryButtonText: {
        color: "#FFFFFF",
        fontFamily: "Inter_700Bold",
        fontSize: 18,
    },

    /* Modal Styles */
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.45)",
        justifyContent: "flex-end",
    },
    modalBackdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    modalContent: {
        backgroundColor: "#FFFFFF",
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 36,
        maxHeight: "80%",
        gap: 12,
    },
    modalHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingBottom: 6,
    },
    modalTitle: {
        fontFamily: "Inter_700Bold",
        fontSize: 20,
        color: "#1F2937",
    },
    modalPlanCard: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 16,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: "#E5E7EB",
        backgroundColor: "#FAF7F2",
    },
    modalPlanCardSelected: {
        borderColor: "#FF6B35",
        backgroundColor: "#FFF7ED",
    },
    modalBadge: {
        alignSelf: "flex-start",
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        marginBottom: 4,
    },
    modalBadgeText: {
        fontFamily: "Inter_700Bold",
        fontSize: 10,
    },
    modalPlanTitle: {
        fontFamily: "Inter_700Bold",
        fontSize: 16,
        color: "#1F2937",
    },
    modalPlanSubtitle: {
        fontFamily: "Inter_400Regular",
        fontSize: 12,
        color: "#6B7280",
        marginTop: 2,
    },
    modalPriceWrap: {
        alignItems: "flex-end",
        paddingLeft: 12,
    },
    modalPriceTag: {
        fontFamily: "Inter_700Bold",
        fontSize: 13,
        color: "#FF6B35",
    },
});
