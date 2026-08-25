export interface RawFood {
    food_name: string;
    serving_size: string;
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
    sugar?: number | null;
    fiber?: number | null;
    sodium?: number | null;
    aliases?: string[];
}

export const RAW_FOODS: RawFood[] = [
    {
        food_name: "Apple",
        serving_size: "1 medium (182g)",
        calories: 95,
        protein: 0.5,
        fat: 0.3,
        carbs: 25,
        sugar: 19,
        fiber: 4.4,
        sodium: 2,
        aliases: ["apples", "red apple", "green apple", "fuji apple", "gala apple"]
    },
    {
        food_name: "Banana",
        serving_size: "1 medium (118g)",
        calories: 105,
        protein: 1.3,
        fat: 0.4,
        carbs: 27,
        sugar: 14,
        fiber: 3.1,
        sodium: 1,
        aliases: ["bananas"]
    },
    {
        food_name: "Orange",
        serving_size: "1 medium (131g)",
        calories: 62,
        protein: 1.2,
        fat: 0.2,
        carbs: 15.4,
        sugar: 12,
        fiber: 3.1,
        sodium: 0,
        aliases: ["oranges", "clementine", "mandarin"]
    },
    {
        food_name: "Strawberry",
        serving_size: "1 cup (152g)",
        calories: 49,
        protein: 1.0,
        fat: 0.5,
        carbs: 11.7,
        sugar: 7.4,
        fiber: 3.0,
        sodium: 1,
        aliases: ["strawberries", "fresh strawberries"]
    },
    {
        food_name: "Blueberry",
        serving_size: "1 cup (148g)",
        calories: 84,
        protein: 1.1,
        fat: 0.5,
        carbs: 21.4,
        sugar: 14.7,
        fiber: 3.6,
        sodium: 1,
        aliases: ["blueberries", "fresh blueberries"]
    },
    {
        food_name: "Grape",
        serving_size: "1 cup (151g)",
        calories: 104,
        protein: 1.1,
        fat: 0.2,
        carbs: 27.3,
        sugar: 23.4,
        fiber: 1.4,
        sodium: 3,
        aliases: ["grapes", "red grapes", "green grapes"]
    },
    {
        food_name: "Watermelon",
        serving_size: "1 cup diced (152g)",
        calories: 46,
        protein: 0.9,
        fat: 0.2,
        carbs: 11.5,
        sugar: 9.4,
        fiber: 0.6,
        sodium: 2,
        aliases: ["watermelon slices"]
    },
    {
        food_name: "Peach",
        serving_size: "1 medium (150g)",
        calories: 59,
        protein: 1.4,
        fat: 0.4,
        carbs: 14.3,
        sugar: 12.6,
        fiber: 2.3,
        sodium: 0,
        aliases: ["peaches"]
    },
    {
        food_name: "Pear",
        serving_size: "1 medium (178g)",
        calories: 101,
        protein: 0.6,
        fat: 0.3,
        carbs: 27.1,
        sugar: 17.4,
        fiber: 5.5,
        sodium: 2,
        aliases: ["pears"]
    },
    {
        food_name: "Pineapple",
        serving_size: "1 cup chunks (165g)",
        calories: 82,
        protein: 0.9,
        fat: 0.2,
        carbs: 21.6,
        sugar: 16.3,
        fiber: 2.3,
        sodium: 2,
        aliases: ["pineapples", "fresh pineapple"]
    },
    {
        food_name: "Mango",
        serving_size: "1 cup pieces (165g)",
        calories: 99,
        protein: 1.4,
        fat: 0.6,
        carbs: 24.7,
        sugar: 22.5,
        fiber: 2.6,
        sodium: 2,
        aliases: ["mangoes"]
    },
    {
        food_name: "Avocado",
        serving_size: "1 medium (150g)",
        calories: 240,
        protein: 3.0,
        fat: 22.0,
        carbs: 12.0,
        sugar: 0.4,
        fiber: 10.0,
        sodium: 10,
        aliases: ["avocados"]
    },
    {
        food_name: "Tomato",
        serving_size: "1 medium (123g)",
        calories: 22,
        protein: 1.1,
        fat: 0.2,
        carbs: 4.8,
        sugar: 3.2,
        fiber: 1.5,
        sodium: 6,
        aliases: ["tomatoes", "cherry tomatoes", "roma tomato"]
    },
    {
        food_name: "Lemon",
        serving_size: "1 medium (58g)",
        calories: 17,
        protein: 0.6,
        fat: 0.2,
        carbs: 5.4,
        sugar: 1.5,
        fiber: 1.6,
        sodium: 1,
        aliases: ["lemons"]
    },
    {
        food_name: "Lime",
        serving_size: "1 medium (67g)",
        calories: 20,
        protein: 0.5,
        fat: 0.1,
        carbs: 7.1,
        sugar: 1.1,
        fiber: 1.9,
        sodium: 1,
        aliases: ["limes"]
    },
    {
        food_name: "Grapefruit",
        serving_size: "1 medium (236g)",
        calories: 97,
        protein: 1.8,
        fat: 0.3,
        carbs: 24.5,
        sugar: 16.0,
        fiber: 3.7,
        sodium: 0,
        aliases: ["grapefruits"]
    },
    {
        food_name: "Raspberry",
        serving_size: "1 cup (123g)",
        calories: 64,
        protein: 1.5,
        fat: 0.8,
        carbs: 14.7,
        sugar: 5.4,
        fiber: 8.0,
        sodium: 1,
        aliases: ["raspberries", "fresh raspberries"]
    },
    {
        food_name: "Blackberry",
        serving_size: "1 cup (144g)",
        calories: 62,
        protein: 2.0,
        fat: 0.7,
        carbs: 13.8,
        sugar: 7.0,
        fiber: 7.6,
        sodium: 1,
        aliases: ["blackberries"]
    },
    {
        food_name: "Kiwi Fruit",
        serving_size: "1 medium (75g)",
        calories: 46,
        protein: 0.8,
        fat: 0.4,
        carbs: 11.1,
        sugar: 6.7,
        fiber: 2.3,
        sodium: 2,
        aliases: ["kiwi", "kiwis"]
    },
    {
        food_name: "Papaya",
        serving_size: "1 cup pieces (140g)",
        calories: 60,
        protein: 0.7,
        fat: 0.4,
        carbs: 15.1,
        sugar: 11.0,
        fiber: 2.5,
        sodium: 11,
        aliases: ["papayas"]
    },
    {
        food_name: "Egg (Whole)",
        serving_size: "1 large (50g)",
        calories: 72,
        protein: 6.3,
        fat: 4.8,
        carbs: 0.4,
        sugar: 0.2,
        fiber: 0,
        sodium: 71,
        aliases: ["egg", "eggs", "whole egg", "raw egg", "whole eggs"]
    },
    {
        food_name: "Egg White",
        serving_size: "1 large (33g)",
        calories: 17,
        protein: 3.6,
        fat: 0.1,
        carbs: 0.2,
        sugar: 0.2,
        fiber: 0,
        sodium: 55,
        aliases: ["egg whites", "liquid egg white", "egg white"]
    },
    {
        food_name: "Scrambled Eggs",
        serving_size: "2 large eggs (100g)",
        calories: 148,
        protein: 12.0,
        fat: 10.0,
        carbs: 1.5,
        sugar: 1.0,
        fiber: 0,
        sodium: 160,
        aliases: ["scrambled eggs", "2 scrambled eggs", "scrambled egg", "plain scrambled eggs", "egg scrambled"]
    },
    {
        food_name: "Boiled Eggs",
        serving_size: "1 large (50g)",
        calories: 78,
        protein: 6.3,
        fat: 5.3,
        carbs: 0.6,
        sugar: 0.6,
        fiber: 0,
        sodium: 62,
        aliases: ["boiled egg", "boiled eggs", "hard boiled egg", "hard boiled eggs", "soft boiled egg", "egg boiled"]
    },
    {
        food_name: "Fried Egg",
        serving_size: "1 large (46g)",
        calories: 90,
        protein: 6.3,
        fat: 7.0,
        carbs: 0.4,
        sugar: 0.4,
        fiber: 0,
        sodium: 95,
        aliases: ["fried egg", "fried eggs", "sunny side up egg", "egg fried"]
    },
    {
        food_name: "Chicken Breast (Raw)",
        serving_size: "100g",
        calories: 120,
        protein: 22.5,
        fat: 2.6,
        carbs: 0,
        sugar: 0,
        fiber: 0,
        sodium: 45,
        aliases: ["chicken breast", "chicken breasts", "raw chicken breast"]
    },
    {
        food_name: "Chicken Breast (Grilled)",
        serving_size: "100g",
        calories: 165,
        protein: 31.0,
        fat: 3.6,
        carbs: 0,
        sugar: 0,
        fiber: 0,
        sodium: 74,
        aliases: ["cooked chicken breast", "grilled chicken breast", "baked chicken breast"]
    },
    {
        food_name: "Chicken Thigh (Raw)",
        serving_size: "100g",
        calories: 120,
        protein: 17.3,
        fat: 5.7,
        carbs: 0,
        sugar: 0,
        fiber: 0,
        sodium: 85,
        aliases: ["chicken thigh", "chicken thighs", "raw chicken thigh"]
    },
    {
        food_name: "Chicken Thigh (Grilled)",
        serving_size: "100g",
        calories: 177,
        protein: 24.0,
        fat: 8.0,
        carbs: 0,
        sugar: 0,
        fiber: 0,
        sodium: 95,
        aliases: ["cooked chicken thigh", "grilled chicken thigh", "baked chicken thigh"]
    },
    {
        food_name: "Chicken Wing (Baked)",
        serving_size: "100g",
        calories: 203,
        protein: 22.0,
        fat: 12.0,
        carbs: 0,
        sugar: 0,
        fiber: 0,
        sodium: 82,
        aliases: ["chicken wing", "chicken wings", "cooked chicken wings"]
    },
    {
        food_name: "Ground Beef (90% Lean, Raw)",
        serving_size: "100g",
        calories: 176,
        protein: 20.0,
        fat: 10.0,
        carbs: 0,
        sugar: 0,
        fiber: 0,
        sodium: 66,
        aliases: ["ground beef", "beef mince", "raw ground beef"]
    },
    {
        food_name: "Ground Beef (90% Lean, Cooked)",
        serving_size: "100g",
        calories: 214,
        protein: 26.0,
        fat: 11.5,
        carbs: 0,
        sugar: 0,
        fiber: 0,
        sodium: 78,
        aliases: ["cooked ground beef", "cooked beef mince"]
    },
    {
        food_name: "Beef Steak (Ribeye, Grilled)",
        serving_size: "100g",
        calories: 250,
        protein: 24.0,
        fat: 17.0,
        carbs: 0,
        sugar: 0,
        fiber: 0,
        sodium: 54,
        aliases: ["ribeye steak", "ribeye", "beef ribeye"]
    },
    {
        food_name: "Beef Steak (Sirloin, Grilled)",
        serving_size: "100g",
        calories: 200,
        protein: 28.0,
        fat: 9.0,
        carbs: 0,
        sugar: 0,
        fiber: 0,
        sodium: 56,
        aliases: ["sirloin steak", "sirloin", "beef sirloin"]
    },
    {
        food_name: "Pork Chop (Cooked)",
        serving_size: "100g",
        calories: 196,
        protein: 27.0,
        fat: 9.0,
        carbs: 0,
        sugar: 0,
        fiber: 0,
        sodium: 68,
        aliases: ["pork chop", "pork chops", "cooked pork chop"]
    },
    {
        food_name: "Bacon (Pork, Cooked)",
        serving_size: "2 slices (16g)",
        calories: 86,
        protein: 6.0,
        fat: 7.0,
        carbs: 0.1,
        sugar: 0,
        fiber: 0,
        sodium: 270,
        aliases: ["bacon", "cooked bacon", "crispy bacon"]
    },
    {
        food_name: "Salmon (Raw)",
        serving_size: "100g",
        calories: 146,
        protein: 20.0,
        fat: 6.0,
        carbs: 0,
        sugar: 0,
        fiber: 0,
        sodium: 50,
        aliases: ["raw salmon", "fresh salmon"]
    },
    {
        food_name: "Salmon (Grilled)",
        serving_size: "100g",
        calories: 206,
        protein: 22.0,
        fat: 12.0,
        carbs: 0,
        sugar: 0,
        fiber: 0,
        sodium: 60,
        aliases: ["cooked salmon", "grilled salmon", "baked salmon"]
    },
    {
        food_name: "Tuna (Canned in Water)",
        serving_size: "1 can (150g)",
        calories: 120,
        protein: 28.0,
        fat: 1.0,
        carbs: 0,
        sugar: 0,
        fiber: 0,
        sodium: 360,
        aliases: ["canned tuna", "tuna fish", "tuna in water"]
    },
    {
        food_name: "Tuna (Canned in Oil)",
        serving_size: "1 can (150g)",
        calories: 240,
        protein: 28.0,
        fat: 14.0,
        carbs: 0,
        sugar: 0,
        fiber: 0,
        sodium: 360,
        aliases: ["tuna in oil"]
    },
    {
        food_name: "Shrimp (Cooked)",
        serving_size: "100g",
        calories: 99,
        protein: 24.0,
        fat: 0.3,
        carbs: 0.2,
        sugar: 0,
        fiber: 0,
        sodium: 111,
        aliases: ["shrimps", "cooked shrimp", "prawns", "cooked prawns"]
    },
    {
        food_name: "Milk (Whole)",
        serving_size: "1 cup (244ml)",
        calories: 149,
        protein: 7.7,
        fat: 8.0,
        carbs: 11.7,
        sugar: 12.3,
        fiber: 0,
        sodium: 105,
        aliases: ["whole milk", "full fat milk"]
    },
    {
        food_name: "Milk (2% Fat)",
        serving_size: "1 cup (244ml)",
        calories: 122,
        protein: 8.1,
        fat: 4.8,
        carbs: 11.7,
        sugar: 12.3,
        fiber: 0,
        sodium: 115,
        aliases: ["2% milk", "semi skimmed milk"]
    },
    {
        food_name: "Milk (Skim)",
        serving_size: "1 cup (244ml)",
        calories: 83,
        protein: 8.3,
        fat: 0.2,
        carbs: 12.2,
        sugar: 12.5,
        fiber: 0,
        sodium: 103,
        aliases: ["skim milk", "fat free milk", "nonfat milk"]
    },
    {
        food_name: "Greek Yogurt (Plain Nonfat)",
        serving_size: "1 container (150g)",
        calories: 90,
        protein: 15.0,
        fat: 0,
        carbs: 5.0,
        sugar: 5.0,
        fiber: 0,
        sodium: 55,
        aliases: ["greek yogurt", "nonfat greek yogurt", "plain greek yogurt", "0% greek yogurt", "chobani plain"]
    },
    {
        food_name: "Greek Yogurt (Vanilla)",
        serving_size: "1 container (150g)",
        calories: 120,
        protein: 12.0,
        fat: 0,
        carbs: 14.0,
        sugar: 13.0,
        fiber: 0,
        sodium: 60,
        aliases: ["vanilla greek yogurt", "greek yogurt vanilla"]
    },
    {
        food_name: "Greek Yogurt (Whole Milk Plain)",
        serving_size: "1 container (150g)",
        calories: 140,
        protein: 13.0,
        fat: 6.0,
        carbs: 6.0,
        sugar: 6.0,
        fiber: 0,
        sodium: 50,
        aliases: ["whole milk greek yogurt", "full fat greek yogurt"]
    },
    {
        food_name: "Cheese (Cheddar)",
        serving_size: "1 oz (28g)",
        calories: 113,
        protein: 7.0,
        fat: 9.3,
        carbs: 0.4,
        sugar: 0.1,
        fiber: 0,
        sodium: 180,
        aliases: ["cheddar cheese", "cheddar"]
    },
    {
        food_name: "Cheese (Mozzarella)",
        serving_size: "1 oz (28g)",
        calories: 85,
        protein: 6.3,
        fat: 6.3,
        carbs: 0.6,
        sugar: 0.3,
        fiber: 0,
        sodium: 175,
        aliases: ["mozzarella", "mozzarella cheese"]
    },
    {
        food_name: "Cottage Cheese (4% Fat)",
        serving_size: "1/2 cup (113g)",
        calories: 110,
        protein: 12.0,
        fat: 5.0,
        carbs: 4.0,
        sugar: 4.0,
        fiber: 0,
        sodium: 400,
        aliases: ["cottage cheese"]
    },
    {
        food_name: "Butter",
        serving_size: "1 tbsp (14g)",
        calories: 100,
        protein: 0.1,
        fat: 11.5,
        carbs: 0,
        sugar: 0,
        fiber: 0,
        sodium: 90,
        aliases: ["salted butter", "unsalted butter"]
    },
    {
        food_name: "Olive Oil",
        serving_size: "1 tbsp (14g)",
        calories: 119,
        protein: 0,
        fat: 13.5,
        carbs: 0,
        sugar: 0,
        fiber: 0,
        sodium: 0,
        aliases: ["extra virgin olive oil", "evoo"]
    },
    {
        food_name: "Coconut Oil",
        serving_size: "1 tbsp (14g)",
        calories: 117,
        protein: 0,
        fat: 13.6,
        carbs: 0,
        sugar: 0,
        fiber: 0,
        sodium: 0,
        aliases: ["virgin coconut oil"]
    },
    {
        food_name: "Rice (White, Cooked)",
        serving_size: "1 cup (158g)",
        calories: 205,
        protein: 4.2,
        fat: 0.4,
        carbs: 44.5,
        sugar: 0.1,
        fiber: 0.6,
        sodium: 0,
        aliases: ["white rice", "cooked white rice", "jasmine rice", "basmati rice"]
    },
    {
        food_name: "Rice (Brown, Cooked)",
        serving_size: "1 cup (195g)",
        calories: 216,
        protein: 5.0,
        fat: 1.8,
        carbs: 44.8,
        sugar: 0.7,
        fiber: 3.5,
        sodium: 10,
        aliases: ["brown rice", "cooked brown rice"]
    },
    {
        food_name: "Oats (Rolled, Raw)",
        serving_size: "1/2 cup (40g)",
        calories: 150,
        protein: 5.0,
        fat: 3.0,
        carbs: 27.0,
        sugar: 1.0,
        fiber: 4.0,
        sodium: 0,
        aliases: ["rolled oats", "oatmeal", "raw oats", "porridge oats"]
    },
    {
        food_name: "Bread (Whole Wheat)",
        serving_size: "1 slice (28g)",
        calories: 69,
        protein: 3.6,
        fat: 0.9,
        carbs: 11.6,
        sugar: 1.4,
        fiber: 1.9,
        sodium: 130,
        aliases: ["wheat bread", "wholemeal bread"]
    },
    {
        food_name: "Bread (Sourdough)",
        serving_size: "1 slice (50g)",
        calories: 140,
        protein: 4.0,
        fat: 0.5,
        carbs: 26.0,
        sugar: 1.0,
        fiber: 1.0,
        sodium: 290,
        aliases: ["sourdough bread", "sourdough slice"]
    },
    {
        food_name: "Potato (Baked with skin)",
        serving_size: "1 medium (173g)",
        calories: 161,
        protein: 4.3,
        fat: 0.2,
        carbs: 36.6,
        sugar: 1.7,
        fiber: 3.8,
        sodium: 17,
        aliases: ["baked potato", "jacket potato", "cooked potato"]
    },
    {
        food_name: "Sweet Potato (Baked)",
        serving_size: "1 medium (114g)",
        calories: 103,
        protein: 2.3,
        fat: 0.2,
        carbs: 23.6,
        sugar: 7.4,
        fiber: 3.8,
        sodium: 41,
        aliases: ["baked sweet potato", "cooked sweet potato"]
    },
    {
        food_name: "Broccoli (Raw)",
        serving_size: "1 cup (91g)",
        calories: 31,
        protein: 2.5,
        fat: 0.3,
        carbs: 6.0,
        sugar: 1.5,
        fiber: 2.4,
        sodium: 30,
        aliases: ["broccoli florets"]
    },
    {
        food_name: "Broccoli (Steamed)",
        serving_size: "1 cup (150g)",
        calories: 54,
        protein: 3.7,
        fat: 0.6,
        carbs: 10.0,
        sugar: 2.2,
        fiber: 3.8,
        sodium: 64,
        aliases: ["cooked broccoli", "steamed broccoli"]
    },
    {
        food_name: "Spinach (Raw)",
        serving_size: "2 cups (60g)",
        calories: 14,
        protein: 1.7,
        fat: 0.2,
        carbs: 2.2,
        sugar: 0.1,
        fiber: 1.3,
        sodium: 47,
        aliases: ["baby spinach", "fresh spinach"]
    },
    {
        food_name: "Lettuce (Romaine)",
        serving_size: "2 cups chopped (94g)",
        calories: 16,
        protein: 1.2,
        fat: 0.3,
        carbs: 3.1,
        sugar: 1.1,
        fiber: 2.0,
        sodium: 7,
        aliases: ["romaine lettuce", "salad lettuce"]
    },
    {
        food_name: "Cucumber",
        serving_size: "1 cup sliced (104g)",
        calories: 16,
        protein: 0.7,
        fat: 0.1,
        carbs: 3.8,
        sugar: 1.8,
        fiber: 0.5,
        sodium: 2,
        aliases: ["cucumbers"]
    },
    {
        food_name: "Carrot (Raw)",
        serving_size: "1 medium (61g)",
        calories: 25,
        protein: 0.6,
        fat: 0.1,
        carbs: 5.8,
        sugar: 2.9,
        fiber: 1.7,
        sodium: 42,
        aliases: ["carrots", "baby carrots"]
    },
    {
        food_name: "Onion (Yellow)",
        serving_size: "1 medium (110g)",
        calories: 44,
        protein: 1.2,
        fat: 0.1,
        carbs: 10.3,
        sugar: 4.7,
        fiber: 1.9,
        sodium: 4,
        aliases: ["onions", "white onion", "red onion"]
    },
    {
        food_name: "Garlic",
        serving_size: "1 clove (3g)",
        calories: 4,
        protein: 0.2,
        fat: 0,
        carbs: 1.0,
        sugar: 0.1,
        fiber: 0.1,
        sodium: 1,
        aliases: ["garlic clove"]
    },
    {
        food_name: "Bell Pepper (Red)",
        serving_size: "1 medium (119g)",
        calories: 37,
        protein: 1.2,
        fat: 0.4,
        carbs: 7.2,
        sugar: 5.0,
        fiber: 2.5,
        sodium: 5,
        aliases: ["sweet pepper", "red bell pepper", "green bell pepper", "yellow bell pepper"]
    },
    {
        food_name: "Zucchini (Raw)",
        serving_size: "1 medium (196g)",
        calories: 33,
        protein: 2.4,
        fat: 0.7,
        carbs: 6.1,
        sugar: 4.9,
        fiber: 2.0,
        sodium: 16,
        aliases: ["courgette"]
    },
    {
        food_name: "Mushroom (White)",
        serving_size: "1 cup whole (96g)",
        calories: 21,
        protein: 3.0,
        fat: 0.3,
        carbs: 3.1,
        sugar: 1.9,
        fiber: 1.0,
        sodium: 5,
        aliases: ["mushrooms", "button mushrooms"]
    },
    {
        food_name: "Cauliflower (Raw)",
        serving_size: "1 cup (100g)",
        calories: 25,
        protein: 1.9,
        fat: 0.3,
        carbs: 5.0,
        sugar: 1.9,
        fiber: 2.0,
        sodium: 30,
        aliases: ["cauliflower florets"]
    },
    {
        food_name: "Asparagus (Raw)",
        serving_size: "1 cup (134g)",
        calories: 27,
        protein: 3.0,
        fat: 0.2,
        carbs: 5.2,
        sugar: 2.5,
        fiber: 2.8,
        sodium: 3,
        aliases: ["asparagus spears"]
    },
    {
        food_name: "Celery",
        serving_size: "2 medium stalks (80g)",
        calories: 13,
        protein: 0.6,
        fat: 0.1,
        carbs: 3.0,
        sugar: 1.1,
        fiber: 1.3,
        sodium: 64,
        aliases: ["celery stalks"]
    },
    {
        food_name: "Peanut Butter",
        serving_size: "2 tbsp (32g)",
        calories: 191,
        protein: 7.1,
        fat: 16.4,
        carbs: 7.1,
        sugar: 3.1,
        fiber: 1.6,
        sodium: 136,
        aliases: ["smooth peanut butter", "crunchy peanut butter"]
    },
    {
        food_name: "Almonds (Raw)",
        serving_size: "1 oz (28g)",
        calories: 164,
        protein: 6.0,
        fat: 14.1,
        carbs: 6.1,
        sugar: 1.2,
        fiber: 3.5,
        sodium: 0,
        aliases: ["almond nuts", "raw almonds"]
    },
    {
        food_name: "Walnuts (Raw)",
        serving_size: "1 oz (28g)",
        calories: 185,
        protein: 4.3,
        fat: 18.5,
        carbs: 3.9,
        sugar: 0.7,
        fiber: 1.9,
        sodium: 1,
        aliases: ["walnut halves"]
    },
    {
        food_name: "Honey",
        serving_size: "1 tbsp (21g)",
        calories: 64,
        protein: 0.1,
        fat: 0,
        carbs: 17.3,
        sugar: 17.2,
        fiber: 0,
        sodium: 1,
        aliases: ["pure honey", "raw honey"]
    },
    {
        food_name: "Quinoa (Cooked)",
        serving_size: "1 cup (185g)",
        calories: 222,
        protein: 8.1,
        fat: 3.6,
        carbs: 39.4,
        sugar: 1.6,
        fiber: 5.2,
        sodium: 13,
        aliases: ["cooked quinoa"]
    },
    {
        food_name: "Pasta (Cooked)",
        serving_size: "1 cup (140g)",
        calories: 220,
        protein: 8.1,
        fat: 1.3,
        carbs: 43.0,
        sugar: 0.8,
        fiber: 2.5,
        sodium: 1,
        aliases: ["cooked spaghetti", "cooked pasta", "penne pasta"]
    },
    {
        food_name: "Tofu (Firm)",
        serving_size: "100g",
        calories: 144,
        protein: 17.0,
        fat: 8.7,
        carbs: 2.8,
        sugar: 0.5,
        fiber: 2.0,
        sodium: 12,
        aliases: ["firm tofu"]
    },
    {
        food_name: "Whey Protein Powder",
        serving_size: "1 scoop (30g)",
        calories: 120,
        protein: 24.0,
        fat: 1.5,
        carbs: 3.0,
        sugar: 1.0,
        fiber: 0,
        sodium: 50,
        aliases: ["protein powder", "whey protein"]
    },
    {
        food_name: "Coffee (Black)",
        serving_size: "1 cup (240ml)",
        calories: 2,
        protein: 0.3,
        fat: 0,
        carbs: 0,
        sugar: 0,
        fiber: 0,
        sodium: 5,
        aliases: ["espresso", "americano", "black coffee", "brewed coffee"]
    },
    {
        food_name: "Apple (Honeycrisp)",
        serving_size: "1 medium (182g)",
        calories: 95,
        protein: 0.5,
        fat: 0.3,
        carbs: 25,
        sugar: 19,
        fiber: 4.4,
        sodium: 2,
        aliases: ["honeycrisp apple", "honey crisp apple"]
    },
    {
        food_name: "Apple (Granny Smith)",
        serving_size: "1 medium (182g)",
        calories: 97,
        protein: 0.8,
        fat: 0.3,
        carbs: 24,
        sugar: 17,
        fiber: 5.0,
        sodium: 2,
        aliases: ["granny smith apple", "green apple"]
    },
    {
        food_name: "Apple (Gala)",
        serving_size: "1 medium (182g)",
        calories: 95,
        protein: 0.5,
        fat: 0.3,
        carbs: 25,
        sugar: 19,
        fiber: 4.0,
        sodium: 2,
        aliases: ["gala apple"]
    },
    {
        food_name: "Apple (Fuji)",
        serving_size: "1 medium (182g)",
        calories: 100,
        protein: 0.5,
        fat: 0.3,
        carbs: 26,
        sugar: 20,
        fiber: 4.0,
        sodium: 2,
        aliases: ["fuji apple"]
    },
    {
        food_name: "Applesauce (Unsweetened)",
        serving_size: "1/2 cup (122g)",
        calories: 50,
        protein: 0.2,
        fat: 0.1,
        carbs: 13.8,
        sugar: 11.5,
        fiber: 1.5,
        sodium: 2,
        aliases: ["unsweetened applesauce", "plain applesauce", "applesauce"]
    },
    {
        food_name: "Applesauce (Sweetened)",
        serving_size: "1/2 cup (128g)",
        calories: 83,
        protein: 0.2,
        fat: 0.1,
        carbs: 22.4,
        sugar: 20.0,
        fiber: 1.4,
        sodium: 3,
        aliases: ["sweetened applesauce"]
    },
    {
        food_name: "Apple Juice (100%)",
        serving_size: "1 cup (248ml)",
        calories: 114,
        protein: 0.2,
        fat: 0.3,
        carbs: 28,
        sugar: 24,
        fiber: 0.5,
        sodium: 10,
        aliases: ["apple juice", "100% apple juice", "pure apple juice"]
    },
    {
        food_name: "Apple Cider",
        serving_size: "1 cup (248ml)",
        calories: 117,
        protein: 0.1,
        fat: 0.3,
        carbs: 29,
        sugar: 24,
        fiber: 0.5,
        sodium: 7,
        aliases: ["cider", "apple cider", "fresh apple cider"]
    },
    {
        food_name: "Apple Pie",
        serving_size: "1 slice (125g)",
        calories: 296,
        protein: 2.4,
        fat: 13.8,
        carbs: 42.5,
        sugar: 20.0,
        fiber: 2.0,
        sodium: 208,
        aliases: ["slice of apple pie", "apple pie slice"]
    },
    {
        food_name: "Saffron Rice (Cooked)",
        serving_size: "1 cup (158g)",
        calories: 210,
        protein: 4.2,
        fat: 2.5,
        carbs: 43.0,
        sugar: 0.2,
        fiber: 0.8,
        sodium: 210,
        aliases: ["saffron rice", "cooked saffron rice", "yellow saffron rice", "yellow rice"]
    },
    {
        food_name: "Jasmine Rice (Cooked)",
        serving_size: "1 cup (158g)",
        calories: 205,
        protein: 4.2,
        fat: 0.4,
        carbs: 44.5,
        sugar: 0.1,
        fiber: 0.6,
        sodium: 0,
        aliases: ["jasmine rice", "cooked jasmine rice", "thai jasmine rice"]
    },
    {
        food_name: "Basmati Rice (Cooked)",
        serving_size: "1 cup (158g)",
        calories: 205,
        protein: 4.3,
        fat: 0.5,
        carbs: 44.0,
        sugar: 0.1,
        fiber: 0.7,
        sodium: 0,
        aliases: ["basmati rice", "cooked basmati rice"]
    },
    {
        food_name: "Wild Rice (Cooked)",
        serving_size: "1 cup (164g)",
        calories: 166,
        protein: 6.5,
        fat: 0.6,
        carbs: 35.0,
        sugar: 1.2,
        fiber: 3.0,
        sodium: 5,
        aliases: ["wild rice", "cooked wild rice"]
    },
    {
        food_name: "Quinoa (Cooked)",
        serving_size: "1 cup (185g)",
        calories: 222,
        protein: 8.1,
        fat: 3.6,
        carbs: 39.4,
        sugar: 1.6,
        fiber: 5.2,
        sodium: 13,
        aliases: ["quinoa", "cooked quinoa"]
    },
    {
        food_name: "Egg (Scrambled, 2 large)",
        serving_size: "2 large eggs (100g)",
        calories: 148,
        protein: 12.0,
        fat: 10.0,
        carbs: 1.5,
        sugar: 1.0,
        fiber: 0,
        sodium: 160,
        aliases: ["scrambled eggs", "2 scrambled eggs", "scrambled egg", "plain scrambled eggs"]
    },
    {
        food_name: "Egg (Poached)",
        serving_size: "1 large (50g)",
        calories: 72,
        protein: 6.3,
        fat: 4.7,
        carbs: 0.4,
        sugar: 0.2,
        fiber: 0,
        sodium: 71,
        aliases: ["poached egg", "poached eggs"]
    },
    {
        food_name: "Peanut Butter (Creamy)",
        serving_size: "2 tbsp (32g)",
        calories: 188,
        protein: 8.0,
        fat: 16.0,
        carbs: 7.0,
        sugar: 3.0,
        fiber: 2.0,
        sodium: 140,
        aliases: ["peanut butter", "creamy peanut butter", "smooth peanut butter", "pb"]
    },
    {
        food_name: "Peanut Butter (Crunchy)",
        serving_size: "2 tbsp (32g)",
        calories: 188,
        protein: 8.0,
        fat: 16.0,
        carbs: 7.0,
        sugar: 3.0,
        fiber: 2.0,
        sodium: 140,
        aliases: ["crunchy peanut butter", "chunky peanut butter"]
    },
    {
        food_name: "Almond Butter",
        serving_size: "2 tbsp (32g)",
        calories: 196,
        protein: 6.7,
        fat: 17.8,
        carbs: 6.0,
        sugar: 1.7,
        fiber: 3.3,
        sodium: 0,
        aliases: ["almond butter", "plain almond butter"]
    },
    {
        food_name: "Ground Turkey (93% Lean, Raw)",
        serving_size: "100g",
        calories: 150,
        protein: 19.5,
        fat: 8.0,
        carbs: 0,
        sugar: 0,
        fiber: 0,
        sodium: 75,
        aliases: ["ground turkey", "raw ground turkey", "lean ground turkey"]
    },
    {
        food_name: "Ground Turkey (93% Lean, Cooked)",
        serving_size: "100g",
        calories: 195,
        protein: 27.0,
        fat: 9.5,
        carbs: 0,
        sugar: 0,
        fiber: 0,
        sodium: 85,
        aliases: ["cooked ground turkey", "ground turkey cooked"]
    },
    {
        food_name: "Tilapia (Cooked)",
        serving_size: "100g",
        calories: 128,
        protein: 26.0,
        fat: 2.7,
        carbs: 0,
        sugar: 0,
        fiber: 0,
        sodium: 56,
        aliases: ["tilapia", "cooked tilapia", "tilapia fillet"]
    },
    {
        food_name: "Oatmeal (Cooked with Water)",
        serving_size: "1 cup (234g)",
        calories: 158,
        protein: 5.5,
        fat: 3.2,
        carbs: 27.4,
        sugar: 1.1,
        fiber: 4.0,
        sodium: 115,
        aliases: ["cooked oatmeal", "oatmeal", "porridge", "hot oatmeal"]
    },
    {
        food_name: "White Bread",
        serving_size: "1 slice (25g)",
        calories: 67,
        protein: 2.0,
        fat: 0.8,
        carbs: 12.7,
        sugar: 1.2,
        fiber: 0.6,
        sodium: 130,
        aliases: ["white bread", "slice of white bread", "plain white bread"]
    }
];

function wordMatches(targetText: string, token: string): boolean {
    if (targetText.includes(token)) return true;
    
    // Plural to singular normalization
    if (token.endsWith("ies") && token.length > 4) {
        const singular = token.slice(0, -3) + "y";
        if (targetText.includes(singular)) return true;
    }
    if (token.endsWith("es") && token.length > 3) {
        const singular = token.slice(0, -2);
        if (targetText.includes(singular)) return true;
    }
    if (token.endsWith("s") && token.length > 2) {
        const singular = token.slice(0, -1);
        if (targetText.includes(singular)) return true;
    }

    // Singular to plural normalization
    const plural = token + "s";
    if (targetText.includes(plural)) return true;

    return false;
}

export function searchRawFoods(query: string): RawFood[] {
    const qLower = query.toLowerCase().trim();
    if (!qLower) return [];

    // Significant tokens (ignoring whitespace and 1-char noise)
    const tokens = qLower.split(/\s+/).filter(t => t.length > 0);
    if (tokens.length === 0) return [];

    const scored: { food: RawFood; score: number }[] = [];

    for (const food of RAW_FOODS) {
        const nameLower = food.food_name.toLowerCase();
        const aliasesLower = (food.aliases || []).map(a => a.toLowerCase());
        const fullSearchable = `${nameLower} ${aliasesLower.join(" ")}`;

        // Hard gate with word/stem matching: every query token must match in name or aliases
        const allTokensPresent = tokens.every(token => wordMatches(fullSearchable, token));
        if (!allTokensPresent) continue;

        // Clean name (strip parentheticals for matching)
        const cleanName = nameLower.replace(/\s*\([^)]*\)/g, "").trim();

        let score = 50; // Base score for matching all tokens

        // Tier 0: Exact match to name or alias
        if (nameLower === qLower || cleanName === qLower || aliasesLower.includes(qLower)) {
            score = 100;
        } else if (nameLower.startsWith(qLower) || cleanName.startsWith(qLower)) {
            // Tier 1: Starts with query
            score = 90;
        } else if (nameLower.includes(qLower)) {
            // Tier 2: Name contains full query substring
            score = 80;
        } else if (aliasesLower.some(a => a.startsWith(qLower))) {
            score = 75;
        } else if (aliasesLower.some(a => a.includes(qLower))) {
            score = 70;
        }

        // Slight penalty for very long names
        score -= Math.min(5, food.food_name.length * 0.05);

        scored.push({ food, score });
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.map(s => s.food);
}
