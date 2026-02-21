import { Stack } from "expo-router";

export default function OnboardingLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: "#0A0A0F" },
                animation: "fade",
            }}
        >
            <Stack.Screen name="welcome" />
            <Stack.Screen name="demo" />
            <Stack.Screen name="first-save" />
        </Stack>
    );
}
