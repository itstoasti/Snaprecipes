import { Stack } from "expo-router";

export default function OnboardingLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: "#FAF7F2" },
                animation: "slide_from_right",
            }}
        >
            <Stack.Screen name="welcome" />
            <Stack.Screen name="reviews" />
            <Stack.Screen name="goals" />
            <Stack.Screen name="goal-stat" />
            <Stack.Screen name="goal-affirmation" />
            <Stack.Screen name="cooking-time" />
            <Stack.Screen name="notifications" />
            <Stack.Screen name="attribution" />
            <Stack.Screen name="attribution-social" />
            <Stack.Screen name="influencer-search" />
            <Stack.Screen name="recipe-sources" />
            <Stack.Screen name="import-teaser" />
            <Stack.Screen name="interactive-guide" />
            <Stack.Screen name="age-group" />
            <Stack.Screen name="referral-code" />
            <Stack.Screen name="setup-loading" />
            <Stack.Screen name="transformation-graph" />
            <Stack.Screen name="paywall-sequence" />
            <Stack.Screen name="create-account" />
            <Stack.Screen name="demo" />
            <Stack.Screen name="first-save" />
        </Stack>
    );
}
