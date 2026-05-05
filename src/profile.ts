import { db } from "./db";

export function calculateBMR(
    weight: number,
    height: number,
    age: number,
    sex: "male" | "female"
) {
    return sex === "male"
        ? 10 * weight + 6.25 * height - 5 * age + 5
        : 10 * weight + 6.25 * height - 5 * age - 161;
}

export function calculateTDEE(bmr: number, activity: string) {
    const map: any = {
        low: 1.2,
        light: 1.375,
        medium: 1.55,
        high: 1.725,
    };

    return bmr * (map[activity] || 1.2);
}

/* ---------------- SAVE PROFILE ---------------- */

export async function saveProfile(userId: number, data: any) {
    await db.run(
        `INSERT OR REPLACE INTO users
        (telegram_id, age, height, weight, sex, activity_level, goal, bmr, tdee)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        userId,
        data.age,
        data.height,
        data.weight,
        data.sex,
        data.activity,
        data.goal || null,
        data.bmr,
        data.tdee
    );
}

/* ---------------- GET PROFILE ---------------- */

export function getProfile(telegramId: number) {
    return db.query(`
        SELECT age, weight, height, sex, activity_level, goal, bmr, tdee
        FROM users
        WHERE telegram_id = ?
    `).get(telegramId);
}

/* ---------------- CALORIES LOGIC ---------------- */

/**
 * Нормалізація goal (ВАЖЛИВО)
 * щоб user міг писати:
 * lose / 🔻 lose / "схуднення"
 */
export function normalizeGoal(input: string) {
    const g = input.toLowerCase();

    if (g.includes("lose") || g.includes("схуд")) return "lose";
    if (g.includes("gain") || g.includes("набір")) return "gain";
    if (g.includes("maintain") || g.includes("підтрим")) return "maintain";

    return null;
}

/* ---------------- RECOMMENDED CALORIES ---------------- */

export function getRecommendedCalories(tdee: number, goal: string) {
    if (goal === "lose") return Math.round(tdee - 400);
    if (goal === "gain") return Math.round(tdee + 300);
    return Math.round(tdee);
}

/* ---------------- TEXT HELPERS ---------------- */

export function getGoalText(goal: string) {
    switch (goal) {
        case "lose":
            return "схуднення";
        case "gain":
            return "набір маси";
        case "maintain":
            return "підтримка";
        default:
            return "невідомо";
    }
}