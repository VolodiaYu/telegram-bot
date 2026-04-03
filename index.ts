import { Bot } from "grammy";
import "dotenv/config";

const bot = new Bot(process.env.BOT_TOKEN!);

// /start
bot.command("start", (ctx) => {
    ctx.reply(
        "👋 Привіт!\n\n" +
        "Я навчальний Telegram-бот 🤖\n" +
        "Я вмію відповідати на команди та повторювати твої повідомлення.\n\n" +
        "Напиши /help щоб побачити доступні команди."
    );
});

// /help
bot.command("help", (ctx) => {
    ctx.reply(
        "📌 Доступні команди:\n" +
        "/start — почати роботу з ботом\n" +
        "/help — список команд\n" +
        "/about — інформація про бота"
    );
});

// Власна команда /about
bot.command("about", (ctx) => {
    ctx.reply(
        "ℹ️ Я створений на Bun + grammY.\n" +
        "Моя задача — показати базову роботу Telegram-ботів."
    );
});

// Реакція на текст без слеша
bot.on("message:text", (ctx) => {
    const text = ctx.message.text.toLowerCase();

    // ⭐ Додаткова фіча
    if (text === "hello" || text === "привіт") {
        ctx.reply("👋 Привіт! Радий тебе бачити!");
        return;
    }

    if (text === "help") {
        ctx.reply("❗ Використай команду /help");
        return;
    }

    // Стандартна відповідь
    ctx.reply(`Я отримав твоє повідомлення: ${ctx.message.text}`);
});

// Запуск бота
bot.start();
console.log("🤖 Бот запущений!");