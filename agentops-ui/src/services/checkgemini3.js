// check-gemini3.js
import { GoogleGenerativeAI } from "@google/generative-ai";

// 請工程師在此處替換成他目前使用的 API KEY
const API_KEY = "AIzaSyDKhp5hk0pgiATI19IH112uUNCv71umltY";
const genAI = new GoogleGenerativeAI(API_KEY);

async function listGemini3Models() {
  try {
    console.log("正在查詢可用模型清單...");

    // 取得所有模型
    // 注意：如果是使用 Vertex AI SDK，語法會略有不同
    // 這裡使用的是標準的 Google AI SDK (Google AI Studio)
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (!data.models) {
      console.error("無法取得模型列表，請檢查 API Key 是否正確。");
      console.log("API 回傳結果:", data);
      return;
    }

    const gemini3Models = data.models.filter(m =>
      m.name.includes("gemini-3") || m.displayName.toLowerCase().includes("gemini 3")
    );

    if (gemini3Models.length > 0) {
      console.log("\n✅ 成功找到 Gemini 3 系列模型！請在程式碼中使用以下 ID：");
      console.table(gemini3Models.map(m => ({
        ID: m.name.split('models/')[1],
        名稱: m.displayName,
        描述: m.description
      })));
    } else {
      console.warn("\n❌ 未找到 Gemini 3 相關模型。");
      console.log("當前可用的所有模型名稱包含：", data.models.map(m => m.name.split('models/')[1]).join(", "));
      console.log("\n建議操作：");
      console.log("1. 前往 Google AI Studio 檢查是否已啟用 Gemini 3 預覽。");
      console.log("2. 確保使用的 API Key 屬於參賽開發帳號。");
    }
  } catch (error) {
    console.error("執行過程中發生錯誤:", error);
  }
}

listGemini3Models();