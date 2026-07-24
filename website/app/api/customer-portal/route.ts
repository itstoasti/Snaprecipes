import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

function getStripe() {
    return new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: "2022-11-15" as any,
    });
}

export async function POST(request: NextRequest) {
    try {
        const { userId } = await request.json();

        if (!userId) {
            return NextResponse.json(
                { error: "Missing userId" },
                { status: 400 }
            );
        }

        const stripeKey = process.env.STRIPE_SECRET_KEY;
        if (!stripeKey || stripeKey.includes("YOUR_STRIPE_SECRET_KEY")) {
            return NextResponse.json(
                { error: "Stripe billing portal is not configured in this environment yet. Please set your Stripe Secret Key." },
                { status: 400 }
            );
        }

        const stripe = getStripe();
        const origin = request.headers.get("origin") || "http://localhost:3000";

        // Search for the Stripe customer by app_user_id metadata
        const customers = await stripe.customers.search({
            query: `metadata["app_user_id"]:"${userId}"`,
        });

        if (!customers.data || customers.data.length === 0) {
            return NextResponse.json(
                { error: "No subscription found. You may not have an active plan yet." },
                { status: 404 }
            );
        }

        const customerId = customers.data[0].id;

        const portalSession = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: `${origin}/dashboard`,
        });

        return NextResponse.json({ url: portalSession.url });
    } catch (error: any) {
        console.error("Stripe customer portal error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to create portal session" },
            { status: 500 }
        );
    }
}
