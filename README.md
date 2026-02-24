# 🍳 SnapRecipes: Any Recipe, Instantly.

SnapRecipes is a premium mobile experience designed to help you save any recipe from across the web, social media, or physical cookbooks using state-of-the-art AI extraction.

![SnapRecipes Header](https://placeholder.com/header-image)

## ✨ Core Features

### 🌐 Instant Web Extraction
Extract clean, structured recipes from any URL. 
- **Universal Support**: Works with AllRecipes, Food Network, blogs, and more.
- **Social Media Support**: Extract ingredients from Instagram Reels and TikTok videos.
- **Smart Formatting**: AI-powered parsing ensures you get perfect quantities, units, and clear instructions every time.

### 📸 AI Camera Scanner
Scan physical recipes in seconds.
- **OCR + AI Analysis**: Take a photo of a cookbook, magazine, or even a handwritten note.
- **Screen Scanning**: Point your camera at a tablet or computer screen to instantly "digitize" a recipe.

### 👨‍🍳 interactive Cook Mode
A dedicated, distraction-free interface for the kitchen.
- **Step-by-Step Guidance**: Check off steps as you go so you never lose your place.
- **Ingredient Checklist**: Track what you've already added.
- **Dynamic Serving Scaling**: Instantly multiply portions (2x, 3x, or half) and the AI automatically recalculates all ingredient quantities.

### 📁 Smart Collections
Organize your recipes your way.
- **Custom Folders**: Create collections with custom icons and colors.
- **Easy Sorting**: Keep your "Weeknight Dinners" separate from "Baking Projects."

### ☁️ Cloud Sync (Pro)
Keep your recipes with you everywhere.
- **Automatic Sync**: Uses Supabase to securely back up your recipes.
- **Multi-Device**: Access your collection across all your iOS and Android devices.
- **Subscription Management**: Integrated with **RevenueCat** for a seamless Pro experience.

---

## 🛠️ Tech Stack

- **Framework**: [Expo 54](https://expo.dev/) (React Native)
- **Routing**: Expo Router (File-based routing)
- **Styling**: [NativeWind](https://www.nativewind.dev/) (Tailwind CSS for React Native)
- **Database**: 
  - **Local**: Expo SQLite (Offline-first approach)
  - **Cloud**: Supabase PostgreSQL
- **Backend**: Supabase Edge Functions (Deno runtime)
- **AI Integration**: 
  - Gemini 2.5 Flash
  - GPT-4o
- **Payments**: RevenueCat
- **Animations**: React Native Reanimated

---

## 📂 Project Structure

```text
├── app/                  # Expo Router screens (Tabs, Auth, Recipe Details)
├── components/           # Reusable UI components (CookMode, ServingScaler, etc.)
├── db/                   # SQLite schema and client configuration
├── hooks/                # Custom React hooks (useRecipes, useRevenueCat, etc.)
├── lib/                  # Core logic (AI Extraction, Cloud Sync, Scraping)
├── supabase/             # Edge Functions and Database migrations
└── assets/               # Branding, icons, and static images
```

---

## 🚀 Getting Started

1. **Clone the repository**
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Set up Environment Variables**:
   Create a `.env` file with your keys:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
4. **Start the development server**:
   ```bash
   npx expo start
   ```

---

## 🛠️ Recent Improvements
- **Universal Scraping**: Optimized extraction for AllRecipes by increasing content limits to 40K chars.
- **Social Media Fallbacks**: Integrated Jina Reader and Bing Search enrichment to bypass Cloudflare and bot protections.
- **Layout Refinement**: Fixed ingredient data overlap in Cook Mode and standardizing tap targets in the Collection Picker.

---

*SnapRecipes - Save any recipe, instantly.*
