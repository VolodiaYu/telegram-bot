import { Bot, session } from "grammy";
import "dotenv/config";
import "./db";

import {
    calculateBMR,
    calculateTDEE,
    saveProfile,
    getProfile,
} from "./profile";
import { addMeal, todayMeals } from "./meals";

const bot = new Bot(process.env.BOT_TOKEN!);

bot.use(session({ initial: () => ({ step: null, data: {} }) }));

bot.command("start", (ctx) =>
    ctx.reply("/set_profile\n/add_meal\n/today\n/my_profile")
);

bot.command("set_profile", (ctx) => {
    ctx.session.step = "age";
    ctx.session.data = {};
    ctx.reply("Вік?");
});

bot.command("add_meal", (ctx) => {
    ctx.session.step = "meal";
    ctx.reply("Що ви їли?");
});

bot.command("today", todayMeals);

bot.command("my_profile", async (ctx) => {
    const profile = await getProfile(ctx.from.id);

    if (!profile) {
        ctx.reply("❌ Профіль не знайдено. Використай /set_profile");
        return;
    }

    ctx.reply(
        "📊 **Твій профіль:**\n\n" +
            `Вік: ${profile.age}\n` +
            `Зріст: ${profile.height} см\n` +
            `Вага: ${profile.weight} кг\n` +
            `Стать: ${profile.sex}\n` +
            `Активність: ${profile.activity_level}\n\n` +
            `🔥 BMR: ${Math.round(profile.bmr)} kcal\n` +
            `⚡ TDEE: ${Math.round(profile.tdee)} kcal`,
        { parse_mode: "Markdown" }
    );
});

bot.on("message:text", async (ctx) => {
    const s = ctx.session.step;
    const t = ctx.message.text;

    if (s === "meal") {
        ctx.session.step = null;
        await addMeal(ctx, t);
        return;
    }

    if (s === "age") {
        ctx.session.data.age = +t;
        ctx.session.step = "height";
        return ctx.reply("Зріст?");
    }
    if (s === "height") {
        ctx.session.data.height = +t;
        ctx.session.step = "weight";
        return ctx.reply("Вага?");
    }
    if (s === "weight") {
        ctx.session.data.weight = +t;
        ctx.session.step = "sex";
        return ctx.reply("Стать (male/female)?");
    }
    if (s === "sex") {
        ctx.session.data.sex = t;
        ctx.session.step = "activity";
        return ctx.reply("Активність (low/light/medium/high)?");
    }
    if (s === "activity") {
        const d = ctx.session.data;
        d.activity = t;
        d.bmr = calculateBMR(d.weight, d.height, d.age, d.sex);
        d.tdee = calculateTDEE(d.bmr, d.activity);

        await saveProfile(ctx.from.id, d);
        ctx.reply("✅ Профіль збережено");
        ctx.session.step = null;
    }
});



bot.start();
console.log("🤖 BOT RUNNING");