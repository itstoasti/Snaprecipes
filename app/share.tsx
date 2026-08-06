import React, { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

export default function ShareScreen() {
    const { url } = useLocalSearchParams<{ url: string }>();
    const router = useRouter();

    useEffect(() => {
        if (url) {
            router.replace({ pathname: "/extracting", params: { url } });
        } else {
            router.replace("/");
        }
    }, [url]);

    return (
        <View className="flex-1 bg-surface-950 items-center justify-center">
            <ActivityIndicator size="large" color="#FF6B35" />
        </View>
    );
}
