import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

function getStripe() {
    return new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: "2022-11-15" as any,
    });
}

export async function POST(request: NextRequest) {
    try {
        const { priceId, userId, userEmail } = await request.json();

        if (!priceId || !userId) {
            return NextResponse.json(
                { error: "Missing priceId or userId" },
                { status: 400 }
            );
        }

        const stripeKey = process.env.STRIPE_SECRET_KEY;
        if (!stripeKey || stripeKey.includes("YOUR_STRIPE_SECRET_KEY")) {
            return NextResponse.json(
                { error: "Stripe checkout is not configured in this environment yet. Please set your Stripe Secret Key." },
                { status: 400 }
            );
        }

        const stripe = getStripe();
        const origin = request.headers.get("origin") || "http://localhost:3000";

        const session = await stripe.checkout.sessions.create({
            mode: "subscription",
            payment_method_types: ["card"],
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            // Pass the Supabase user ID so RevenueCat can map the entitlement
            metadata: {
                app_user_id: userId,
            },
            subscription_data: {
                metadata: {
                    app_user_id: userId,
                },
            },
            // Pre-fill the email if available
            ...(userEmail ? { customer_email: userEmail } : {}),
            success_url: `${origin}/dashboard?checkout=success`,
            cancel_url: `${origin}/dashboard?checkout=cancelled`,
        });

        return NextResponse.json({ url: session.url });
    } catch (error: any) {
        console.error("Stripe checkout error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to create checkout session" },
            { status: 500 }
        );
    }
}
