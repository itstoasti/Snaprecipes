import React from "react";
import {
    View,
    Text,
    Pressable,
    Platform,
    Image,
    ScrollView,
    Linking,
    Modal,
    ActivityIndicator,
    StyleSheet,
    Dimensions,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, SlideInDown, ZoomIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Purchases, { PurchasesPackage } from "react-native-purchases";
import { useRevenueCat } from "@/hooks/useRevenueCat";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Svg, { Path } from "react-native-svg";
import { trackEvent } from "@/lib/analytics";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Fallback packages for Expo Go / local testing where RevenueCat native SDK is unconfigured
const MOCK_PACKAGES: PurchasesPackage[] = [
    {
        identifier: "$rc_annual",
        packageType: "ANNUAL" as any,
        product: {
            identifier: "rc_annual_product",
            description: "7 days free, then $19.99/year",
            title: "Annual Pro (7-Day Trial)",
            price: 19.99,
            priceString: "$19.99",
            currencyCode: "USD",
            introPrice: {
                price: 0,
                priceString: "$0.00",
                period: "P7D",
                periodUnit: "DAY",
                periodNumberOfUnits: 7,
                cycles: 1,
            } as any,
        } as any,
    } as any,
    {
        identifier: "$rc_30day_199",
        packageType: "CUSTOM" as any,
        product: {
            identifier: "rc_30day_099_product",
            description: "$0.99 for 30 days, then $19.99/year",
            title: "30-Day VIP Trial",
            price: 0.99,
            priceString: "$0.99",
            currencyCode: "USD",
            introPrice: {
                price: 0.99,
                priceString: "$0.99",
                period: "P1M",
                periodUnit: "MONTH",
                periodNumberOfUnits: 1,
                cycles: 1,
            } as any,
        } as any,
    } as any,
    {
        identifier: "$rc_monthly",
        packageType: "MONTHLY" as any,
        product: {
            identifier: "rc_monthly_product",
            description: "Flexible monthly plan",
            title: "Monthly Pro",
            price: 2.99,
            priceString: "$2.99",
            currencyCode: "USD",
            introPrice: null,
        } as any,
    } as any,
];

// Laurel Wreath SVG Component matching social proof design
function LaurelWreath() {
    return (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            {/* Left Laurel Branch */}
            <Svg width="22" height="38" viewBox="0 0 24 40" fill="none">
                <Path d="M20 36C14 32 8 24 8 12C8 8 10 4 12 2" stroke="#18181B" strokeWidth="2.2" strokeLinecap="round" />
                <Path d="M18 34C13 32 10 27 12 24C15 26 17 30 18 34Z" fill="#18181B" />
                <Path d="M14 26C9 24 7 18 10 16C12 18 14 22 14 26Z" fill="#18181B" />
                <Path d="M11 18C7 15 6 9 9 7C11 9 12 14 11 18Z" fill="#18181B" />
                <Path d="M10 10C7 7 7 2 10 1C11 3 11 7 10 10Z" fill="#18181B" />
            </Svg>

            <View style={{ alignItems: "center" }}>
                <Text style={{ fontFamily: "Inter_700Bold", fontSize: 24, color: "#FF6B35", lineHeight: 26 }}>
                    10K+
                </Text>
                <Text style={{ fontFamily: "Inter_700Bold", fontSize: 10, color: "#18181B", letterSpacing: 0.5, marginTop: 1 }}>
                    Happy Cooks
                </Text>
            </View>

            {/* Right Laurel Branch (Mirrored) */}
            <Svg width="22" height="38" viewBox="0 0 24 40" fill="none">
                <Path d="M4 36C10 32 16 24 16 12C16 8 14 4 12 2" stroke="#18181B" strokeWidth="2.2" strokeLinecap="round" />
                <Path d="M6 34C11 32 14 27 12 24C9 26 7 30 6 34Z" fill="#18181B" />
                <Path d="M10 26C15 24 17 18 14 16C12 18 10 22 10 26Z" fill="#18181B" />
                <Path d="M13 18C17 15 18 9 15 7C13 9 12 14 13 18Z" fill="#18181B" />
                <Path d="M14 10C17 7 17 2 14 1C13 3 13 7 14 10Z" fill="#18181B" />
            </Svg>
        </View>
    );
}

// Google Pay / Apple Pay Badge Icon
function PayMethodBadge() {
    return (
        <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: "#E5E7EB", marginRight: 6 }}>
            {Platform.OS === "ios" ? (
                <Ionicons name="logo-apple" size={12} color="#18181B" />
            ) : (
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Text style={{ fontFamily: "Inter_700Bold", fontSize: 10, color: "#4285F4" }}>G </Text>
                    <Text style={{ fontFamily: "Inter_500Medium", fontSize: 10, color: "#5F6368" }}>Pay</Text>
                </View>
            )}
        </View>
    );
}

export default function PaywallScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { isPro, currentOffering, isReady } = useRevenueCat();
    const [loading, setLoading] = React.useState(false);
    const [selectedPkgId, setSelectedPkgId] = React.useState<string | null>(null);
    const [showOptionsModal, setShowOptionsModal] = React.useState(false);

    // Redirect to main tabs if the user is already Pro
    React.useEffect(() => {
        if (isPro) {
            router.replace("/(tabs)/");
        }
    }, [isPro]);

    // Track paywall view analytics
    React.useEffect(() => {
        trackEvent("paywall_viewed");
        if (currentOffering && typeof (Purchases as any).logPaywallPresented === "function") {
            try {
                (Purchases as any).logPaywallPresented(currentOffering);
            } catch (e) {
                // Silently ignore
            }
        }
    }, [currentOffering]);

    // Use live offerings if available, otherwise fallback to mocks
    const packages =
        currentOffering && currentOffering.availablePackages.length > 0
            ? currentOffering.availablePackages
            : MOCK_PACKAGES;

    // Set default package selection to ANNUAL
    React.useEffect(() => {
        if (packages && packages.length > 0 && !selectedPkgId) {
            const annual = packages.find((p) => p.packageType === "ANNUAL");
            setSelectedPkgId(annual ? annual.identifier : packages[0].identifier);
        }
    }, [packages]);

    const activePackage = packages.find((p) => p.identifier === selectedPkgId) || packages[0];
    const monthlyPackage = packages.find((p) => p.packageType === "MONTHLY");
    const baseMonthlyPrice = monthlyPackage ? monthlyPackage.product.price : 2.99;

    // Calculate trial end date 7 days from today
    const trialEndDateString = React.useMemo(() => {
        const d = new Date();
        d.setDate(d.getDate() + 7);
        return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    }, []);

    const handleSelectPackage = (pkgId: string) => {
        trackEvent("paywall_package_selected", { package_id: pkgId });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedPkgId(pkgId);
        setLoading(false);
    };

    const getPackageSubscriptionOption = (pkg: PurchasesPackage, isTrial: boolean) => {
        const product = pkg.product as any;
        const pkgAny = pkg as any;
        const options: any[] =
            product?.subscriptionOptions ||
            pkgAny?.subscriptionOptions ||
            (product?.defaultOption ? [product.defaultOption] : []) ||
            (pkgAny?.subscriptionOption ? [pkgAny.subscriptionOption] : []);

        if (!options || options.length === 0) {
            return null;
        }

        if (isTrial) {
            const trialOpt = options.find((opt: any) => {
                const phases = opt.pricingPhases || [];
                const hasFreePhase =
                    opt.freePhase != null ||
                    phases.some(
                        (p: any) =>
                            p.price?.amountMicros === 0 ||
                            p.price?.amountMicros === "0" ||
                            p.formattedPrice === "$0.00" ||
                            p.price?.formatted === "$0.00" ||
                            p.offerPaymentMode === "FREE_TRIAL"
                    );
                const isTrialId =
                    opt.id?.toLowerCase().includes("trial") ||
                    opt.id?.toLowerCase().includes("7day") ||
                    opt.id?.toLowerCase().includes("free");
                return hasFreePhase || (isTrialId && !opt.isBasePlan);
            });
            if (trialOpt) return trialOpt;
        }

        return product?.defaultOption || pkgAny?.defaultOption || options.find((o: any) => o.isBasePlan) || options[0];
    };

    const handlePurchase = async (targetPkg?: PurchasesPackage | any) => {
        // Ensure pkg is a valid PurchasesPackage with product property, ignoring React Native gesture event objects
        const pkg = (targetPkg && typeof targetPkg === "object" && "product" in targetPkg)
            ? (targetPkg as PurchasesPackage)
            : activePackage;

        if (!pkg || !pkg.product) {
            console.error("No valid package or product found for purchase");
            return;
        }

        try {
            setLoading(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            const Constants = require("expo-constants").default;
            if (Constants.appOwnership === "expo") {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                alert("Simulating successful premium upgrade in Expo Go! Redirecting to app...");
                router.replace("/(tabs)/");
                return;
            }

            trackEvent("purchase_initiated", { package_type: pkg.packageType, price: pkg.product.price });

            const isAnnual = pkg.packageType === "ANNUAL";
            const subOption = getPackageSubscriptionOption(pkg, isAnnual);

            if (subOption && typeof Purchases.purchaseSubscriptionOption === "function") {
                await Purchases.purchaseSubscriptionOption(subOption);
            } else {
                await Purchases.purchasePackage(pkg);
            }

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            trackEvent("purchase_completed", { package_type: pkg.packageType });
            router.replace("/(tabs)/");
        } catch (e: any) {
            if (e.userCancelled) {
                trackEvent("purchase_cancelled");
            } else {
                console.error("Purchase error", e);
                alert("An error occurred during purchase. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleRestore = async () => {
        try {
            setLoading(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

            const Constants = require("expo-constants").default;
            if (Constants.appOwnership === "expo") {
                alert("Restoring purchases is disabled in Expo Go.");
                return;
            }

            const customerInfo = await Purchases.restorePurchases();
            const activeEntitlements = customerInfo?.entitlements?.active;
            const activeKeys = activeEntitlements ? Object.keys(activeEntitlements) : [];

            if (activeKeys.length > 0) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                alert("Success! Your premium access has been restored.");
                router.replace("/(tabs)/");
            } else {
                alert("No active subscription found to restore.");
            }
        } catch (e: any) {
            console.error("Restore error", e);
            alert("Failed to restore purchases: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    // Calculate dynamic pricing copy for CTA footer
    const isAnnualSelected = activePackage?.packageType === "ANNUAL";
    const annualPrice = activePackage?.product?.price || 19.99;
    const annualPriceString = activePackage?.product?.priceString || "$19.99";
    const monthlyEqString = (annualPrice / 12).toFixed(2);

    return (
        <View style={[styles.root, { paddingTop: Math.max(insets.top, Platform.OS === "android" ? 24 : 12) }]}>
            <StatusBar style="dark" />

            {/* Top Navigation Bar: Restore on Left, Close X on Right */}
            <View style={styles.topHeader}>
                <Pressable onPress={handleRestore} disabled={loading} hitSlop={12} style={styles.restoreBtn}>
                    <Text style={styles.restoreText}>Restore</Text>
                </Pressable>

                <Pressable
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        if (router.canGoBack()) {
                            router.back();
                        } else {
                            router.replace("/(tabs)/");
                        }
                    }}
                    hitSlop={12}
                    style={styles.closeBtn}
                >
                    <Ionicons name="close" size={20} color="#18181B" />
                </Pressable>
            </View>

            {/* Scrollable Content Body */}
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{
                    paddingHorizontal: 22,
                    paddingTop: 4,
                    paddingBottom: 190, // Leave room for pinned bottom sheet
                }}
                showsVerticalScrollIndicator={false}
            >
                {/* Headline Section */}
                <Animated.View entering={FadeIn.delay(100)} style={styles.headlineContainer}>
                    <Text style={styles.headlineText}>
                        Get <Text style={{ color: "#FF6B35" }}>Unlimited Imports</Text>
                    </Text>
                    <Text style={styles.headlineText}>from Instagram, TikTok & more</Text>
                </Animated.View>

                {/* Vertical Timeline Card: "How your free trial works:" */}
                <Animated.View entering={SlideInDown.delay(200)} style={styles.timelineCard}>
                    <Text style={styles.timelineTitle}>How your free trial works:</Text>

                    <View style={styles.timelineList}>
                        {/* Connecting Line */}
                        <View style={styles.connectingLine} />

                        {/* Step 1: Today */}
                        <View style={styles.timelineStep}>
                            <View style={[styles.stepIconWrap, styles.stepIconOrange]}>
                                <Ionicons name="lock-closed" size={17} color="#FFFFFF" />
                            </View>
                            <View style={styles.stepContent}>
                                <Text style={styles.stepTitle}>Today: Unlock SnapRecipes</Text>
                                <Text style={styles.stepSubtitle}>
                                    Get instant access and start organizing your recipes.
                                </Text>
                            </View>
                        </View>

                        {/* Step 2: Day 5 */}
                        <View style={styles.timelineStep}>
                            <View style={[styles.stepIconWrap, styles.stepIconTan]}>
                                <Ionicons name="notifications-outline" size={18} color="#4A3E3D" />
                            </View>
                            <View style={styles.stepContent}>
                                <Text style={styles.stepTitle}>Day 5: Trial Reminder</Text>
                                <Text style={styles.stepSubtitle}>
                                    We'll remind you with an alert that your trial is ending.
                                </Text>
                            </View>
                        </View>

                        {/* Step 3: Day 7 */}
                        <View style={[styles.timelineStep, { marginBottom: 0 }]}>
                            <View style={[styles.stepIconWrap, styles.stepIconTan]}>
                                <Ionicons name="star-outline" size={18} color="#4A3E3D" />
                            </View>
                            <View style={styles.stepContent}>
                                <Text style={styles.stepTitle}>Day 7: Trial Ends</Text>
                                <Text style={styles.stepSubtitle}>
                                    Your subscription will start on {trialEndDateString}. Cancel anytime before.
                                </Text>
                            </View>
                        </View>
                    </View>
                </Animated.View>

                {/* Social Proof Header Section (Laurel Wreath & Star Rating) */}
                <Animated.View entering={FadeIn.delay(300)} style={styles.socialProofHeaderRow}>
                    <LaurelWreath />

                    <View style={{ alignItems: "flex-start" }}>
                        <Text style={styles.starRatingLabel}>4.8 STAR RATING</Text>
                        <View style={{ flexDirection: "row", gap: 2, marginTop: 3 }}>
                            {[1, 2, 3, 4, 5].map((i) => (
                                <Ionicons key={i} name="star" size={17} color="#FBBF24" />
                            ))}
                        </View>
                    </View>
                </Animated.View>

                {/* Horizontal Customer Reviews Carousel */}
                <Animated.View entering={SlideInDown.delay(400)} style={{ marginTop: 14, marginBottom: 8 }}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingRight: 16 }}
                    >
                        {/* Review Card 1 */}
                        <View style={styles.reviewCard}>
                            <View style={{ flexDirection: "row", gap: 2, marginBottom: 6 }}>
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <Ionicons key={i} name="star" size={14} color="#FBBF24" />
                                ))}
                            </View>
                            <Text style={styles.reviewCardTitle}>Changed my life - now I can import</Text>
                            <Text style={styles.reviewCardBody}>
                                "SnapRecipes changed how I cook. Now I save every recipe from Instagram and TikTok without missing steps!"
                            </Text>
                            <Text style={styles.reviewAuthor}>— Sarah M.</Text>
                        </View>

                        {/* Review Card 2 */}
                        <View style={styles.reviewCard}>
                            <View style={{ flexDirection: "row", gap: 2, marginBottom: 6 }}>
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <Ionicons key={i} name="star" size={14} color="#FBBF24" />
                                ))}
                            </View>
                            <Text style={styles.reviewCardTitle}>SnapRecipes effort...</Text>
                            <Text style={styles.reviewCardBody}>
                                "I used to lose link after link. Having all my imports and AI nutrition in one place is worth every penny."
                            </Text>
                            <Text style={styles.reviewAuthor}>— David K.</Text>
                        </View>

                        {/* Review Card 3 */}
                        <View style={styles.reviewCard}>
                            <View style={{ flexDirection: "row", gap: 2, marginBottom: 6 }}>
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <Ionicons key={i} name="star" size={14} color="#FBBF24" />
                                ))}
                            </View>
                            <Text style={styles.reviewCardTitle}>The best kitchen app!</Text>
                            <Text style={styles.reviewCardBody}>
                                "Smart grocery lists + instant macro tracking + unlimited imports. Upgrading was a no-brainer!"
                            </Text>
                            <Text style={styles.reviewAuthor}>— Emily R.</Text>
                        </View>
                    </ScrollView>
                </Animated.View>
            </ScrollView>

            {/* Pinned Bottom CTA Floating Sheet */}
            <Animated.View
                entering={SlideInDown.delay(250)}
                style={[
                    styles.pinnedFooterCard,
                    { paddingBottom: Math.max(insets.bottom || 0, Platform.OS === "android" ? 20 : 16) + 12 },
                ]}
            >
                {/* Guarantee Sub-badge Header */}
                <View style={styles.guaranteeRow}>
                    <Ionicons name="checkmark" size={16} color="#18181B" style={{ marginRight: 6 }} />
                    <Text style={styles.guaranteeText}>No Payment Now, Cancel Anytime</Text>
                </View>

                {/* Primary Orange Action Button */}
                <Pressable
                    onPress={() => handlePurchase(activePackage)}
                    disabled={loading}
                    style={({ pressed }) => [
                        {
                            width: "100%",
                            borderRadius: 28,
                            overflow: "hidden",
                            shadowColor: "#FF6B35",
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.35,
                            shadowRadius: 8,
                            elevation: 5,
                            marginTop: 4,
                        },
                        pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
                    ]}
                >
                    <LinearGradient
                        colors={["#FF6B35", "#E05520"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={{
                            width: "100%",
                            height: 54,
                            borderRadius: 28,
                            alignItems: "center",
                            justifyContent: "center",
                            paddingHorizontal: 20,
                        }}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFFFFF" size="small" />
                        ) : (
                            <Text style={{ fontFamily: "Inter_700Bold", fontSize: 18, color: "#FFFFFF", letterSpacing: 0.3 }}>
                                {isAnnualSelected ? "Start Your Free Week" : "Unlock Pro Access"}
                            </Text>
                        )}
                    </LinearGradient>
                </Pressable>

                {/* Pricing Subtitle with Pay Badge */}
                <View style={styles.priceSubRow}>
                    <PayMethodBadge />
                    <Text style={styles.priceSubText}>
                        {isAnnualSelected
                            ? `7 days free, then ${annualPriceString}/yr ($${monthlyEqString}/mo)`
                            : `Billed monthly at ${activePackage?.product?.priceString}/mo`}
                    </Text>
                </View>

                {/* View All Options Link */}
                <Pressable
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setShowOptionsModal(true);
                    }}
                    hitSlop={10}
                    style={styles.viewOptionsBtn}
                >
                    <Text style={styles.viewOptionsText}>View All Options</Text>
                </Pressable>
            </Animated.View>

            {/* Plan Selection Options Modal */}
            <Modal
                visible={showOptionsModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowOptionsModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <Pressable style={styles.modalBackdrop} onPress={() => setShowOptionsModal(false)} />
                    <Animated.View entering={SlideInDown.duration(350)} style={styles.modalSheetContent}>
                        <View style={styles.modalHeaderRow}>
                            <Text style={styles.modalTitle}>Choose Your Plan</Text>
                            <Pressable
                                onPress={() => setShowOptionsModal(false)}
                                hitSlop={12}
                                style={styles.modalCloseBtn}
                            >
                                <Ionicons name="close" size={20} color="#18181B" />
                            </Pressable>
                        </View>

                        <ScrollView contentContainerStyle={{ gap: 12, paddingVertical: 12 }} showsVerticalScrollIndicator={false}>
                            {packages.map((pkg) => {
                                const isSelected = selectedPkgId === pkg.identifier;
                                const isAnnual = pkg.packageType === "ANNUAL";

                                let priceText = pkg.product.priceString;
                                let monthlyEq = `$${(pkg.product.price / 12).toFixed(2)}`;
                                let discountBadge = "";

                                if (isAnnual) {
                                    const fullMonthlyCost = baseMonthlyPrice * 12;
                                    const annualCost = pkg.product.price;
                                    if (fullMonthlyCost > annualCost) {
                                        const savingsPercent = Math.round(((fullMonthlyCost - annualCost) / fullMonthlyCost) * 100);
                                        discountBadge = `SAVE ${savingsPercent}%`;
                                    }
                                }

                                return (
                                    <Pressable
                                        key={pkg.identifier}
                                        onPress={() => {
                                            handleSelectPackage(pkg.identifier);
                                            setShowOptionsModal(false);
                                        }}
                                        style={[
                                            styles.planCardOption,
                                            isSelected && styles.planCardOptionSelected,
                                        ]}
                                    >
                                        <View style={{ flex: 1 }}>
                                            {discountBadge !== "" && (
                                                <View style={styles.discountBadgeWrap}>
                                                    <Text style={styles.discountBadgeText}>{discountBadge}</Text>
                                                </View>
                                            )}

                                            <Text style={styles.planOptionTitle}>
                                                {isAnnual ? "ANNUAL PLAN" : "MONTHLY PLAN"}
                                            </Text>
                                            <Text style={styles.planOptionSub}>
                                                {isAnnual
                                                    ? `${priceText} billed yearly (${monthlyEq}/mo)`
                                                    : `${priceText} billed monthly`}
                                            </Text>
                                        </View>

                                        <View style={styles.planOptionPriceRight}>
                                            <Text style={styles.planOptionBigPrice}>
                                                {isAnnual ? monthlyEq : priceText}
                                            </Text>
                                            <Text style={styles.planOptionPerMo}>/ month</Text>
                                            <View
                                                style={[
                                                    styles.radioCircle,
                                                    isSelected && styles.radioCircleActive,
                                                ]}
                                            >
                                                {isSelected && <View style={styles.radioDot} />}
                                            </View>
                                        </View>
                                    </Pressable>
                                );
                            })}
                        </ScrollView>

                        {/* CTA Inside Modal */}
                        <Pressable
                            onPress={() => {
                                const targetPkg = activePackage;
                                setShowOptionsModal(false);
                                setTimeout(() => {
                                    handlePurchase(targetPkg);
                                }, 100);
                            }}
                            disabled={loading}
                            style={{
                                width: "100%",
                                borderRadius: 26,
                                overflow: "hidden",
                                marginTop: 8,
                            }}
                        >
                            <LinearGradient
                                colors={["#FF6B35", "#E05520"]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={{
                                    width: "100%",
                                    height: 52,
                                    borderRadius: 26,
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                <Text style={{ fontFamily: "Inter_700Bold", fontSize: 16, color: "#FFFFFF" }}>
                                    {isAnnualSelected ? "Start 7-Day Free Trial" : "Subscribe Now"}
                                </Text>
                            </LinearGradient>
                        </Pressable>

                        <Pressable onPress={handleRestore} style={{ marginTop: 10, alignSelf: "center", padding: 6 }}>
                            <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#FF6B35" }}>
                                Restore Existing Subscription
                            </Text>
                        </Pressable>

                        {/* Legal Links */}
                        <View style={styles.legalLinksRow}>
                            <Pressable onPress={() => Linking.openURL("https://snaprecipes.xyz/terms.html").catch(() => {})}>
                                <Text style={styles.legalLinkText}>Terms of Use</Text>
                            </Pressable>
                            <Text style={{ fontSize: 11, color: "#9CA3AF" }}>•</Text>
                            <Pressable onPress={() => Linking.openURL("https://snaprecipes.xyz/privacy.html").catch(() => {})}>
                                <Text style={styles.legalLinkText}>Privacy Policy</Text>
                            </Pressable>
                        </View>
                    </Animated.View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: "#FAF7F2",
    },
    topHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 22,
        paddingVertical: 10,
        zIndex: 10,
    },
    restoreBtn: {
        paddingVertical: 4,
        paddingHorizontal: 8,
    },
    restoreText: {
        fontFamily: "Inter_500Medium",
        fontSize: 14,
        color: "#6B7280",
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: "#EFEBE4",
        alignItems: "center",
        justifyContent: "center",
    },
    headlineContainer: {
        alignItems: "center",
        marginTop: 6,
        marginBottom: 20,
    },
    headlineText: {
        fontFamily: "Inter_700Bold",
        fontSize: 25,
        color: "#18181B",
        textAlign: "center",
        lineHeight: 33,
    },
    timelineCard: {
        backgroundColor: "#F4EADA",
        borderRadius: 20,
        padding: 20,
        marginBottom: 20,
    },
    timelineTitle: {
        fontFamily: "Inter_700Bold",
        fontSize: 16,
        color: "#18181B",
        marginBottom: 16,
    },
    timelineList: {
        position: "relative",
    },
    connectingLine: {
        position: "absolute",
        top: 22,
        bottom: 22,
        left: 17,
        width: 2,
        backgroundColor: "#D9CBB7",
    },
    timelineStep: {
        flexDirection: "row",
        alignItems: "flex-start",
        marginBottom: 20,
    },
    stepIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 14,
        zIndex: 2,
    },
    stepIconOrange: {
        backgroundColor: "#FF6B35",
    },
    stepIconTan: {
        backgroundColor: "#E5D7C2",
    },
    stepContent: {
        flex: 1,
        paddingTop: 1,
    },
    stepTitle: {
        fontFamily: "Inter_700Bold",
        fontSize: 15,
        color: "#18181B",
        marginBottom: 2,
    },
    stepSubtitle: {
        fontFamily: "Inter_500Medium",
        fontSize: 13,
        color: "#524B43",
        lineHeight: 18,
    },
    socialProofHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 8,
        marginTop: 6,
    },
    starRatingLabel: {
        fontFamily: "Inter_700Bold",
        fontSize: 13,
        color: "#18181B",
        letterSpacing: 0.5,
    },
    reviewCard: {
        width: 260,
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 16,
        marginRight: 12,
        borderWidth: 1,
        borderColor: "#EFE8DC",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
    },
    reviewCardTitle: {
        fontFamily: "Inter_700Bold",
        fontSize: 14,
        color: "#18181B",
        marginBottom: 4,
    },
    reviewCardBody: {
        fontFamily: "Inter_400Regular",
        fontSize: 12.5,
        color: "#4B5563",
        lineHeight: 18,
        marginBottom: 8,
    },
    reviewAuthor: {
        fontFamily: "Inter_600SemiBold",
        fontSize: 11.5,
        color: "#9CA3AF",
    },
    pinnedFooterCard: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "#FAF7F2",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderTopWidth: 1,
        borderTopColor: "#EFE8DC",
        paddingHorizontal: 20,
        paddingTop: 14,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 8,
        alignItems: "center",
    },
    guaranteeRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 10,
    },
    guaranteeText: {
        fontFamily: "Inter_700Bold",
        fontSize: 13.5,
        color: "#18181B",
    },
    ctaOrangeButton: {
        width: "100%",
        height: 52,
        borderRadius: 26,
        backgroundColor: "#FF6B35",
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#FF6B35",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
        elevation: 4,
    },
    ctaOrangeButtonText: {
        fontFamily: "Inter_700Bold",
        fontSize: 17,
        color: "#FFFFFF",
        letterSpacing: 0.3,
    },
    priceSubRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginTop: 10,
    },
    priceSubText: {
        fontFamily: "Inter_500Medium",
        fontSize: 12,
        color: "#524B43",
    },
    viewOptionsBtn: {
        marginTop: 8,
        paddingVertical: 4,
    },
    viewOptionsText: {
        fontFamily: "Inter_600SemiBold",
        fontSize: 14,
        color: "#18181B",
        textDecorationLine: "underline",
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.45)",
        justifyContent: "flex-end",
    },
    modalBackdrop: {
        flex: 1,
    },
    modalSheetContent: {
        backgroundColor: "#FAF7F2",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 22,
        paddingTop: 18,
        paddingBottom: Platform.OS === "ios" ? 36 : 24,
        maxHeight: "85%",
        zIndex: 10,
        elevation: 10,
    },
    modalHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 10,
    },
    modalTitle: {
        fontFamily: "Inter_700Bold",
        fontSize: 20,
        color: "#18181B",
    },
    modalCloseBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: "#EFEBE4",
        alignItems: "center",
        justifyContent: "center",
    },
    planCardOption: {
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 16,
        borderWidth: 2,
        borderColor: "#E5E7EB",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    planCardOptionSelected: {
        borderColor: "#FF6B35",
        backgroundColor: "#FFF3ED",
    },
    discountBadgeWrap: {
        backgroundColor: "#FF6B35",
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        alignSelf: "flex-start",
        marginBottom: 6,
    },
    discountBadgeText: {
        fontFamily: "Inter_700Bold",
        fontSize: 10,
        color: "#FFFFFF",
        letterSpacing: 0.5,
    },
    planOptionTitle: {
        fontFamily: "Inter_700Bold",
        fontSize: 15,
        color: "#18181B",
        marginBottom: 2,
    },
    planOptionSub: {
        fontFamily: "Inter_500Medium",
        fontSize: 12,
        color: "#6B7280",
    },
    planOptionPriceRight: {
        alignItems: "flex-end",
    },
    planOptionBigPrice: {
        fontFamily: "Inter_700Bold",
        fontSize: 18,
        color: "#18181B",
    },
    planOptionPerMo: {
        fontFamily: "Inter_500Medium",
        fontSize: 11,
        color: "#6B7280",
    },
    radioCircle: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: "#D1D5DB",
        alignItems: "center",
        justifyContent: "center",
        marginTop: 6,
    },
    radioCircleActive: {
        borderColor: "#FF6B35",
        backgroundColor: "#FF6B35",
    },
    radioDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "#FFFFFF",
    },
    modalCtaBtn: {
        height: 50,
        borderRadius: 25,
        backgroundColor: "#FF6B35",
        alignItems: "center",
        justifyContent: "center",
        marginTop: 8,
    },
    modalCtaBtnText: {
        fontFamily: "Inter_700Bold",
        fontSize: 16,
        color: "#FFFFFF",
    },
    legalLinksRow: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: 12,
        marginTop: 14,
    },
    legalLinkText: {
        fontFamily: "Inter_500Medium",
        fontSize: 12,
        color: "#6B7280",
        textDecorationLine: "underline",
    },
});
