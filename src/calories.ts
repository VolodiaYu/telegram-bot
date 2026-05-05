import { GoogleGenerativeAI } from "@google/genai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export async function estimateCalories(mealText: string) {
    const prompt = `
Return ONLY valid JSON.

{
  "items": [
    { "name": "food", "grams": number, "calories": number }
  ],
  "total_calories": number,
  "confidence": number
}

Meal: "${mealText}"
`;

    const res = await model.generateContent(prompt);
    const text = res.response.text();

    try {
        const json = JSON.parse(text);
        if (
            Array.isArray(json.items) &&
            typeof json.total_calories === "number" &&
            typeof json.confidence === "number"
        ) {
            return json;
        }
    } catch {}

    return null;
}