type Item = {
    name: string;
    grams: number;
    calories: number;
};

type AIResult = {
    items: Item[];
    total_calories: number;
    confidence: number;
};

const FOOD_DB: Record<string, number> = {
    egg: 155,
    eggs: 155,
    toast: 80,
    bread: 260,
    chicken: 165,
    rice: 130,
    beef: 250,
    pork: 270,
    banana: 96,
    apple: 52,
    milk: 42,
    cheese: 402,
    potato: 77,
    pasta: 131,
};

// “умное” извлечение чисел (2 eggs, 3 rice и т.д.)
function extractQuantity(word: string): number {
    const match = word.match(/\d+/);
    return match ? Number(match[0]) : 1;
}

export async function estimateCalories(text: string): Promise<AIResult> {
    const lower = text.toLowerCase();

    const words = lower.split(/[\s,]+/);

    const items: Item[] = [];
    let total = 0;

    for (let i = 0; i < words.length; i++) {
        const word = words[i];

        // ищем продукты
        for (const food in FOOD_DB) {
            if (word.includes(food)) {
                const qty = extractQuantity(word);

                const calories = FOOD_DB[food] * qty;

                items.push({
                    name: food,
                    grams: 100 * qty,
                    calories,
                });

                total += calories;
            }
        }
    }

    // если ничего не найдено
    if (items.length === 0) {
        return {
            items: [
                {
                    name: text,
                    grams: 0,
                    calories: 0,
                },
            ],
            total_calories: 0,
            confidence: 0.25,
        };
    }

    return {
        items,
        total_calories: total,
        confidence: 0.88,
    };
}