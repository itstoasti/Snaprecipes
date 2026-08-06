import React, { useEffect, useState, useCallback } from "react";
import { View, Text, Pressable, Image, Platform, StatusBar } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn, SlideInDown } from "react-native-reanimated";
import { WebView } from "react-native-webview";

const videoModule = require("../../assets/recipe_header_video.mp4");

export default function WelcomeScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [videoUri, setVideoUri] = useState<string | null>(null);
    const [webviewKey, setWebviewKey] = useState(0);

    useEffect(() => {
        try {
            const resolved = Image.resolveAssetSource(videoModule);
            if (resolved?.uri) {
                setVideoUri(resolved.uri);
            }
        } catch (e) {
            console.warn("[WelcomeScreen] Error resolving video asset:", e);
        }
    }, []);

    const handleWebViewError = useCallback(() => {
        setWebviewKey((k) => k + 1);
    }, []);

    const handleGetStarted = () => {
        router.push("/onboarding/reviews");
    };

    const handleLogin = () => {
        router.push("/auth");
    };

    // Exactly matches website HeroSection styling: object-fit: contain with #000000 background
    const buildVideoHtml = (uri: string) => `
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { width: 100%; height: 100%; overflow: hidden; background: #000000; }
        video {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            object-fit: contain;
            background: #000000;
        }
    </style>
</head>
<body>
    <video src="${uri}" autoplay loop muted playsinline webkit-playsinline></video>
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            var v = document.querySelector('video');
            if (v) {
                v.muted = true;
                v.play().catch(function() {
                    setTimeout(function() { v.play(); }, 300);
                });
            }
        });
    </script>
</body>
</html>`;

    return (
        <View
            className="flex-1 bg-[#FAF7F2] justify-between px-6 pb-8"
            style={{ paddingTop: Math.max(insets.top, Platform.OS === "android" ? StatusBar.currentHeight || 0 : 16) }}
        >
            {/* Header Logo */}
            <Animated.View entering={FadeIn.duration(800)} className="items-center pt-4">
                <View className="flex-row items-center justify-center space-x-2.5 mb-3">
                    <View className="w-10 h-10 rounded-2xl overflow-hidden shadow-md border border-gray-200">
                        <Image
                            source={require("../../assets/icon.png")}
                            className="w-full h-full"
                            resizeMode="cover"
                        />
                    </View>
                    <Text className="text-[#1F2937] font-sans-bold text-3xl tracking-tight">SnapRecipes</Text>
                </View>
                <Text className="text-[#1F2937] font-sans-bold text-2xl text-center mb-1">
                    Welcome to SnapRecipes
                </Text>
                <Text className="text-[#4B5563] font-sans text-base text-center px-4 leading-6">
                    Save clean recipes instantly, skip long blog stories, and organize your kitchen like a pro
                </Text>
            </Animated.View>

            {/* Phone Bezel Mockup matching website aspect ratio (9 / 19.5) */}
            <Animated.View entering={SlideInDown.delay(200).duration(800)} className="items-center justify-center my-auto">
                <View className="w-[280px] bg-black rounded-[44px] p-2.5 border-4 border-gray-800 shadow-2xl shadow-black/30 overflow-hidden relative">
                    {/* Speaker / Camera Notch */}
                    <View className="absolute top-3.5 self-center w-24 h-4 bg-black rounded-full z-30 flex-row items-center justify-center">
                        <View className="w-8 h-1 bg-gray-800/80 rounded-full" />
                    </View>

                    {/* Phone Screen with 9:19.5 Aspect Ratio */}
                    <View
                        className="w-full bg-black rounded-[34px] overflow-hidden"
                        style={{ aspectRatio: 9 / 19.5 }}
                    >
                        {videoUri ? (
                            <WebView
                                key={webviewKey}
                                originWhitelist={["*"]}
                                source={{ html: buildVideoHtml(videoUri) }}
                                style={{ flex: 1, backgroundColor: "#000000" }}
                                allowsInlineMediaPlayback={true}
                                mediaPlaybackRequiresUserAction={false}
                                javaScriptEnabled={true}
                                domStorageEnabled={true}
                                mixedContentMode="always"
                                allowFileAccess={true}
                                allowFileAccessFromFileURLs={true}
                                allowUniversalAccessFromFileURLs={true}
                                scrollEnabled={false}
                                bounces={false}
                                overScrollMode="never"
                                showsHorizontalScrollIndicator={false}
                                showsVerticalScrollIndicator={false}
                                onError={handleWebViewError}
                                onHttpError={handleWebViewError}
                            />
                        ) : (
                            <View className="flex-1 items-center justify-center bg-black">
                                <Image
                                    source={require("../../assets/icon.png")}
                                    className="w-16 h-16 rounded-2xl"
                                    resizeMode="cover"
                                />
                            </View>
                        )}
                    </View>
                </View>
            </Animated.View>

            {/* Bottom Actions */}
            <Animated.View entering={SlideInDown.delay(400).duration(800)} className="w-full space-y-3">
                <Pressable
                    onPress={handleGetStarted}
                    className="w-full bg-[#FF6B35] active:bg-[#E85A24] py-4 rounded-2xl items-center shadow-lg shadow-orange-500/25"
                >
                    <Text className="text-[#FFFFFF] font-sans-bold text-lg">Get started</Text>
                </Pressable>

                <Pressable onPress={handleLogin} className="py-2 items-center">
                    <Text className="text-[#4B5563] font-sans text-base">
                        Already have an account? <Text className="text-[#FF6B35] font-sans-bold">Log in</Text>
                    </Text>
                </Pressable>
            </Animated.View>
        </View>
    );
}
