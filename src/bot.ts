import { Bot, session } from "grammy";
import "dotenv/config";
import { db } from "./db";

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

// START
bot.command("start", (ctx) => {
    ctx.reply(
        "/set_profile\n/add_meal\n/today\n/my_profile"
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
    const meals = await db.all(
        `SELECT * FROM meals WHERE user_id = ?`,
        ctx.from!.id
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
        const d = ctx.session.data;

        d.activity = text;
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