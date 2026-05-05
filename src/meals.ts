import { db } from "./db";
import { estimateCalories } from "./calories";

export async function addMeal(ctx: any, text: string) {
    const ai = await estimateCalories(text);

    if (!ai) {
        ctx.reply("❌ Не вдалося проаналізувати їжу. Спробуйте простіше.");
        return;
    }

    await db.run(
        `
        INSERT INTO meals
        (user_id, raw_text, calories_estimated, ai_json, timestamp)
        VALUES (?, ?, ?, ?, ?)
        `,
        ctx.from.id,
        text,
        ai.total_calories,
        JSON.stringify(ai),
        new Date().toISOString()
    );

    let msg = "🍽️ Знайдено:\n\n";
    ai.items.forEach((i: any) => {
        msg += `• ${i.name} — ${Math.round(i.calories)} kcal\n`;
    });
    msg += `\n🔥 Всього: ${Math.round(ai.total_calories)} kcal`;
    msg += `\n📊 Confidence: ${ai.confidence}`;

    ctx.reply(msg);
}

export async function todayMeals(ctx: any) {
    const today = new Date().toISOString().slice(0, 10);

    const meals = await db.all(
        `
        SELECT raw_text, calories_estimated, timestamp
        FROM meals
        WHERE user_id = ?
        AND date(timestamp) = ?
        `,
        ctx.from.id,
        today
    );

    if (meals.length === 0) {
        ctx.reply("🍽️ Сьогодні ще немає прийомів їжі.");
        return;
    }

    let total = 0;
    let text = "📅 **Сьогодні:**\n\n";

    meals.forEach((m: any, i: number) => {
        total += m.calories_estimated;
        text += `${i + 1}. ${m.raw_text}\n`;
    });

    text += `\n🔥 Всього: ${Math.round(total)} kcal`;
    ctx.reply(text, { parse_mode: "Markdown" });
}