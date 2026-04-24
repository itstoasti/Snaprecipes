# 🍳 SnapRecipes: Any Recipe, Instantly.

SnapRecipes is a premium mobile and web experience designed to help you save any recipe from across the web, social media, or physical cookbooks using state-of-the-art AI extraction. No life stories, no ads—just recipes.

![SnapRecipes Header](https://www.snaprecipes.xyz/og-image.png)

## ✨ Core Features

### 🌐 Universal Recipe Extraction
Extract clean, structured recipes from any URL with a single tap.
- **Social Media Support**: First-class support for **Instagram Reels**, **TikTok**, and **Facebook** videos.
- **Smart Enrichment**: Uses a multi-stage pipeline (Jina Reader + Gemini AI) to bypass bot protections and extract high-fidelity data.
- **Persistent Media**: Automatically caches ephemeral social media images to **Supabase Storage**, ensuring your recipe photos never expire or break.

### 📸 AI Camera Scanner
Digitize physical recipes in seconds.
- **OCR + AI Analysis**: Take a photo of a cookbook, magazine, or even a handwritten note.
- **Intelligent Formatting**: AI-powered parsing ensures quantities, units, and clear instructions are captured perfectly.

### 👨‍🍳 Interactive Cook Mode
A dedicated, distraction-free interface for the kitchen.
- **Step-by-Step Guidance**: Check off steps as you go so you never lose your place.
- **Ingredient Checklist**: Track what you've already added.
- **Dynamic Serving Scaling**: Instantly multiply portions (2x, 3x, or half); the AI automatically recalculates all ingredient quantities.
- **Glassmorphism UI**: A premium, blur-heavy aesthetic that feels modern and high-end.

### 🌍 Community Feed (Web)
Browse and discover recipes shared by the community at [snaprecipes.xyz](https://www.snaprecipes.xyz/recipes).
- **Ad-Free Browsing**: A clean, lightning-fast grid of community-extracted recipes.
- **SEO Optimized**: Fully indexed pages with JSON-LD schema for Google Recipe search.
- **Graceful Fallbacks**: Automatic filtering of broken media and smart placeholder rendering.

### ☁️ Cloud Sync & Pro Features
- **Offline-First Sync**: Uses Expo SQLite for instant local access, with background sync to **Supabase**.
- **Multi-Device**: Seamlessly access your collection across iOS and Android.
- **Subscription Management**: Integrated with **RevenueCat** for a seamless Pro experience.

---

## 🛠️ Tech Stack

### Mobile (App)
- **Framework**: [Expo 54](https://expo.dev/) (React Native)
- **Routing**: Expo Router (File-based)
- **Styling**: [NativeWind](https://www.nativewind.dev/) (Tailwind CSS)
- **Database**: Expo SQLite (Local) + Supabase (Cloud)
- **Payments**: RevenueCat

### Website
- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Styling**: Tailwind CSS + Framer Motion
- **Deployment**: Optimized for high-performance direct image loading.

### Infrastructure & AI
- **Backend**: Supabase Edge Functions (TypeScript/Deno)
- **AI Models**: Gemini 1.5 Flash & GPT-4o
- **Data Extraction**: Jina Reader API + Bing Search API

---

## 📂 Project Structure

```text
├── app/                  # Expo Router screens (App Tabs, Auth, Onboarding)
├── website/              # Next.js web application (Public Feed, Marketing)
├── components/           # Shared UI components (Glassmorphism, CookMode, etc.)
├── db/                   # SQLite schema and database clients
├── hooks/                # Custom hooks (useRecipes, useSync, useRevenueCat)
├── lib/                  # Core logic (AI Extraction, Image Caching, Scraping)
├── supabase/             # Edge Functions and Database migrations
└── assets/               # Branding, icons, and static images
```

---

## 🚀 Recent Updates
- **🚀 Fixed Website Image Rendering**: Implemented a global image optimization bypass to resolve hosting constraints and ensure placeholder reliability.
- **🖼️ Image Caching Pipeline**: Built a robust system to download and persist social media images from Instagram/TikTok to permanent storage.
- **🔍 Community Feed Filtering**: Updated the website to automatically omit recipes with broken or missing images for a cleaner browsing experience.
- **🎨 Premium UI Overhaul**: Implemented a consistent dark-mode aesthetic with glassmorphism and smooth Framer Motion animations across web and mobile.

---

*SnapRecipes - Save any recipe, instantly.*
