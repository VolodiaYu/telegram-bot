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
    return bmr * map[activity];
}

export async function saveProfile(
    telegramId: number,
    data: any
) {
    await db.run(
        `
        INSERT INTO users
        (telegram_id, age, weight, height, sex, activity_level, bmr, tdee)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(telegram_id) DO UPDATE SET
            age=excluded.age,
            weight=excluded.weight,
            height=excluded.height,
            sex=excluded.sex,
            activity_level=excluded.activity_level,
            bmr=excluded.bmr,
            tdee=excluded.tdee
        `,
        telegramId,
        data.age,
        data.weight,
        data.height,
        data.sex,
        data.activity,
        data.bmr,
        data.tdee
    );
}