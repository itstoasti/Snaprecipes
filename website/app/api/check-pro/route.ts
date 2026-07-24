import { NextRequest, NextResponse } from "next/server";

// This API route runs SERVER-SIDE only. The RevenueCat secret key
// is never exposed to the browser.
export async function GET(request: NextRequest) {
    const userId = request.nextUrl.searchParams.get("user_id");

    if (!userId) {
        return NextResponse.json({ isPro: false, error: "Missing user_id" }, { status: 400 });
    }

    const secretKey = process.env.REVENUECAT_SECRET_KEY;
    if (!secretKey) {
        console.error("REVENUECAT_SECRET_KEY not set in environment");
        return NextResponse.json({ isPro: false, error: "Server configuration error" }, { status: 500 });
    }

    try {
        // Query RevenueCat's REST API for this subscriber's entitlements
        // Docs: https://www.revenuecat.com/reference/subscribers
        const response = await fetch(
            `https://api.revenuecat.com/v1/subscribers/${userId}`,
            {
                headers: {
                    "Authorization": `Bearer ${secretKey}`,
                    "Content-Type": "application/json",
                },
            }
        );

        if (!response.ok) {
            // 404 = user has never made a purchase (free user)
            if (response.status === 404) {
                return NextResponse.json({ isPro: false });
            }
            console.error("RevenueCat API error:", response.status, await response.text());
            return NextResponse.json({ isPro: false });
        }

        const data = await response.json();
        const entitlements = data?.subscriber?.entitlements || {};

        // Check if any entitlement is currently active (not expired)
        const now = new Date();
        const hasActiveEntitlement = Object.values(entitlements).some((ent: any) => {
            // If there's no expiration date, it's a lifetime entitlement
            if (!ent.expires_date) return true;
            return new Date(ent.expires_date) > now;
        });

        return NextResponse.json({ isPro: hasActiveEntitlement });
    } catch (error) {
        console.error("Error checking RevenueCat subscriber:", error);
        return NextResponse.json({ isPro: false });
    }
}
