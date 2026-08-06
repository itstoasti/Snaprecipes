import React, { createContext, useContext, useState } from "react";

export interface OnboardingState {
    goals: string[];
    cookingThoughtTime: string;
    notificationAllowed: boolean;
    acquisitionChannel: string;
    socialSource: string; // 'Instagram Ad', 'Influencer', 'Other'
    influencerName: string;
    recipeSources: string[]; // 'social', 'websites', 'printed'
    ageGroup: string;
    referralCode: string;
    trialPlan: "free_7day" | "trial_30day_199";
    reminderEnabled: boolean;
}

interface OnboardingContextType {
    state: OnboardingState;
    setGoals: (goals: string[]) => void;
    setCookingThoughtTime: (time: string) => void;
    setNotificationAllowed: (allowed: boolean) => void;
    setAcquisitionChannel: (channel: string) => void;
    setSocialSource: (source: string) => void;
    setInfluencerName: (name: string) => void;
    setRecipeSources: (sources: string[]) => void;
    setAgeGroup: (age: string) => void;
    setReferralCode: (code: string) => void;
    setTrialPlan: (plan: "free_7day" | "trial_30day_199") => void;
    setReminderEnabled: (enabled: boolean) => void;
}

const defaultState: OnboardingState = {
    goals: [],
    cookingThoughtTime: "",
    notificationAllowed: true,
    acquisitionChannel: "",
    socialSource: "",
    influencerName: "",
    recipeSources: ["social", "websites"],
    ageGroup: "",
    referralCode: "",
    trialPlan: "trial_30day_199",
    reminderEnabled: true,
};

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export const OnboardingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, setState] = useState<OnboardingState>(defaultState);

    const setGoals = (goals: string[]) => setState((prev) => ({ ...prev, goals }));
    const setCookingThoughtTime = (time: string) => setState((prev) => ({ ...prev, cookingThoughtTime: time }));
    const setNotificationAllowed = (allowed: boolean) => setState((prev) => ({ ...prev, notificationAllowed: allowed }));
    const setAcquisitionChannel = (channel: string) => setState((prev) => ({ ...prev, acquisitionChannel: channel }));
    const setSocialSource = (source: string) => setState((prev) => ({ ...prev, socialSource: source }));
    const setInfluencerName = (name: string) => setState((prev) => ({ ...prev, influencerName: name }));
    const setRecipeSources = (sources: string[]) => setState((prev) => ({ ...prev, recipeSources: sources }));
    const setAgeGroup = (age: string) => setState((prev) => ({ ...prev, ageGroup: age }));
    const setReferralCode = (code: string) => setState((prev) => ({ ...prev, referralCode: code }));
    const setTrialPlan = (plan: "free_7day" | "trial_30day_199") => setState((prev) => ({ ...prev, trialPlan: plan }));
    const setReminderEnabled = (enabled: boolean) => setState((prev) => ({ ...prev, reminderEnabled: enabled }));

    return (
        <OnboardingContext.Provider
            value={{
                state,
                setGoals,
                setCookingThoughtTime,
                setNotificationAllowed,
                setAcquisitionChannel,
                setSocialSource,
                setInfluencerName,
                setRecipeSources,
                setAgeGroup,
                setReferralCode,
                setTrialPlan,
                setReminderEnabled,
            }}
        >
            {children}
        </OnboardingContext.Provider>
    );
};

export const useOnboarding = () => {
    const context = useContext(OnboardingContext);
    if (!context) {
        throw new Error("useOnboarding must be used within an OnboardingProvider");
    }
    return context;
};
