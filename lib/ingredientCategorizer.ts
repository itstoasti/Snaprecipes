export interface AislePreset {
    name: string;
    emoji: string;
    tint: string;
}

export const DEFAULT_AISLES: AislePreset[] = [
    { name: "Produce", emoji: "🥬", tint: "#34D399" },
    { name: "Meat & Seafood", emoji: "🥩", tint: "#F87171" },
    { name: "Dairy & Eggs", emoji: "🥛", tint: "#93C5FD" },
    { name: "Bakery", emoji: "🥖", tint: "#FBBF24" },
    { name: "Frozen", emoji: "❄️", tint: "#67E8F9" },
    { name: "Pantry", emoji: "🥫", tint: "#FF8C42" },
    { name: "Spices & Baking", emoji: "🧂", tint: "#C4B5FD" },
    { name: "Snacks", emoji: "🍿", tint: "#F472B6" },
    { name: "Beverages", emoji: "🥤", tint: "#5EEAD4" },
    { name: "Household", emoji: "🧽", tint: "#A3A3A3" },
    { name: "Other", emoji: "🛒", tint: "#8B8BA3" },
];

export const AISLE_EMOJI_CHOICES = [
    "🛒", "🥬", "🥩", "🥛", "🥖", "❄️", "🥫", "🧂", "🍿", "🥤", "🧽",
    "🧀", "🍎", "🥕", "🍞", "🍰", "🍫", "🍺", "🐟", "🌮", "🍕", "🍜",
    "🥚", "🧊", "🍯", "🫙", "🧺", "🪴", "🐾", "👶", "💊", "🧴",
];

const AISLE_KEYWORDS: Record<string, string[]> = {
    "Frozen": [
        "frozen", "ice cream", "gelato", "sorbet", "popsicle", "waffle", "tater tot",
        "hash brown", "fish stick", "veggie burger", "impossible", "beyond meat", "pierogi",
    ],
    "Produce": [
        "lettuce", "spinach", "kale", "arugula", "romaine", "greens", "cabbage", "bok choy",
        "tomato", "onion", "garlic", "pepper", "jalape", "chili", "carrot", "celery",
        "cucumber", "zucchini", "squash", "broccoli", "cauliflower", "brussels", "potato",
        "mushroom", "corn", "avocado", "lemon", "lime", "orange", "apple", "banana",
        "strawberr", "blueberr", "raspberr", "blackberr", "mango", "pineapple", "peach",
        "pear", "grape", "melon", "watermelon", "cherry", "plum", "kiwi", "cilantro",
        "parsley", "basil", "mint", "rosemary", "thyme", "chive", "dill", "ginger",
        "scallion", "leek", "shallot", "beet", "radish", "eggplant", "asparagus",
        "green bean", "edamame", "peas", "artichoke", "turnip", "parsnip", "salad",
        "herbs", "fresh herb", "fruit", "vegetable",
    ],
    "Meat & Seafood": [
        "chicken", "beef", "steak", "pork", "bacon", "ham", "sausage", "turkey", "lamb",
        "veal", "rib", "brisket", "thigh", "breast", "wing", "drumstick", "ground",
        "shrimp", "prawn", "salmon", "tuna", "cod", "tilapia", "fish", "crab", "lobster",
        "scallop", "mussel", "clam", "oyster", "anchov", "sardine", "chorizo", "prosciutto",
        "pepperoni", "deli", "meatball", "tofu", "tempeh", "seitan",
    ],
    "Dairy & Eggs": [
        "milk", "cheese", "cheddar", "mozzarella", "parmesan", "feta", "gouda", "brie",
        "ricotta", "provolone", "swiss", "butter", "yogurt", "cream", "buttermilk",
        "margarine", "cottage", "kefir", "egg", "creme", "crema", "half-and-half",
        "half and half", "goat cheese", "mascarpone", "creamer", "almond milk",
        "oat milk", "soy milk", "coconut milk",
    ],
    "Bakery": [
        "bread", "bagel", "baguette", "roll", "bun", "brioche", "tortilla", "wrap",
        "pita", "croissant", "muffin", "sourdough", "rye", "naan", "flatbread",
        "biscuit", "donut", "doughnut", "crumpet", "english muffin", "loaf",
    ],
    "Pantry": [
        "flour", "sugar", "rice", "pasta", "spaghetti", "noodle", "penne", "macaroni",
        "fettuccine", "couscous", "quinoa", "lentil", "bean", "chickpea", "oats",
        "cereal", "granola", "breadcrumb", "panko", "cornmeal", "oil", "vinegar",
        "balsamic", "soy sauce", "tamari", "worcestershire", "fish sauce", "hot sauce",
        "ketchup", "mustard", "mayo", "mayonnaise", "salsa", "pesto", "marinara",
        "tomato sauce", "tomato paste", "canned", "broth", "stock", "bouillon", "honey",
        "maple", "jam", "jelly", "peanut butter", "nutella", "tahini", "molasses",
        "syrup", "pickle", "relish", "caper", "sun-dried", "olives", "stuffing",
        "ramen", "orzo", "barley", "grits", "polenta",
    ],
    "Spices & Baking": [
        "salt", "black pepper", "cumin", "paprika", "chili powder", "cayenne", "turmeric",
        "cinnamon", "nutmeg", "clove", "cardamom", "coriander", "oregano", "seasoning",
        "onion powder", "garlic powder", "saffron", "bay leaf", "red pepper flakes",
        "vanilla", "baking powder", "baking soda", "yeast", "cornstarch", "cocoa",
        "cacao", "chocolate chip", "sprinkle", "food coloring", "cake mix", "brownie",
        "brown sugar", "powdered sugar", "confectioners", "curry", "za'atar", "sumac",
        "five spice", "herbes", "italian seasoning", "taco", "steak seasoning",
    ],
    "Snacks": [
        "chips", "cracker", "pretzel", "popcorn", "granola bar", "protein bar", "nuts",
        "almond", "cashew", "walnut", "pistachio", "peanut", "pecan", "trail mix",
        "raisin", "cranberr", "dried fruit", "chocolate bar", "candy", "cookies",
        "cookie", "gum", "fruit snack", "hummus", "jerky", "rice cake", "snack",
    ],
    "Beverages": [
        "water", "sparkling", "soda", "coke", "pepsi", "juice", "coffee", "tea",
        "espresso", "beer", "wine", "kombucha", "lemonade", "cold brew", "sports drink",
        "gatorade", "coconut water", "energy drink", "prosecco", "champagne", "cider",
        "seltzer", "tonic", "drink",
    ],
    "Household": [
        "paper towel", "toilet paper", "napkin", "tissue", "dish soap", "detergent",
        "laundry", "sponge", "trash bag", "garbage bag", "foil", "parchment",
        "plastic wrap", "ziploc", "sandwich bag", "cleaning", "bleach", "wipe",
        "batteries", "light bulb", "dog food", "cat food", "shampoo", "toothpaste",
        "hand soap", "paper plate", "cotton", "soap", "swiffer", "pet",
    ],
};

// Order matters: more specific aisles first so "frozen berries" beats "Produce".
const CLASSIFY_ORDER = [
    "Household", "Frozen", "Beverages", "Spices & Baking", "Snacks",
    "Bakery", "Meat & Seafood", "Dairy & Eggs", "Produce", "Pantry",
];

const keywordCache: Record<string, RegExp> = {};
function keywordRegex(keyword: string): RegExp {
    if (!keywordCache[keyword]) {
        const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        keywordCache[keyword] = new RegExp(`\\b${escaped}`, "i");
    }
    return keywordCache[keyword];
}

export function categorizeIngredient(name: string | null | undefined): string {
    if (!name) return "Pantry";
    const n = name.toLowerCase();
    for (const aisle of CLASSIFY_ORDER) {
        const keywords = AISLE_KEYWORDS[aisle] || [];
        if (keywords.some((k) => keywordRegex(k).test(n))) {
            return aisle;
        }
    }
    return "Pantry";
}

export function aislePreset(name: string): AislePreset {
    return DEFAULT_AISLES.find((a) => a.name === name) || { name, emoji: "🛒", tint: "#8B8BA3" };
}
