import { Bot, Context, session } from "grammy";
import "dotenv/config";

type Sex = "male" | "female";
type Activity = "low" | "light" | "medium" | "high";

interface Profile {
    age: number;
    height: number;
    weight: number;
    sex: Sex;
    activity: Activity;
    bmr: number;
    tdee: number;
}

interface SessionData {
    step?: "age" | "height" | "weight" | "sex" | "activity";
    temp: Partial<Profile>;
}

const bot = new Bot<Context & { session: SessionData }>(
    process.env.BOT_TOKEN!
);

// ===== SESSION =====
bot.use(
    session({
        initial: (): SessionData => ({ temp: {} }),
    })
);

// ===== CALCULATIONS =====
function calculateBMR(
    weight: number,
    height: number,
    age: number,
    sex: Sex
): number {
    return sex === "male"
        ? 10 * weight + 6.25 * height - 5 * age + 5
        : 10 * weight + 6.25 * height - 5 * age - 161;
}

function calculateTDEE(bmr: number, activity: Activity): number {
    const factors: Record<Activity, number> = {
        low: 1.2,
        light: 1.375,
        medium: 1.55,
        high: 1.725,
    };
    return bmr * factors[activity];
}

// ===== STORAGE =====
const profiles = new Map<number, Profile>();

// ===== COMMANDS =====
bot.command("start", (ctx) => {
    ctx.reply(
        "👋 Привіт!\n\n" +
        "Я бот для підрахунку калорій 🍎\n\n" +
        "Команди:\n" +
        "/set_profile — створити профіль\n" +
        "/my_profile — переглянути профіль"
    );
});

bot.command("set_profile", (ctx) => {
    ctx.session.step = "age";
    ctx.session.temp = {};
    ctx.reply("🔢 Введи свій вік (10–100):");
});

bot.command("my_profile", (ctx) => {
    const profile = profiles.get(ctx.from!.id);

    if (!profile) {
        ctx.reply("❌ Профіль не знайдено. Використай /set_profile");
        return;
    }

    ctx.reply(
        "📊 Твій профіль:\n\n" +
        `Вік: ${profile.age}\n` +
        `Зріст: ${profile.height} см\n` +
        `Вага: ${profile.weight} кг\n` +
        `Стать: ${profile.sex}\n` +
        `Активність: ${profile.activity}\n\n` +
        `🔥 BMR: ${profile.bmr.toFixed(0)} ккал\n` +
        `⚡ TDEE: ${profile.tdee.toFixed(0)} ккал`
    );
});

// ===== STEP LOGIC =====
bot.on("message:text", (ctx) => {
    const step = ctx.session.step;
    const text = ctx.message.text.trim();

    if (!step) return;

    // AGE
    if (step === "age") {
        const age = Number(text);
        if (age < 10 || age > 100) {
            ctx.reply("❌ Вік має бути від 10 до 100. Спробуй ще раз:");
            return;
        }
        ctx.session.temp.age = age;
        ctx.session.step = "height";
        ctx.reply("📏 Введи зріст у см (100–250):");
        return;
    }

    // HEIGHT
    if (step === "height") {
        const height = Number(text);
        if (height < 100 || height > 250) {
            ctx.reply("❌ Зріст має бути від 100 до 250 см. Спробуй ще раз:");
            return;
        }
        ctx.session.temp.height = height;
        ctx.session.step = "weight";
        ctx.reply("⚖️ Введи вагу у кг (30–300):");
        return;
    }

    // WEIGHT
    if (step === "weight") {
        const weight = Number(text);
        if (weight < 30 || weight > 300) {
            ctx.reply("❌ Вага має бути від 30 до 300 кг. Спробуй ще раз:");
            return;
        }
        ctx.session.temp.weight = weight;
        ctx.session.step = "sex";
        ctx.reply("🚻 Вкажи стать (male / female):");
        return;
    }

    // SEX
    if (step === "sex") {
        if (text !== "male" && text !== "female") {
            ctx.reply("❌ Введи male або female:");
            return;
        }
        ctx.session.temp.sex = text as Sex;
        ctx.session.step = "activity";
        ctx.reply(
            "🏃‍♂️ Рівень активності:\n" +
            "low / light / medium / high"
        );
        return;
    }

    // ACTIVITY
    if (step === "activity") {
        if (!["low", "light", "medium", "high"].includes(text)) {
            ctx.reply("❌ Введи: low, light, medium або high");
            return;
        }

        const data = ctx.session.temp as Required<
            Omit<Profile, "bmr" | "tdee">
        >;

        const bmr = calculateBMR(
            data.weight,
            data.height,
            data.age,
            data.sex
        );
        const tdee = calculateTDEE(bmr, text as Activity);

        profiles.set(ctx.from!.id, {
            ...data,
            activity: text as Activity,
            bmr,
            tdee,
        });

        ctx.reply(
            "✅ Профіль збережено!\n\n" +
            `🔥 BMR: ${bmr.toFixed(0)} ккал\n` +
            `⚡ TDEE: ${tdee.toFixed(0)} ккал`
        );

        ctx.session.step = undefined;
        ctx.session.temp = {};
    }
});

// ===== START =====
bot.start();
console.log("🤖 Бот запущений!");