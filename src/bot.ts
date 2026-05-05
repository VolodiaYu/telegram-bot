import { Bot, session } from "grammy";
import "dotenv/config";
import { db } from "./db";
import { Keyboard } from "grammy";


import {
    calculateBMR,
    calculateTDEE,
    saveProfile,
    getProfile,
} from "./profile";

import { estimateCalories } from "./calories";

const bot = new Bot(process.env.BOT_TOKEN!);

// session
bot.use(session({ initial: () => ({ step: null, data: {} }) }));

bot.command("start", (ctx) => {
    ctx.reply(
        "/set_profile - Задаать характеристики\n" +
        "/add_meal - Додати прийом їжі\n" +
        "/today - Сьогоднішні записи\n" +
        "/my_profile - Мій профіль\n" +
        "/plan - Рекомендована норма\n" +
        "/reset - Скинути профіль",
    );
});


/* ---------------- PROFILE ---------------- */

bot.command("set_profile", (ctx) => {
    ctx.session.step = "age";
    ctx.session.data = {};
    ctx.reply("Вік?");
});

bot.command("my_profile", async (ctx) => {
    const profile = await getProfile(ctx.from!.id);

    if (!profile) {
        return ctx.reply("❌ Профіль не знайдено. Використай /set_profile");
    }

    ctx.reply(
        `📊 Твій профіль:\n\n` +
        `Вік: ${profile.age}\n` +
        `Зріст: ${profile.height}\n` +
        `Вага: ${profile.weight}\n` +
        `Стать: ${profile.sex}\n` +
        `Активність: ${profile.activity_level}\n\n` +
        `🔥 BMR: ${Math.round(profile.bmr)}\n` +
        `⚡ TDEE: ${Math.round(profile.tdee)}`
    );
});

/* ---------------- MEALS ---------------- */

bot.command("add_meal", async (ctx) => {
    const text = ctx.message?.text?.replace("/add_meal", "").trim();

    if (!text) {
        return ctx.reply("Напиши їжу після команди");
    }

    const ai = await estimateCalories(text);

    const calories = ai?.total_calories ?? 0;

    const safe = ai ?? {
        items: [{ name: text, grams: 0, calories: 0 }],
        total_calories: calories,
        confidence: 0.3,
    };

    await db.run(
        `INSERT INTO meals (user_id, raw_text, calories_estimated, timestamp)
         VALUES (?, ?, ?, ?)`,
        ctx.from!.id,
        text,
        calories,
        new Date().toISOString()
    );

    let msg = "🍽️ Збережено:\n\n";

    safe.items.forEach((i: any) => {
        msg += `• ${i.name} — ${i.calories} kcal\n`;
    });

    msg += `\n🔥 Всього: ${calories} kcal`;

    ctx.reply(msg);
});

bot.command("today", async (ctx) => {
    const today = new Date().toISOString().slice(0, 10);

    const meals = await db.all(
        `SELECT * FROM meals WHERE user_id = ? AND date(timestamp) = ?`,
        ctx.from!.id,
        today
    );
    if (!meals.length) {
        return ctx.reply("🍽️ Сьогодні ще немає записів");
    }

    let total = 0;
    let msg = "📅 Сьогодні:\n\n";

    meals.forEach((m: any, i: number) => {
        total += m.calories_estimated || 0;
        msg += `${i + 1}. ${m.raw_text} — ${m.calories_estimated} kcal\n`;
    });

    msg += `\n🔥 Всього: ${total} kcal`;

    ctx.reply(msg);
});

bot.command("plan", async (ctx) => {
    const profile = await getProfile(ctx.from!.id);

    console.log(profile);

    if (!profile) {
        return ctx.reply("❌ Спочатку заповніть профіль через /set_profile");
    }

    if (!profile.goal) {
        return ctx.reply("⚠️ Виберіть ціль у профілі");
    }

    const goals = {
        lose: {
            calories: profile.tdee - 400,
            text: "схуднення",
        },
        maintain: {
            calories: profile.tdee,
            text: "підтримка ваги",
        },
        gain: {
            calories: profile.tdee + 300,
            text: "набір маси",
        },
    };

    const result = goals[profile.goal as keyof typeof goals];

    if (!result) {
        return ctx.reply("⚠️ Невідома ціль. Оновіть /set_profile");
    }

    return ctx.reply(
        `📋 Ваша ціль: ${result.text}\n\n` +
        `🔥 Рекомендована норма: ${Math.round(result.calories)} kcal / день`
    );
});

bot.command("reset", async (ctx) => {
    await db.run(`DELETE FROM users WHERE telegram_id = ?`, ctx.from!.id);
    await db.run(`DELETE FROM meals WHERE user_id = ?`, ctx.from!.id);

    ctx.session = { step: null, data: {} };

    return ctx.reply("🗑️ Все данные удалены. Профиль сброшен.");
});
/* ---------------- SESSION FLOW ---------------- */

bot.on("message:text", async (ctx) => {
    const step = ctx.session.step;
    const text = ctx.message.text;

    if (step === "age") {
        ctx.session.data.age = +text;
        ctx.session.step = "height";
        return ctx.reply("Зріст?");
    }

    if (step === "height") {
        ctx.session.data.height = +text;
        ctx.session.step = "weight";
        return ctx.reply("Вага?");
    }

    if (step === "weight") {
        ctx.session.data.weight = +text;
        ctx.session.step = "sex";
        return ctx.reply("Стать (male/female)?");
    }

    if (step === "sex") {
        ctx.session.data.sex = text;
        ctx.session.step = "activity";
        return ctx.reply("Активність (low/light/medium/high)?");
    }

    if (step === "activity") {
    ctx.session.data.activity = text;
    ctx.session.step = "goal";

    if (step === "goal") {
        const d = ctx.session.data;

        d.goal = text;

        d.bmr = calculateBMR(d.weight, d.height, d.age, d.sex);
        d.tdee = calculateTDEE(d.bmr, d.activity);

        await saveProfile(ctx.from!.id, d); // 🔥 ВАЖНО СРАЗУ СОХРАНЯЕМ

        ctx.session.step = null;

        return ctx.reply("✅ Профіль збережено");
    }

    return ctx.reply(
        "Яка ваша ціль?\n\n" +
        "🔻 lose — схуднення\n" +
        "⚖️ maintain — підтримка\n" +
        "🔺 gain — набір маси"
    );
    }

    if (step === "goal") {
        const d = ctx.session.data;

        d.goal = text;

        d.bmr = calculateBMR(d.weight, d.height, d.age, d.sex);
        d.tdee = calculateTDEE(d.bmr, d.activity);

        await saveProfile(ctx.from!.id, d);

        ctx.session.step = null;

        return ctx.reply("✅ Профіль збережено");
    }
});

/* ---------------- START BOT ---------------- */

bot.start();
console.log("🤖 BOT RUNNING");