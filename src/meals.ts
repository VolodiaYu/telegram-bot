import { estimateCalories } from "./calories";
import { db } from "./db";

export async function addMeal(ctx: any, text: string) {
    const ai = await estimateCalories(text);

    if (!ai) {
        ctx.reply("❌ Не вдалося проаналізувати їжу. Спробуйте описати простіше.");
        return;
    }

    // save to DB
    await db.run(
        `
        INSERT INTO meals (user_id, raw_text, calories_estimated, ai_json, timestamp)
        VALUES (?, ?, ?, ?, ?)
        `,
        ctx.from.id,
        text,
        ai.total_calories,
        JSON.stringify(ai),
        new Date().toISOString()
    );

    // format response
    let msg = "🍽️ Знайдено:\n\n";

    ai.items.forEach((i: any) => {
        msg += `• ${i.name} — ${Math.round(i.calories)} kcal\n`;
    });

    msg += `\n🔥 Всього: ${Math.round(ai.total_calories)} kcal`;
    msg += `\n📊 Confidence: ${ai.confidence}`;

    ctx.reply(msg);
}