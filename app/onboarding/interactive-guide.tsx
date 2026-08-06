import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    Pressable,
    Image,
    ScrollView,
    StyleSheet,
    Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
    FadeIn,
    ZoomIn,
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withSequence,
    withTiming,
    Easing,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { OnboardingHeader } from "@/components/onboarding/OnboardingHeader";
import { useOnboarding } from "@/components/onboarding/onboardingContext";
import ServingScaler, { scaleQuantity } from "@/components/ServingScaler";
import GlassContainer from "@/components/GlassContainer";

const ORANGE = "#FF6B35";
const ORANGE_DARK = "#E05520";
const INK = "#1F2937";
const CREAM = "#FAF7F2";
const BLUE = "#0A84FF";
const RED = "#FF3B30";
const SURFACE_950 = "#0A0A0F";

const FOOD_PHOTO = require("../../assets/recime_lifestyle_1.jpg");
const PAGE_PHOTO = require("../../assets/recime_lifestyle_2.jpg");
const RECIPE_PAGE_PHOTO = require("../../assets/handwritten_recipe_page.jpg");
const APP_ICON = require("../../assets/icon.png");

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const CARD_W = Math.min(Math.round(SCREEN_WIDTH * 0.82), 340);
const CARD_W_SM = Math.min(Math.round(SCREEN_WIDTH * 0.74), 280);
const PREVIEW_W = Math.min(SCREEN_WIDTH - 40, 340);

type Dir = "up" | "down";
type Mode = "center" | "right";
type Ing = { q: string; u: string; name: string };
type Recipe = {
    dish: string;
    dishEmoji: string;
    servings: number;
    sourceLabel: string;
    sourceIcon: string;
    prep: string;
    cook: string;
    photo?: any;
    ingredients: Ing[];
    steps: string[];
};

const RECIPES: Record<string, Recipe> = {
    social: {
        dish: "Beef Bourguignon",
        dishEmoji: "🍲",
        servings: 6,
        sourceLabel: "Instagram",
        sourceIcon: "share-social-outline",
        prep: "15 min",
        cook: "2 hr",
        photo: FOOD_PHOTO,
        ingredients: [
            { q: "1", u: "tbsp", name: "extra-virgin olive oil" },
            { q: "6", u: "oz", name: "bacon, roughly chopped" },
            { q: "3", u: "lbs", name: "beef brisket, in chunks" },
            { q: "1", u: "large", name: "carrot, sliced" },
            { q: "1", u: "", name: "white onion, diced" },
            { q: "3", u: "cloves", name: "garlic, minced" },
            { q: "1", u: "pinch", name: "coarse salt & pepper" },
        ],
        steps: [
            "Sear the beef in batches until deeply browned on all sides; set aside.",
            "Sauté bacon, onion, carrot & garlic, then deglaze with red wine.",
            "Return the beef, add stock & herbs, and braise low and slow until fork-tender.",
        ],
    },
    websites: {
        dish: "Banana Walnut Bread",
        dishEmoji: "🍌",
        servings: 12,
        sourceLabel: "Web",
        sourceIcon: "link-outline",
        prep: "15 min",
        cook: "55 min",
        ingredients: [
            { q: "1 3/4", u: "cups", name: "all-purpose flour" },
            { q: "3", u: "", name: "ripe bananas, mashed" },
            { q: "1/2", u: "cup", name: "toasted walnuts" },
            { q: "1", u: "", name: "large egg" },
            { q: "1/3", u: "cup", name: "melted butter" },
            { q: "3/4", u: "cup", name: "cane sugar" },
        ],
        steps: [
            "Mash the bananas and fold with melted butter, egg and sugar.",
            "Stir in flour, soda, salt and toasted walnuts until just combined.",
            "Bake at 350°F for 55–60 mins until a skewer comes out clean.",
        ],
    },
    printed: {
        dish: "Grandma's Date Nut Bread",
        dishEmoji: "🍞",
        servings: 12,
        sourceLabel: "Scanned",
        sourceIcon: "camera-outline",
        prep: "10 min",
        cook: "45 min",
        ingredients: [
            { q: "1", u: "cup", name: "chopped dates" },
            { q: "1", u: "cup", name: "pecans, chopped" },
            { q: "2 1/4", u: "cups", name: "flour" },
            { q: "1", u: "tsp", name: "baking soda" },
        ],
        steps: [
            "Soak the dates in boiling water with baking soda for 10 minutes.",
            "Cream butter & sugar, add the egg, then fold in flour and the date mixture.",
            "Stir in pecans and bake at 325°F for 45–50 minutes; cool before slicing.",
        ],
    },
};

const GUIDE: Record<string, { importStep: number; successStep: number }> = {
    social: { importStep: 3, successStep: 4 },
    websites: { importStep: 3, successStep: 4 },
    printed: { importStep: 1, successStep: 2 },
};

const TITLES: Record<string, string> = {
    social: "Smart social media imports",
    websites: "Import from websites",
    printed: "Import from photos",
};

/* ------------------------------------------------------------------ */
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function PulseRing({ size, color = RED }: { size: number; color?: string }) {
    const a = useSharedValue(0);
    const b = useSharedValue(0);
    useEffect(() => {
        const loop = () =>
            withRepeat(
                withSequence(
                    withTiming(1, { duration: 1100, easing: Easing.out(Easing.ease) }),
                    withTiming(0, { duration: 0 }),
                ),
                -1,
                false,
            );
        a.value = loop();
        b.value = withSequence(withTiming(0, { duration: 350 }), loop());
    }, []);
    const ringA = useAnimatedStyle(() => ({
        transform: [{ scale: 1 + a.value * 1.1 }],
        opacity: (1 - a.value) * 0.55,
    }));
    const ringB = useAnimatedStyle(() => ({
        transform: [{ scale: 1 + b.value * 1.1 }],
        opacity: (1 - b.value) * 0.55,
    }));
    return (
        <View
            style={[
                s.pulseWrap,
                {
                    width: size,
                    height: size,
                    top: "50%",
                    left: "50%",
                    transform: [{ translateX: -size / 2 }, { translateY: -size / 2 }],
                },
            ]}
            pointerEvents="none"
        >
            <Animated.View style={[s.pulseRing, ringA, { borderColor: color }]} />
            <Animated.View style={[s.pulseRing, ringB, { borderColor: color }]} />
        </View>
    );
}

/* Layout-only tooltip: anchored to its (relative) target wrapper via % offsets.
   Renders animated pulsing target rings AND a sleek blue/red "Tap here 👆" badge. */
function TapHere({
    dir,
    mode = "center",
    onPress,
    ringColor = RED,
    ringSize = 64,
}: {
    dir: Dir;
    mode?: Mode;
    onPress: () => void;
    ringColor?: string;
    ringSize?: number;
}) {
    const horiz: any =
        mode === "center" ? { left: "50%", transform: [{ translateX: -54 }] } : { right: 0 };
    const vert: any =
        dir === "up" ? { top: "100%", marginTop: 8 } : { bottom: "100%", marginBottom: 8 };
    const pointerHoriz: any = mode === "center" ? { left: "50%", marginLeft: -6 } : { right: 16 };
    const pointerVert: any = (dir === "up" ? { top: -6 } : { bottom: -6 }) as any;
    return (
        <View style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0, alignItems: "center", justifyContent: "center" }} pointerEvents="box-none">
            {/* Animated Pulsing Red Target Rings directly around target button */}
            <PulseRing size={ringSize} color={ringColor} />

            {/* Tap Here Badge */}
            <AnimatedPressable
                entering={FadeIn.duration(250)}
                onPress={onPress}
                hitSlop={12}
                style={[s.tapBubble, { position: "absolute", zIndex: 60 }, horiz, vert]}
            >
                <View pointerEvents="none" style={[s.tapPointer, pointerHoriz, pointerVert]} />
                <Text style={s.tapText} numberOfLines={1}>
                    Tap here
                </Text>
                <Text style={s.tapFinger}>👆</Text>
            </AnimatedPressable>
        </View>
    );
}

function BrandRow() {
    return (
        <View style={s.brandRow}>
            <View style={s.brandBadge}>
                <LinearGradient
                    colors={["#F58529", "#DD2A7B", "#8134AF", "#515BD4"]}
                    start={{ x: 0, y: 1 }}
                    end={{ x: 1, y: 0 }}
                    style={s.brandBadgeInner}
                >
                    <Ionicons name="camera" size={17} color="#FFF" />
                </LinearGradient>
            </View>
            <View style={[s.brandBadge, { backgroundColor: "#1877F2" }]}>
                <Ionicons name="logo-facebook" size={18} color="#FFF" />
            </View>
            <View style={[s.brandBadge, { backgroundColor: "#000000" }]}>
                <Ionicons name="logo-tiktok" size={17} color="#FFF" />
            </View>
            <View style={[s.brandBadge, { backgroundColor: "#FF0000" }]}>
                <Ionicons name="play" size={15} color="#FFF" />
            </View>
            <View style={[s.brandBadge, { backgroundColor: "#E60023" }]}>
                <Ionicons name="logo-pinterest" size={18} color="#FFF" />
            </View>
        </View>
    );
}

function StatusBar({ dark = false }: { dark?: boolean }) {
    const c = dark ? "#FFF" : "#000";
    return (
        <View style={s.statusBar}>
            <Text style={[s.statusTime, { color: c }]}>9:41</Text>
            <View style={s.statusRight}>
                <Ionicons name="cellular" size={13} color={c} />
                <Ionicons name="wifi" size={13} color={c} />
                <Ionicons name="battery-full" size={16} color={c} />
            </View>
        </View>
    );
}

function PhoneCard({ children, tall }: { children: React.ReactNode; tall?: boolean }) {
    return (
        <View style={[tall ? s.phoneFrameTall : s.phoneFrame, { width: tall ? CARD_W : CARD_W_SM }]}>
            {/* Dynamic Island Notch - matching welcome.tsx & website */}
            <View style={s.bezelNotch}>
                <View style={s.bezelSpeaker} />
            </View>

            {/* Inner Phone Screen */}
            <View style={s.phoneCardInner}>
                {children}
            </View>
        </View>
    );
}

function ImportingOverlay({ label = "Importing recipe…" }: { label?: string }) {
    const spin = useSharedValue(0);
    useEffect(() => {
        spin.value = withRepeat(withTiming(1, { duration: 2200, easing: Easing.linear }), -1, false);
    }, []);
    const spinStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value * 360}deg` }] }));
    return (
        <View style={s.overlayDim} pointerEvents="none">
            <Animated.View entering={ZoomIn.duration(350)} style={s.importCard}>
                <View style={s.importArt}>
                    <Animated.View style={[s.importSpin, spinStyle]}>
                        <View style={[s.blob, { backgroundColor: "#8BC34A", top: 4, left: 26 }]} />
                        <View style={[s.blob, { backgroundColor: "#FFB74D", top: 14, right: 10 }]} />
                        <View style={[s.blob, { backgroundColor: "#FFD54F", bottom: 8, left: 12 }]} />
                        <View style={[s.blob, { backgroundColor: "#64B5F6", bottom: 2, right: 22, borderRadius: 4 }]} />
                    </Animated.View>
                    <Ionicons name="sparkles" size={20} color="#C084FC" style={s.importSparkle} />
                </View>
                <Text style={s.importText}>{label}</Text>
            </Animated.View>
        </View>
    );
}

type FlowProps = { onTarget: () => void };

function SocialPost({ onTarget }: FlowProps) {
    return (
        <PhoneCard>
            <View style={s.screen}>
                <StatusBar />
                <View style={s.igTop}>
                    <Ionicons name="chevron-back" size={18} color="#000" />
                    <View style={{ alignItems: "center" }}>
                        <Text style={s.igTopSmall}>SNAPRECIPES.APP</Text>
                        <Text style={s.igTopTitle}>Posts</Text>
                    </View>
                    <View style={s.igAvatar}>
                        <Text style={s.igAvatarText}>S</Text>
                    </View>
                </View>
                <View style={s.igAccount}>
                    <View style={s.igAccountLeft}>
                        <View style={s.igAccountAvatar}>
                            <Text style={s.igAccountAvatarText}>CN</Text>
                        </View>
                        <Text style={s.igHandle}>chef.noelle</Text>
                    </View>
                    <Ionicons name="ellipsis-horizontal" size={16} color="#262626" />
                </View>
                <View style={s.igPhoto}>
                    <Image source={FOOD_PHOTO} style={s.igPhotoImg} resizeMode="cover" />
                    <View style={s.igCarousel}>
                        <Text style={s.igCarouselText}>1/5</Text>
                    </View>
                </View>
                <View style={s.igActions}>
                    <View style={s.igActionsLeft}>
                        <Ionicons name="heart-outline" size={22} color="#262626" />
                        <Ionicons name="chatbubble-outline" size={21} color="#262626" />
                        <View style={s.targetWrap}>
                            <PulseRing size={34} color={RED} />
                            <Pressable onPress={onTarget} hitSlop={10} style={s.targetBtn}>
                                <Ionicons name="paper-plane" size={22} color="#262626" />
                            </Pressable>
                            <TapHere dir="up" mode="center" onPress={onTarget} />
                        </View>
                    </View>
                    <Ionicons name="bookmark-outline" size={21} color="#262626" />
                </View>
                <View style={s.igCaption}>
                    <View style={s.igLikedRow}>
                        <View style={s.igLikedDot} />
                        <Text style={s.igLiked} numberOfLines={1}>
                            Liked by taylah and others
                        </Text>
                    </View>
                    <Text style={s.igCapText} numberOfLines={2}>
                        <Text style={s.igCapHandle}>chef.noelle </Text>
                        Slow-braised Beef Bourguignon 🍲 full recipe saved! 👇
                    </Text>
                </View>
                <View style={s.igTabs}>
                    <Ionicons name="home" size={20} color="#262626" />
                    <Ionicons name="search" size={20} color="#262626" />
                    <Ionicons name="add-circle-outline" size={20} color="#262626" />
                    <Ionicons name="videocam-outline" size={20} color="#262626" />
                    <Ionicons name="person-outline" size={20} color="#262626" />
                </View>
            </View>
        </PhoneCard>
    );
}

function SocialShareSheet({ onTarget }: FlowProps) {
    return (
        <View style={s.sheetStage}>
            <View style={s.sheet}>
                <View style={s.sheetGrabber} />
                <View style={s.sheetSearch}>
                    <Ionicons name="search" size={16} color="#8E8E93" />
                    <View style={s.sheetSearchLine} />
                    <View style={s.sheetSearchIcon}>
                        <Ionicons name="person-add-outline" size={16} color="#3A3A3C" />
                    </View>
                </View>
                <View style={s.sheetPill}>
                    <Ionicons name="flash" size={13} color="#3A3A3C" />
                </View>
                <View style={s.contactGrid}>
                    {[0, 1, 2, 0, 1, 2].map((_, i) => (
                        <View key={i} style={s.contactCell}>
                            <View style={s.contactCircle} />
                            <View style={s.contactLine} />
                        </View>
                    ))}
                </View>
                <View style={s.actionRow}>
                    <ActionIcon label="Add to story" bg="#E9E9EC" dark>
                        <Ionicons name="add-circle-outline" size={22} color="#3A3A3C" />
                    </ActionIcon>
                    <View style={s.targetWrap}>
                        <PulseRing size={52} color={RED} />
                        <ActionIcon label="Share to…" bg="#FFFFFF" highlighted>
                            <Ionicons name="share-social" size={22} color="#000" />
                        </ActionIcon>
                        <Pressable onPress={onTarget} hitSlop={8} style={s.actionHit} />
                        <TapHere dir="down" mode="center" onPress={onTarget} />
                    </View>
                    <ActionIcon label="Copy link" bg="#E9E9EC" dark>
                        <Ionicons name="link" size={22} color="#3A3A3C" />
                    </ActionIcon>
                    <ActionIcon label="WhatsApp" bg="#25D366">
                        <Ionicons name="logo-whatsapp" size={22} color="#FFF" />
                    </ActionIcon>
                </View>
            </View>
        </View>
    );
}

function SharingLinkSheet({
    linkIcon,
    linkTitle,
    linkUrl,
    onTarget,
}: FlowProps & { linkIcon: React.ReactNode; linkTitle: string; linkUrl: string }) {
    return (
        <View style={s.sheetStage}>
            <View style={[s.sheet, { paddingTop: 18 }]}>
                <Text style={s.sheetTitle}>Sharing link</Text>
                <View style={s.linkPreview}>
                    <View style={s.linkIconWrap}>{linkIcon}</View>
                    <View style={{ flex: 1 }}>
                        <Text style={s.linkTitle} numberOfLines={1}>
                            {linkTitle}
                        </Text>
                        <Text style={s.linkUrl} numberOfLines={1}>
                            {linkUrl}
                        </Text>
                    </View>
                    <Ionicons name="copy-outline" size={18} color="#3A3A3C" />
                </View>
                <View style={s.contactRow}>
                    {[0, 1, 2, 3].map((i) => (
                        <View key={i} style={s.contactCell}>
                            <View style={s.contactCircle} />
                            <View style={s.contactLine} />
                        </View>
                    ))}
                </View>
                <View style={s.appRow}>
                    <ActionIcon label="Quick Share" bg={BLUE}>
                        <Ionicons name="repeat" size={20} color="#FFF" />
                    </ActionIcon>
                    <View style={s.targetWrap}>
                        <PulseRing size={52} color={RED} />
                        <ActionIcon label="SnapRecipes" bg="#FFF" highlighted iconImage={APP_ICON} />
                        <Pressable onPress={onTarget} hitSlop={8} style={s.actionHit} />
                        <TapHere dir="down" mode="center" onPress={onTarget} />
                    </View>
                    <ActionIcon label="Gmail" bg="#FFFFFF" dark>
                        <Text style={s.gmailGlyph}>M</Text>
                    </ActionIcon>
                    <ActionIcon label="Drive" bg="#FFFFFF" dark>
                        <Ionicons name="logo-google" size={20} color="#0F9D58" />
                    </ActionIcon>
                </View>
            </View>
        </View>
    );
}

function WebPage({ onTarget }: FlowProps) {
    return (
        <PhoneCard>
            <View style={s.screen}>
                <StatusBar />
                <View style={s.urlRow}>
                    <Ionicons name="home-outline" size={16} color="#5F6368" />
                    <View style={s.urlBar}>
                        <Ionicons name="lock-closed" size={11} color="#5F6368" />
                        <Text style={s.urlText} numberOfLines={1}>
                            thenomkitchen.com
                        </Text>
                    </View>
                    <Ionicons name="add" size={18} color="#5F6368" />
                    <View style={s.urlTab}>
                        <Text style={s.urlTabText}>1</Text>
                    </View>
                    <View style={s.targetWrap}>
                        <PulseRing size={30} color={RED} />
                        <Pressable onPress={onTarget} hitSlop={10} style={s.targetBtn}>
                            <Ionicons name="ellipsis-vertical" size={18} color="#5F6368" />
                        </Pressable>
                        <TapHere dir="up" mode="right" onPress={onTarget} />
                    </View>
                </View>
                <View style={s.siteHeader}>
                    <Ionicons name="menu" size={18} color="#333" />
                    <View style={s.nomLogo}>
                        <Text style={s.nomLogoText}>nom</Text>
                    </View>
                    <View style={s.siteHeaderRight}>
                        <Ionicons name="search-outline" size={17} color="#333" />
                        <Ionicons name="bookmark-outline" size={17} color="#333" />
                        <Ionicons name="cart-outline" size={17} color="#333" />
                    </View>
                </View>
                <View style={s.crumbs}>
                    <Text style={s.crumb} numberOfLines={1}>
                        Home  ›  Recipes  ›  Bread
                    </Text>
                </View>
                <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                    <Text style={s.articleTitle}>Banana Walnut Bread</Text>
                    <Text style={s.articleDesc}>
                        My grandmother's classic moist banana bread, packed with toasted walnuts and
                        super moist.
                    </Text>
                    <View style={s.articleBy}>
                        <View style={s.nomLogoSmall}>
                            <Text style={s.nomLogoSmallText}>nom</Text>
                        </View>
                        <Text style={s.articleByText}>RECIPE FROM THE NOM KITCHEN</Text>
                    </View>
                    <View style={s.reviewRow}>
                        <Text style={s.stars}>★★★★★</Text>
                        <Text style={s.reviewCount}>1093 Reviews</Text>
                    </View>
                    <View style={s.jumpBtn}>
                        <Text style={s.jumpBtnText}>Jump to Recipe</Text>
                    </View>
                    <Image source={PAGE_PHOTO} style={s.articlePhoto} resizeMode="cover" />
                </ScrollView>
            </View>
        </PhoneCard>
    );
}

function WebMenu({ onTarget }: FlowProps) {
    const Item = ({ icon, label }: { icon: string; label: string }) => (
        <View style={s.menuItem}>
            <Ionicons name={icon as any} size={16} color="#3C4043" />
            <Text style={s.menuItemText}>{label}</Text>
        </View>
    );
    return (
        <PhoneCard>
            <View style={s.screen}>
                <StatusBar />
                <View style={s.urlRow}>
                    <Ionicons name="home-outline" size={16} color="#5F6368" />
                    <View style={s.urlBar}>
                        <Ionicons name="lock-closed" size={11} color="#5F6368" />
                        <Text style={s.urlText} numberOfLines={1}>
                            thenomkitchen.com
                        </Text>
                    </View>
                    <View style={s.urlTab}>
                        <Text style={s.urlTabText}>1</Text>
                    </View>
                    <Ionicons name="ellipsis-vertical" size={18} color="#202124" />
                </View>
                <View style={{ flex: 1, backgroundColor: "#D7D7DA" }} />
                <View style={s.dropdown}>
                    <View style={s.dropdownTop}>
                        {["arrow-forward", "star-outline", "download-outline", "information-circle-outline", "refresh"].map(
                            (ic) => (
                                <View key={ic} style={s.dropdownTopIcon}>
                                    <Ionicons name={ic as any} size={16} color="#3C4043" />
                                </View>
                            ),
                        )}
                    </View>
                    <Item icon="add-circle-outline" label="New tab" />
                    <Item icon="contract-outline" label="New Incognito tab" />
                    <View style={s.menuDivider} />
                    <Item icon="time-outline" label="History" />
                    <Item icon="trash-outline" label="Delete browsing data" />
                    <View style={s.menuDivider} />
                    <Item icon="download-outline" label="Downloads" />
                    <Item icon="star-outline" label="Bookmarks" />
                    <View style={s.menuDivider} />
                    <Pressable onPress={onTarget} style={s.menuItem} hitSlop={4}>
                        <View style={s.targetWrap}>
                            <PulseRing size={22} color={RED} />
                            <Ionicons name="share-social-outline" size={16} color="#3C4043" />
                            <TapHere dir="up" mode="center" onPress={onTarget} />
                        </View>
                        <Text style={s.menuItemText}>Share…</Text>
                    </Pressable>
                </View>
            </View>
        </PhoneCard>
    );
}

function CamStatusBar() {
    return (
        <View style={s.camStatusBar}>
            <Text style={s.camStatusTime}>1:24</Text>
            <View style={s.camStatusRight}>
                <Ionicons name="cellular" size={12} color="#FFF" />
                <Ionicons name="wifi" size={12} color="#FFF" />
                <View style={s.camBattery}>
                    <View style={s.camBatteryFill} />
                </View>
                <Text style={s.camBatteryText}>75%</Text>
            </View>
        </View>
    );
}

function PrintedCamera({ onTarget }: FlowProps) {
    return (
        <PhoneCard tall>
            <View style={[s.screen, { backgroundColor: "#000000" }]}>
                {/* Realistic iOS Status Bar */}
                <CamStatusBar />

                {/* Camera Top Bar */}
                <View style={s.camHeader}>
                    <Ionicons name="settings-outline" size={16} color="#FFF" />
                    <Ionicons name="chevron-down" size={16} color="#FFF" />
                    <Ionicons name="images-outline" size={16} color="#FFF" />
                </View>

                {/* Viewfinder with Real Handwritten Recipe Page Photo */}
                <View style={s.camViewfinder}>
                    <Image
                        source={RECIPE_PAGE_PHOTO}
                        style={s.camViewfinderImage}
                        resizeMode="contain"
                    />
                </View>

                {/* Camera Control Panel - Compact */}
                <View style={s.camBottomPanel}>
                    {/* Zoom Pills Row */}
                    <View style={s.zoomRow}>
                        <Text style={s.zoomItem}>.7</Text>
                        <View style={s.zoomItemActive}>
                            <Text style={s.zoomTextActive}>1x</Text>
                        </View>
                        <Text style={s.zoomItem}>2</Text>
                        <Text style={s.zoomItem}>4</Text>
                    </View>

                    {/* Shutter Row with Target Pointer */}
                    <View style={s.camShutterRow}>
                        <View style={s.camSideBtn}>
                            <Ionicons name="refresh-outline" size={20} color="#FFF" />
                        </View>

                        {/* Large White Shutter Button */}
                        <View style={s.shutterWrap}>
                            <Pressable onPress={onTarget} hitSlop={12} style={s.realShutterOuter}>
                                <View style={s.realShutterInner} />
                            </Pressable>
                            <TapHere dir="down" mode="center" onPress={onTarget} ringColor={RED} ringSize={68} />
                        </View>

                        <View style={s.camSideBtn}>
                            <Image
                                source={RECIPE_PAGE_PHOTO}
                                style={s.galleryThumb}
                            />
                        </View>
                    </View>

                    {/* Camera Modes Bar */}
                    <View style={s.modesRow}>
                        <Text style={s.modeText}>Motion</Text>
                        <Text style={s.modeText}>Portrait</Text>
                        <Text style={[s.modeText, s.modeTextActive]}>Photo</Text>
                        <Text style={s.modeText}>Video</Text>
                        <Text style={s.modeText}>Modes</Text>
                    </View>
                </View>
            </View>
        </PhoneCard>
    );
}

function ActionIcon({
    label,
    bg,
    children,
    dark,
    highlighted,
    iconImage,
}: {
    label: string;
    bg: string;
    children?: React.ReactNode;
    dark?: boolean;
    highlighted?: boolean;
    iconImage?: any;
}) {
    return (
        <View style={s.actionIconWrap}>
            {iconImage ? (
                <Image source={iconImage} style={[s.actionIcon, s.actionIconImg, highlighted && s.actionIconHi]} />
            ) : (
                <View style={[s.actionIcon, { backgroundColor: bg }, highlighted && s.actionIconHi]}>
                    {children}
                </View>
            )}
            <Text style={[s.actionLabel, dark && { color: "#3A3A3C" }]} numberOfLines={1}>
                {label}
            </Text>
        </View>
    );
}

/* ------------------------------------------------------------------ */
/* App-accurate dark recipe preview card (used inside onboarding)      */
/* ------------------------------------------------------------------ */
function MetaPill({ icon, color, label }: { icon: string; color: string; label: string }) {
    return (
        <View className="flex-row items-center bg-surface-800 px-3 py-1.5 rounded-full">
            <Ionicons name={icon as any} size={13} color={color} />
            <Text className="text-surface-300 font-sans text-xs ml-1.5">{label}</Text>
        </View>
    );
}

function SuccessCard({ recipe }: { recipe: Recipe }) {
    const [multiplier, setMultiplier] = useState(1);
    return (
        <View style={[s.previewCard, { width: PREVIEW_W }]}>
            <ScrollView bounces showsVerticalScrollIndicator={false}>
                {/* hero */}
                <View style={{ width: "100%", height: 124, backgroundColor: "#111" }}>
                    <View className="flex-1 w-full h-full bg-surface-800 items-center justify-center">
                        {recipe.photo ? (
                            <Image source={recipe.photo} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                        ) : (
                            <Animated.Text entering={ZoomIn.duration(500)} className="text-6xl">
                                {recipe.dishEmoji}
                            </Animated.Text>
                        )}
                    </View>
                    <LinearGradient
                        colors={["transparent", "rgba(10,10,15,0.9)"]}
                        style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 70 }}
                    />
                    <View className="absolute right-3 top-3 w-8 h-8 rounded-full bg-black/50 items-center justify-center">
                        <Ionicons name="bookmark" size={16} color={ORANGE} />
                    </View>
                    <View className="absolute left-3 top-3">
                        <GlassContainer style={{ borderRadius: 999, overflow: "hidden" }}>
                            <View className="flex-row items-center px-2.5 py-1" style={{ gap: 5 }}>
                                <View className="w-4 h-4 rounded-full bg-mint items-center justify-center">
                                    <Ionicons name="checkmark" size={11} color="#06281C" />
                                </View>
                                <Text className="text-white font-sans-bold text-[10px]">Saved</Text>
                            </View>
                        </GlassContainer>
                    </View>
                </View>

                {/* content */}
                <View className="px-4 -mt-6 pb-4">
                    <Text className="text-white font-sans-bold text-xl leading-tight mb-2">{recipe.dish}</Text>

                    <View className="flex-row flex-wrap mb-4" style={{ gap: 6 }}>
                        <MetaPill icon="time-outline" color="#9D9DB0" label={`Prep ${recipe.prep}`} />
                        <MetaPill icon="flame-outline" color={ORANGE} label={`Cook ${recipe.cook}`} />
                        <MetaPill icon={recipe.sourceIcon} color="#34D399" label={recipe.sourceLabel} />
                    </View>

                    <View className="mb-4">
                        <ServingScaler
                            originalServings={recipe.servings}
                            currentMultiplier={multiplier}
                            onMultiplierChange={setMultiplier}
                        />
                    </View>

                    <Text className="text-white font-sans-bold text-base mb-2">Ingredients</Text>
                    <View className="bg-surface-900 rounded-2xl px-3 py-1 mb-4">
                        {recipe.ingredients.map((ing, i) => {
                            const scaled = scaleQuantity(ing.q, multiplier);
                            const isLast = i === recipe.ingredients.length - 1;
                            return (
                                <View
                                    key={i}
                                    className={`flex-row items-center py-2.5 ${isLast ? "" : "border-b border-surface-800"}`}
                                >
                                    <View className="flex-shrink-0 flex-row items-center mr-3" style={{ minWidth: 78 }}>
                                        <Text className="text-accent font-sans-bold text-sm">{scaled}</Text>
                                        {ing.u ? (
                                            <Text className="text-surface-300 font-sans text-sm ml-1">{ing.u}</Text>
                                        ) : null}
                                    </View>
                                    <Text className="text-white font-sans text-sm flex-1">{ing.name}</Text>
                                </View>
                            );
                        })}
                    </View>

                    <Text className="text-white font-sans-bold text-base mb-2">Instructions</Text>
                    {recipe.steps.map((t, i) => (
                        <View key={i} className="flex-row mb-3">
                            <View
                                className="w-7 h-7 rounded-full items-center justify-center mr-2.5 mt-0.5"
                                style={{ backgroundColor: "rgba(255,107,53,0.15)" }}
                            >
                                <Text className="text-accent font-sans-bold text-xs">{i + 1}</Text>
                            </View>
                            <Text className="text-surface-200 font-sans text-sm flex-1 leading-5">{t}</Text>
                        </View>
                    ))}
                </View>
            </ScrollView>
        </View>
    );
}

/* ================================================================== */
export default function InteractiveGuideScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { state } = useOnboarding();

    const selectedSources = state.recipeSources.length ? state.recipeSources : ["social", "websites"];
    const [flowIndex, setFlowIndex] = useState(0);
    const [step, setStep] = useState(1);
    const [importing, setImporting] = useState(false);

    const flow = selectedSources[flowIndex] || "social";
    const cfg = GUIDE[flow] || GUIDE.social;
    const recipe = RECIPES[flow] || RECIPES.social;
    const isSuccess = step === cfg.successStep;
    const isLastFlow = flowIndex >= selectedSources.length - 1;

    const advance = () => {
        if (importing) return;
        if (step === cfg.importStep) {
            setImporting(true);
            setTimeout(() => {
                setImporting(false);
                setStep(cfg.successStep);
            }, 1400);
            return;
        }
        if (step < cfg.successStep) {
            setStep(step + 1);
            return;
        }
        if (!isLastFlow) {
            setFlowIndex(flowIndex + 1);
            setStep(1);
        } else {
            router.push("/onboarding/age-group");
        }
    };

    const renderInApp = () => {
        if (flow === "social" && step === 1) return <SocialPost onTarget={advance} />;
        if (flow === "websites" && step === 1) return <WebPage onTarget={advance} />;
        if (flow === "websites" && step === 2) return <WebMenu onTarget={advance} />;
        if (flow === "printed" && step === 1) return <PrintedCamera onTarget={advance} />;
        return null;
    };

    const renderSheet = () => {
        if (flow === "social" && step === 2) return <SocialShareSheet onTarget={advance} />;
        if (flow === "social" && step === 3)
            return (
                <SharingLinkSheet
                    onTarget={advance}
                    linkIcon={
                        <View style={s.igLinkIcon}>
                            <Ionicons name="camera" size={16} color="#FFF" />
                        </View>
                    }
                    linkTitle="Instagram"
                    linkUrl="https://www.instagram.com/p/…"
                />
            );
        if (flow === "websites" && step === 3)
            return (
                <SharingLinkSheet
                    onTarget={advance}
                    linkIcon={
                        <View style={s.nomLinkIcon}>
                            <Text style={s.nomLinkIconText}>nom</Text>
                        </View>
                    }
                    linkTitle="Banana Bread recipe"
                    linkUrl="https://www.thenomkitchen.c…"
                />
            );
        return null;
    };

    const sheetFlows =
        (flow === "social" && (step === 2 || step === 3)) || (flow === "websites" && step === 3);

    return (
        <View style={s.root}>
            <OnboardingHeader
                progress={0.7}
                showSkip={!isSuccess}
                onSkip={() => router.push("/onboarding/age-group")}
            />

            <View style={[s.body, { paddingBottom: 16 + insets.bottom }]}>
                <Animated.View entering={FadeIn.duration(350)} style={s.titleWrap}>
                    <Text style={s.title}>
                        {isSuccess ? "Recipe imported successfully!" : TITLES[flow]}
                    </Text>
                    {isSuccess && <Text style={s.titleSub}>✨ Just like magic ✨</Text>}
                </Animated.View>

                {flow === "social" && !isSuccess && <BrandRow />}

                <View style={s.stage}>
                    {isSuccess ? (
                        <SuccessCard recipe={recipe} />
                    ) : (
                        <>
                            {sheetFlows ? renderSheet() : renderInApp()}
                            {importing && (
                                <ImportingOverlay label={flow === "printed" ? "Scanning photo…" : "Importing recipe…"} />
                            )}
                        </>
                    )}
                </View>

                {isSuccess && (
                    <Animated.View entering={FadeIn.delay(150).duration(400)} style={{ paddingTop: 12 }}>
                        <Pressable onPress={advance} style={s.button}>
                            <Text style={s.buttonText}>{isLastFlow ? "Continue" : "Next guide"}</Text>
                        </Pressable>
                    </Animated.View>
                )}
            </View>
        </View>
    );
}

/* ================================================================== */
const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: CREAM },
    body: { flex: 1, paddingHorizontal: 20, paddingTop: 4 },

    titleWrap: { alignItems: "center", marginTop: 2, marginBottom: 8 },
    title: { color: INK, fontFamily: "Inter_700Bold", fontSize: 22, textAlign: "center" },
    titleSub: { color: "#6B7280", fontFamily: "Inter_500Medium", fontSize: 13, marginTop: 4 },

    stage: { flex: 1, justifyContent: "center", alignItems: "center", position: "relative" },

    brandRow: { flexDirection: "row", justifyContent: "center", gap: 12, marginBottom: 12 },
    brandBadge: { width: 30, height: 30, borderRadius: 9, overflow: "hidden", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4, elevation: 3 },
    brandBadgeInner: { width: 30, height: 30, alignItems: "center", justifyContent: "center", borderRadius: 9 },

    /* iPhone Frame Styling matching slide 1 (welcome.tsx) and website HeroSection */
    phoneFrame: {
        height: 460,
        backgroundColor: "#000000",
        borderRadius: 44,
        padding: 10,
        borderWidth: 4,
        borderColor: "#1F2937",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.35,
        shadowRadius: 24,
        elevation: 12,
        position: "relative",
    },
    phoneFrameTall: {
        height: Math.min(SCREEN_HEIGHT * 0.70, 600),
        backgroundColor: "#000000",
        borderRadius: 46,
        padding: 10,
        borderWidth: 4,
        borderColor: "#1F2937",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 18 },
        shadowOpacity: 0.4,
        shadowRadius: 28,
        elevation: 14,
        position: "relative",
    },
    phoneCardInner: {
        flex: 1,
        backgroundColor: "#000000",
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
    screen: { flex: 1, backgroundColor: "#FFFFFF", overflow: "hidden" },

    statusBar: { height: 30, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 6 },
    statusTime: { fontFamily: "Inter_600SemiBold", fontSize: 11 },
    statusRight: { flexDirection: "row", alignItems: "center", gap: 4 },

    pulseWrap: { position: "absolute", alignItems: "center", justifyContent: "center" },
    pulseRing: { position: "absolute", width: "100%", height: "100%", borderRadius: 999, borderWidth: 3 },
    targetWrap: { position: "relative", alignItems: "center", justifyContent: "center" },
    targetBtn: { padding: 2 },

    tapBubble: { width: 108, justifyContent: "center", backgroundColor: BLUE, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 7, flexDirection: "row", alignItems: "center", gap: 5, elevation: 20, shadowColor: BLUE, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 6 },
    tapText: { color: "#FFF", fontFamily: "Inter_700Bold", fontSize: 13 },
    tapFinger: { fontSize: 13 },
    tapPointer: { position: "absolute", width: 12, height: 12, backgroundColor: BLUE, transform: [{ rotate: "45deg" }] },
    tapPointerBottom: { width: 12, height: 12, backgroundColor: BLUE, transform: [{ rotate: "45deg" }], marginTop: -6 },

    previewCard: {
        flex: 1,
        maxHeight: 480,
        alignSelf: "center",
        borderRadius: 24,
        overflow: "hidden",
        backgroundColor: SURFACE_950,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.07)",
        shadowColor: "#1F2937",
        shadowOffset: { width: 0, height: 14 },
        shadowOpacity: 0.2,
        shadowRadius: 22,
        elevation: 10,
    },

    igTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 7, backgroundColor: "#FAFAFA", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#E5E5E5" },
    igTopSmall: { fontSize: 7, color: "#8E8E8E", letterSpacing: 0.5, fontFamily: "Inter_600SemiBold" },
    igTopTitle: { fontSize: 12, fontFamily: "Inter_700Bold", color: "#262626" },
    igAvatar: { width: 20, height: 20, borderRadius: 10, backgroundColor: ORANGE, alignItems: "center", justifyContent: "center" },
    igAvatarText: { color: "#FFF", fontSize: 10, fontFamily: "Inter_700Bold" },
    igAccount: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 10, paddingVertical: 7 },
    igAccountLeft: { flexDirection: "row", alignItems: "center", gap: 7 },
    igAccountAvatar: { width: 24, height: 24, borderRadius: 12, backgroundColor: "#FFE2D1", borderWidth: 1.5, borderColor: ORANGE, alignItems: "center", justifyContent: "center" },
    igAccountAvatarText: { color: ORANGE, fontSize: 9, fontFamily: "Inter_700Bold" },
    igHandle: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#262626" },
    igPhoto: { width: "100%", height: 168, backgroundColor: "#EFEFEF", position: "relative" },
    igPhotoImg: { width: "100%", height: "100%" },
    igCarousel: { position: "absolute", top: 8, right: 8, backgroundColor: "rgba(0,0,0,0.45)", borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
    igCarouselText: { color: "#FFF", fontSize: 9, fontFamily: "Inter_600SemiBold" },
    igActions: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingTop: 8 },
    igActionsLeft: { flexDirection: "row", alignItems: "center", gap: 14 },
    igCaption: { paddingHorizontal: 12, paddingTop: 6, gap: 3 },
    igLikedRow: { flexDirection: "row", alignItems: "center", gap: 5 },
    igLikedDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: "#D9D9D9" },
    igLiked: { fontSize: 10, color: "#262626", fontFamily: "Inter_600SemiBold", flex: 1 },
    igCapText: { fontSize: 10, color: "#262626", lineHeight: 14 },
    igCapHandle: { fontFamily: "Inter_700Bold" },
    igTabs: { position: "absolute", bottom: 0, left: 0, right: 0, height: 34, flexDirection: "row", alignItems: "center", justifyContent: "space-around", borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#E5E5E5", backgroundColor: "#FFF" },

    sheetStage: { flex: 1, width: "100%", justifyContent: "flex-end" },
    sheet: { width: "100%", backgroundColor: "#D2D2D7", borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 14, paddingBottom: 16, paddingTop: 8, gap: 12 },
    sheetGrabber: { width: 36, height: 4, borderRadius: 2, backgroundColor: "#A9A9AE", alignSelf: "center" },
    sheetTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#1C1C1E", marginBottom: 2 },
    sheetSearch: { flexDirection: "row", alignItems: "center", backgroundColor: "#E9E9EC", borderRadius: 10, paddingHorizontal: 10, height: 32, gap: 8 },
    sheetSearchLine: { flex: 1, height: 6, borderRadius: 3, backgroundColor: "#C7C7CC" },
    sheetSearchIcon: { width: 26, height: 26, borderRadius: 13, backgroundColor: "#E9E9EC", alignItems: "center", justifyContent: "center" },
    sheetPill: { alignSelf: "flex-start", backgroundColor: "#E9E9EC", borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6 },
    contactGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "space-between" },
    contactRow: { flexDirection: "row", gap: 12, justifyContent: "space-between" },
    contactCell: { alignItems: "center", gap: 6, width: 52 },
    contactCircle: { width: 46, height: 46, borderRadius: 23, backgroundColor: "#C2C2C7" },
    contactLine: { width: 30, height: 5, borderRadius: 3, backgroundColor: "#AEAEB2" },
    actionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingTop: 4 },
    appRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingTop: 4 },
    actionIconWrap: { alignItems: "center", width: 56, gap: 5 },
    actionIcon: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
    actionIconImg: { borderRadius: 14, borderWidth: 1, borderColor: "rgba(0,0,0,0.06)" },
    actionIconHi: { shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.18, shadowRadius: 5, elevation: 4 },
    actionHit: { position: "absolute", width: 48, height: 48, borderRadius: 24 },
    actionLabel: { fontSize: 9, color: "#1C1C1E", textAlign: "center" },
    gmailGlyph: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#EA4335" },

    linkPreview: { flexDirection: "row", alignItems: "center", backgroundColor: "#E9E9EC", borderRadius: 12, padding: 10, gap: 10 },
    linkIconWrap: { width: 34, height: 34, borderRadius: 8, overflow: "hidden", alignItems: "center", justifyContent: "center" },
    igLinkIcon: { width: 34, height: 34, borderRadius: 8, backgroundColor: "#E1306C", alignItems: "center", justifyContent: "center" },
    nomLinkIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#E05520", alignItems: "center", justifyContent: "center" },
    nomLinkIconText: { color: "#FFF", fontFamily: "Inter_700Bold", fontSize: 11 },
    linkTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#1C1C1E" },
    linkUrl: { fontSize: 11, color: "#8E8E93", marginTop: 1 },

    urlRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: "#F1F3F4" },
    urlBar: { flex: 1, flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#FFFFFF", borderRadius: 14, paddingHorizontal: 10, height: 26 },
    urlText: { fontSize: 10, color: "#3C4043", flex: 1 },
    urlTab: { width: 18, height: 18, borderRadius: 5, borderWidth: 1.5, borderColor: "#5F6368", alignItems: "center", justifyContent: "center" },
    urlTabText: { fontSize: 9, color: "#5F6368", fontFamily: "Inter_700Bold" },
    siteHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 8 },
    nomLogo: { width: 30, height: 30, borderRadius: 15, backgroundColor: "#E05520", alignItems: "center", justifyContent: "center" },
    nomLogoText: { color: "#FFF", fontFamily: "Inter_700Bold", fontSize: 11 },
    siteHeaderRight: { flexDirection: "row", gap: 12 },
    crumbs: { paddingHorizontal: 12, paddingBottom: 6 },
    crumb: { fontSize: 9, color: "#7A7A7A" },
    articleTitle: { paddingHorizontal: 12, fontSize: 19, fontFamily: "Inter_700Bold", color: "#1A1A1A", lineHeight: 23 },
    articleDesc: { paddingHorizontal: 12, paddingTop: 8, fontSize: 11, color: "#444", lineHeight: 16 },
    articleBy: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingTop: 12 },
    nomLogoSmall: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#E05520", alignItems: "center", justifyContent: "center" },
    nomLogoSmallText: { color: "#FFF", fontFamily: "Inter_700Bold", fontSize: 8 },
    articleByText: { fontSize: 8, fontFamily: "Inter_700Bold", color: "#333", flex: 1, letterSpacing: 0.3 },
    reviewRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingTop: 8 },
    stars: { color: "#E05520", fontSize: 13, letterSpacing: 1 },
    reviewCount: { fontSize: 10, color: "#666" },
    jumpBtn: { marginHorizontal: 12, marginTop: 12, backgroundColor: "#1A1A1A", borderRadius: 20, paddingVertical: 9, alignItems: "center" },
    jumpBtnText: { color: "#FFF", fontFamily: "Inter_600SemiBold", fontSize: 11 },
    articlePhoto: { width: "100%", height: 80, marginTop: 12 },

    dropdown: { position: "absolute", top: 36, right: 8, left: 70, backgroundColor: "#FFF", borderRadius: 12, paddingVertical: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 8 },
    dropdownTop: { flexDirection: "row", justifyContent: "space-around", paddingHorizontal: 8, paddingBottom: 8 },

    camStatusBar: {
        height: 22,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingTop: 4,
        backgroundColor: "#000000",
    },
    camStatusTime: { color: "#FFF", fontFamily: "Inter_600SemiBold", fontSize: 10 },
    camStatusRight: { flexDirection: "row", alignItems: "center", gap: 3 },
    camBattery: { width: 18, height: 9, borderRadius: 2, borderWidth: 1, borderColor: "#FFF", overflow: "hidden", justifyContent: "center", paddingHorizontal: 1 },
    camBatteryFill: { width: "75%", height: 5, borderRadius: 1, backgroundColor: "#34C759" },
    camBatteryText: { color: "#FFF", fontSize: 9, fontFamily: "Inter_500Medium" },
    camHeader: {
        height: 30,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        backgroundColor: "#000000",
    },
    camViewfinder: {
        flex: 1,
        width: "100%",
        position: "relative",
        overflow: "hidden",
        backgroundColor: "#161616",
        alignItems: "center",
        justifyContent: "center",
    },
    camViewfinderImage: {
        width: "100%",
        height: "100%",
    },
    camBottomPanel: {
        backgroundColor: "#000000",
        paddingVertical: 8,
        paddingHorizontal: 16,
        alignItems: "center",
        gap: 6,
    },
    zoomRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        marginBottom: 2,
    },
    zoomItem: {
        color: "#9CA3AF",
        fontSize: 11,
        fontFamily: "Inter_600SemiBold",
    },
    zoomItemActive: {
        backgroundColor: "#262626",
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#FF6B35",
    },
    zoomTextActive: {
        color: "#FF6B35",
        fontSize: 11,
        fontFamily: "Inter_700Bold",
    },
    camShutterRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        paddingHorizontal: 20,
    },
    camSideBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#1C1C1E",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
    },
    galleryThumb: {
        width: "100%",
        height: "100%",
        borderRadius: 18,
    },
    shutterWrap: {
        width: 60,
        height: 60,
        position: "relative",
        alignItems: "center",
        justifyContent: "center",
    },
    realShutterOuter: {
        width: 60,
        height: 60,
        borderRadius: 30,
        borderWidth: 4,
        borderColor: "#FFFFFF",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "transparent",
    },
    realShutterInner: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: "#FFFFFF",
    },
    modesRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
        marginTop: 2,
    },
    modeText: {
        color: "#9CA3AF",
        fontSize: 10,
        fontFamily: "Inter_600SemiBold",
    },
    modeTextActive: {
        color: "#FF6B35",
        fontFamily: "Inter_700Bold",
    },
    dropdownTopIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#F1F3F4", alignItems: "center", justifyContent: "center" },
    menuItem: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 8 },
    menuItemText: { fontSize: 11, color: "#3C4043", flex: 1 },
    menuDivider: { height: StyleSheet.hairlineWidth, backgroundColor: "#E5E5E5", marginVertical: 4 },

    camTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 8 },
    camTopText: { color: "#FFF", fontFamily: "Inter_600SemiBold", fontSize: 12 },
    viewfinder: { flex: 1, margin: 16, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center", justifyContent: "center", position: "relative" },
    corner: { position: "absolute", width: 22, height: 22, borderColor: ORANGE },
    cornerTL: { top: 8, left: 8, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 6 },
    cornerTR: { top: 8, right: 8, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 6 },
    cornerBL: { bottom: 8, left: 8, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 6 },
    cornerBR: { bottom: 8, right: 8, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 6 },
    recipeCard: { backgroundColor: "#FFF8EC", borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12, width: "78%", borderWidth: 1, borderColor: "#E8D9B5" },
    recipeCardTitle: { fontFamily: "Inter_700Bold", fontSize: 12, color: "#3A2E1A", marginBottom: 6, textAlign: "center" },
    recipeCardLine: { fontFamily: "Inter_400Regular", fontSize: 10, color: "#5B4A2E", lineHeight: 16 },
    shutterRow: { height: 70, alignItems: "center", justifyContent: "center" },
    shutter: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#FFF", borderWidth: 4, borderColor: ORANGE, alignItems: "center", justifyContent: "center" },

    overlayDim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(20,20,25,0.28)", alignItems: "center", justifyContent: "center" },
    importCard: { width: 150, height: 150, backgroundColor: "#FFFFFF", borderRadius: 26, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 10 },
    importArt: { width: 80, height: 70, position: "relative", alignItems: "center", justifyContent: "center" },
    importSpin: { width: 70, height: 60, position: "relative" },
    blob: { position: "absolute", width: 22, height: 22, borderRadius: 11 },
    importSparkle: { position: "absolute", top: 0, right: 6 },
    importText: { marginTop: 8, fontFamily: "Inter_600SemiBold", fontSize: 12, color: "#4B5563" },

    button: { width: "100%", backgroundColor: ORANGE, paddingVertical: 17, borderRadius: 16, alignItems: "center", shadowColor: ORANGE_DARK, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
    buttonText: { color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 17 },
});
