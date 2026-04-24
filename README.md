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

### 🥗 Automated Nutrition Facts
No more guessing. SnapRecipes automatically extracts and displays full nutritional profiles for your saved recipes.
- **Macro Tracking**: View Calories, Protein, Fat, and Carbs at a glance.
- **Micro Detail**: Tracks Sugar, Fiber, and Sodium levels.
- **Dynamic Scaling**: Nutrition facts automatically update when you use the serving scaler.

### 🛒 Smart Shopping Lists
Never forget an ingredient again. The most advanced shopping list experience for home cooks.
- **Recipe Integration**: Add all ingredients from a recipe to your list with one tap.
- **Intelligent Aggregation**: Automatically merges similar items (e.g., "1 cup flour" from one recipe + "2 cups flour" from another = "3 cups flour" on your list).
- **Meal Plan Sync**: Automatically generate a complete shopping list for your entire week's meal plan.
- **Categorized View**: Items are organized by grocery section (Produce, Dairy, Pantry, etc.) for efficient shopping.

### 📅 Advanced Meal Planning
Plan your week with ease and stay organized.
- **Calendar View**: Schedule recipes for specific dates (Breakfast, Lunch, or Dinner).
- **Serving Awareness**: Adjust planned servings per day, which automatically updates your generated shopping list.
- **Batch Preparation**: Designed to support "Meal Prep" workflows with dedicated list generation.

### 👨‍🍳 Interactive Cook Mode
A dedicated, distraction-free interface for the kitchen.
- **Step-by-Step Guidance**: Check off steps as you go so you never lose your place.
- **Ingredient Checklist**: Track what you've already added.
- **Dynamic Serving Scaling**: Instantly multiply portions (2x, 3x, or half); the AI automatically recalculates all ingredient quantities in real-time.
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
│   ├── library/          # Advanced tools: Shopping List, Meal Prep
│   └── recipe/           # Detailed views: Cook Mode, Serving Scaler
├── website/              # Next.js web application (Public Feed, Marketing)
├── components/           # Shared UI components (Glassmorphism, CookMode, etc.)
├── db/                   # SQLite schema and database clients
├── hooks/                # Custom hooks (useRecipes, useShoppingList, useMealPlans)
├── lib/                  # Core logic (AI Extraction, Image Caching, Sync)
├── supabase/             # Edge Functions and Database migrations
└── assets/               # Branding, icons, and static images
```

---

## 🚀 Recent Updates
- **🥗 Nutrition & Macros**: Added automated extraction and real-time scaling for nutritional data.
- **🛒 Shopping List 2.0**: Implemented intelligent ingredient aggregation and meal-plan integration.
- **📅 Meal Planning Engine**: Launched a new system for scheduling recipes and managing meal prep.
- **🖼️ Image Caching Pipeline**: Built a robust system to download and persist social media images to permanent storage.
- **🚀 Website Optimization**: Launched the public community feed with SEO optimization and ad-free browsing.

---

*SnapRecipes - Save any recipe, instantly.*
