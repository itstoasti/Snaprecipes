import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Browse Recipes | No ads, just recipes",
    description: "No life stories, no ads, just recipes. Discover delicious recipes shared by the Snap Recipes community.",
    openGraph: {
        title: "Browse Recipes | No ads, just recipes",
        description: "No life stories, no ads, just recipes. Shared by the Snap Recipes community.",
    },
};

export default function RecipesLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
