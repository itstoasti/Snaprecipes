import { useState, useCallback, useEffect } from "react";
import * as SecureStore from "expo-secure-store";
import * as StoreReview from "expo-store-review";
import { Alert, Linking, Platform } from "react-native";

const REVIEW_TRACKER_STORE = "snaprecipes_review_tracker";

interface ReviewTrackerState {
    recipesSavedCount: number;
    hasBeenAsked: boolean;
    lastAskedDate: string | null;
}

const DEFAULT_STATE: ReviewTrackerState = {
    recipesSavedCount: 0,
    hasBeenAsked: false,
    lastAskedDate: null,
};

export function useAppReview() {
    const [trackerState, setTrackerState] = useState<ReviewTrackerState>(DEFAULT_STATE);
    const [showPrePrompt, setShowPrePrompt] = useState(false);

    useEffect(() => {
        loadTrackerState();
    }, []);

    const loadTrackerState = async () => {
        try {
            const stored = await SecureStore.getItemAsync(REVIEW_TRACKER_STORE);
            if (stored) {
                setTrackerState(JSON.parse(stored));
            }
        } catch (e) {
            console.error("Failed to load review tracker state", e);
        }
    };

    const saveTrackerState = async (newState: ReviewTrackerState) => {
        try {
            await SecureStore.setItemAsync(REVIEW_TRACKER_STORE, JSON.stringify(newState));
            setTrackerState(newState);
        } catch (e) {
            console.error("Failed to save review tracker state", e);
        }
    };

    /**
     * Should be called every time a recipe is successfully saved/imported.
     */
    const recordSuccessfulSave = async () => {
        // Read directly from disk first to prevent race conditions on screen mount
        let currentState = trackerState;
        try {
            const stored = await SecureStore.getItemAsync(REVIEW_TRACKER_STORE);
            if (stored) {
                currentState = JSON.parse(stored);
            }
        } catch (e) {}

        const newState = {
            ...currentState,
            recipesSavedCount: currentState.recipesSavedCount + 1,
        };
        
        await saveTrackerState(newState);
        
        if (__DEV__) {
            console.log(`[ReviewTracker] Recipe saved. Total count is now: ${newState.recipesSavedCount}`);
        }
        
        return checkShouldPrompt(newState);
    };

    /**
     * Evaluates if the predefined milestones have been hit to ask for a review.
     */
    const checkShouldPrompt = async (state: ReviewTrackerState) => {
        // We removed the StoreReview.isAvailableAsync() check from here.
        // Even if the native App Store review prompt is unavailable (like in Expo Go),
        // we STILL want to show our beautiful custom Pre-Prompt Modal for testing or collecting internal feedback!

        // Smart Cooldown: Avoid pestering the user too often.
        if (state.hasBeenAsked) {
            // Permanent Mute: They already said "Yes, I Love It" or left a real App Store review.
            if (__DEV__) {
                console.log("[ReviewTracker] User has already permanently accepted the prompt, but showing anyway for testing.");
            } else {
                return;
            }
        }

        if (state.lastAskedDate) {
            // 2-Month Cooldown: They previously said "Needs Some Work".
            // Give them 60 days of peace before asking if we've improved!
            const lastAsked = new Date(state.lastAskedDate).getTime();
            const now = new Date().getTime();
            const daysSinceAsked = (now - lastAsked) / (1000 * 60 * 60 * 24);
            
            if (daysSinceAsked < 60) {
                if (__DEV__) {
                    console.log(`[ReviewTracker] User is on 2-month cooldown (${Math.floor(daysSinceAsked)} days so far), but showing anyway for testing.`);
                } else {
                    return;
                }
            }
        }

        // Milestone 1: User has successfully saved 3 recipes.
        // They clearly understand the core value prop of the app.
        if (state.recipesSavedCount >= 3 || __DEV__) {
            if (__DEV__) console.log("[ReviewTracker] Criteria met! Triggering Smart Review Pre-Prompt.");
            // Trigger the custom Pre-Prompt Modal!
            setShowPrePrompt(true);
        }
    };

    const handlePrePromptResponse = async (isPositive: boolean | null) => {
        setShowPrePrompt(false);

        // If they click "Not right now" (null), we DO NOT mark them as permanently asked.
        // Instead, we reset their total saved count to 0 so they get exactly 3 more 
        // recipes of peace and quiet before the prompt naturally triggers again.
        if (isPositive === null) {
            await saveTrackerState({
                ...trackerState,
                recipesSavedCount: 0,
            });
            return;
        }

        if (isPositive === false) {
             // 6-Month Cooldown: They said "Needs Some Work".
             // Reset recipe count to 0, record today's date so they get 180 days of peace,
             // but keep hasBeenAsked as false so they CAN be asked again eventually.
             await saveTrackerState({
                ...trackerState,
                recipesSavedCount: 0,
                hasBeenAsked: false, 
                lastAskedDate: new Date().toISOString(),
            });
            return;
        }

        // PERMANENT MUTE: They officially clicked "Yes" (true)
        // We mark them as asked so we practically never bother them again.
        await saveTrackerState({
            ...trackerState,
            hasBeenAsked: true,
            lastAskedDate: new Date().toISOString(),
        });

        if (isPositive === true) {
            // The user loves the app! Trigger the official native OS review popup.
            try {
                const isAvailable = await StoreReview.isAvailableAsync();
                const hasAction = await StoreReview.hasAction();

                if (isAvailable && hasAction) {
                    // App is on the store — show the real native review dialog
                    await StoreReview.requestReview();
                } else {
                    // App isn't published yet (preview/dev build) or native review unavailable.
                    // Try opening the store listing directly; if that fails, show a thank-you alert.
                    const storeUrl = Platform.OS === 'ios'
                        ? 'https://apps.apple.com/app/id123456789?action=write-review' // Replace with real iOS App ID
                        : `https://play.google.com/store/apps/details?id=com.deanfieldz.yummy`;

                    const canOpen = await Linking.canOpenURL(storeUrl);
                    if (canOpen) {
                        await Linking.openURL(storeUrl);
                    } else {
                        // Preview build — store listing doesn't exist yet
                        Alert.alert(
                            '💛 Thank You!',
                            'We really appreciate your support! Once SnapRecipes is live on the app store, you\'ll be able to leave a review there.',
                            [{ text: 'Sounds good!' }]
                        );
                    }
                }
            } catch (e) {
                console.warn("Review prompt failed", e);
                Alert.alert(
                    '💛 Thank You!',
                    'We really appreciate your support! Once SnapRecipes is live on the app store, you\'ll be able to leave a review there.',
                    [{ text: 'Sounds good!' }]
                );
            }
        }
    };

    return {
        showPrePrompt,
        setShowPrePrompt,
        recordSuccessfulSave,
        handlePrePromptResponse
    };
}
