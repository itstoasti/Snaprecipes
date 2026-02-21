import CameraScanner from "@/components/CameraScanner";
import { Stack } from "expo-router";

export default function CameraScreen() {
    return (
        <>
            <Stack.Screen options={{ headerShown: false, animation: "slide_from_bottom" }} />
            <CameraScanner />
        </>
    );
}
