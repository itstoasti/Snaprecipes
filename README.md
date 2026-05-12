# 🍳 SnapRecipes: Any Recipe, Instantly.

SnapRecipes is a premium mobile and web experience designed to help you save any recipe from across the web, social media, or physical cookbooks using state-of-the-art AI extraction. No life stories, no ads—just recipes.

![SnapRecipes Header](https://www.snaprecipes.xyz/og-image.png)

## ✨ Core Features

### 🌐 Universal AI Recipe Extraction
Extract clean, structured recipes from any URL or photo with a single tap.
- **Social Media Support**: First-class support for **Instagram Reels**, **TikTok**, and **Facebook** videos.
- **Smart Enrichment**: Uses a multi-stage pipeline (Jina Reader + Gemini AI / GPT-4o) to bypass bot protections and extract high-fidelity data.
- **AI Engine Selection**: Choose between **Gemini Flash** or **GPT-4o** in settings for your preferred extraction logic.
- **Persistent Media**: Automatically caches ephemeral social media images to **Supabase Storage**, ensuring your recipe photos never expire or break.

### 🥗 Calorie Counter & Nutrition Tracking
The all-in-one kitchen companion now tracks your nutrition automatically.
- **Integrated Food Log**: Log your saved recipes or search a global database of foods to track your daily intake.
- **Macro Breakdown**: Clear, color-coded tracking for **Protein, Carbs, and Fat** (fully spelled out for clarity).
- **Personalized Health Profile**: Set custom calorie and macro goals based on your weight, height, age, and activity level.
- **Unit System Support**: Full support for both **Imperial (lbs, ft/in)** and **Metric (kg, cm)** systems with a seamless toggle.

### 📚 Cookbook Collections
Organize your kitchen into premium digital cookbooks.
- **Dedicated Detail Screens**: Navigate into focused collection views with custom headers and back buttons—no more clunky filters.
- **Easy Management**: Add or remove recipes from collections with a single tap.

### 👨‍🍳 Interactive Cook Mode
A dedicated, distraction-free interface for the kitchen.
- **Step-by-Step Guidance**: Check off steps as you go so you never lose your place.
- **Ingredient Checklist**: Track what you've already added.
- **Dynamic Serving Scaling**: Instantly multiply portions (2x, 3x, or half); the AI automatically recalculates all ingredient quantities in real-time.
- **Glassmorphism UI**: A premium, blur-heavy aesthetic that feels modern and high-end.

### 🛒 Smart Shopping Lists & Meal Planning
- **Recipe Integration**: Add all ingredients from a recipe to your list with one tap.
- **Intelligent Aggregation**: Automatically merges similar items (e.g., "1 cup flour" + "2 cups flour" = "3 cups flour").
- **Weekly Planner**: Schedule recipes for Breakfast, Lunch, or Dinner and auto-generate shopping lists.

---

## 🛠️ Tech Stack

### Mobile (App)
- **Framework**: [Expo 54](https://expo.dev/) (React Native)
- **Routing**: Expo Router (File-based)
- **Styling**: [NativeWind](https://www.nativewind.dev/) (Tailwind CSS)
- **Database**: Expo SQLite (Local) + Supabase (Cloud Sync)
- **Payments**: RevenueCat

### Website & Backend
- **Web**: [Next.js 15](https://nextjs.org/) (App Router)
- **Backend**: Supabase Edge Functions (Deno / TypeScript)
- **AI Models**: Gemini 1.5 Flash & GPT-4o

---

## 📂 Project Structure

```text
├── app/                  # Expo Router screens (App Tabs, Auth, Onboarding)
│   ├── library/          # Advanced tools: Calorie Counter, Collections, Shopping List
│   └── recipe/           # Detailed views: Cook Mode, Serving Scaler
├── components/           # Shared UI components (Glassmorphism, CookMode, etc.)
├── db/                   # SQLite schema and database clients
├── hooks/                # Custom hooks (useRecipes, useFoodLog, useMealPlans)
├── lib/                  # Core logic (AI Extraction, Image Caching, Sync)
├── supabase/             # Edge Functions and Database migrations
└── assets/               # Branding, icons, and static images
```

---

## 🚀 Recent Updates (v5.2.0)
- **🥗 Health Profile 2.0**: Added personalized goal calculation with a new Imperial/Metric unit toggle.
- **📚 Cookbook Navigation**: Redesigned cookbook browsing with dedicated detail screens for a cleaner UI.
- **📊 Calorie Counter Integration**: Launched the full food logging system integrated directly with your recipe library.
- **🎨 UI Refinement**: Modernized the settings and recipe tabs, removing obsolete maintenance tools and streamlining the engine selection.
- **🖼️ Image Persistence**: Optimized the background pipeline for saving Instagram/TikTok images to permanent cloud storage.

---

*SnapRecipes - Save any recipe, instantly.*
