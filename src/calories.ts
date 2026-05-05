import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI("AIzaSyDMmeyiHxiSp3KJ7dUuGKCBgSjOMJI0YW0");

const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
});

export async function estimateCalories(mealText: string) {
    const prompt = `
Return ONLY valid JSON. No markdown. No \`\`\`.

Format:
{
  "items": [
    { "name": "eggs", "grams": 100, "calories": 155 }
  ],
  "total_calories": 235,
  "confidence": 0.82
}

Meal: "${mealText}"
`;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();

        // ❗ CLEAN GEMINI OUTPUT
        const clean = text
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .trim();

        const json = JSON.parse(clean);

        if (!json.items || typeof json.total_calories !== "number") {
            return null;
        }

        return json;
    } catch (e) {
        console.error("Gemini error:", e);
        return null;
    }
}