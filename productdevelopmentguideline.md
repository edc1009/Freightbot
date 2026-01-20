🚀 產品開發指令：從「修補模式」轉向「穩定架構」
這份文件統整了我在開發過程中的核心擔憂與產品目標，請務必將其作為後續開發的最高準則。

1. 核心擔憂 (The Concerns)
不穩定性風險 (Fragility )：之前的 JSON 損毀（Unterminated string）不應只透過增加 Token 限制來「掩蓋」，我擔心這會成為產品未來的不定時炸彈。

物流專業缺失 (Lack of Domain Logic)：模型目前仍像「工讀生」，會發生「無限重複船名」或「無法區分海運角色（Carrier vs. Agent）」的情況。

自動化失控 (Safety Risk)：AI 不應在未經確認的情況下，直接將客戶寄來的費用單據寫入系統。

處理混亂 (Ambiguity)：面對「一封郵件多個貨櫃，但只有部分屬於我司」的情況，目前的邏輯還不夠精準。

2. 產品願景 (The SaaS Vision)
Product, Not a Project：這是一個要賣給所有貨代公司的通用產品，必須具備極強的容錯率與專業感。

透明化決策 (Transparency)：用戶需要知道 AI 「為什麼」這樣做，而不是只看到結果。

安全優先 (Safety First)：財務與貨權釋放必須有強硬的「人工攔截點」。

3. 確定的解決方案 (The Roadmap)
A. 後端架構：實施「生產級驗證 (Zod + Retry)」
嚴格 Schema：在 response_schema 中，為每個欄位加上明確描述（如：vessel 限制 50 字內，禁重複）。

Zod 攔截器：建立 outputValidator.js，在 JSON 解析後立即驗證資料格式，不合法則攔截。

精準重試 (Refined Retry)：若驗證失敗，自動觸發第 2 次 API 請求，並在指令中明確告知模型「剛才哪個欄位出錯了」，提高修正率。

B. 邏輯層：升級 agentops-skill.md
身分過濾 (Ownership Filtering)：加入「公司名稱匹配」邏輯。面對多筆資料時，AI 必須學會：

海外代理預報 → 全部提取。

船公司到貨通知 → 只提取與我司相關的條目，其餘忽略。

財務攔截：將所有「費用輸入」動作從 AUTO 調降為 APPROVE。

C. UI/UX：人機協作介面
推理路徑 (Thought Process)：在 UI 顯示 reasoning 欄位，讓 OP 了解 AI 的判斷邏輯（如：為什麼跳過另外 7 個貨櫃）。

計畫確認 (Plan Approval)：在執行多筆 Shipment 建立前，先呈現清單讓用戶「一鍵勾選」。

結語
請執行你提出的 "Implementation Plan - Robust Output Validation"。我不追求開發速度最快，但我追求在面對任何「爛文件」時，系統都能保持穩定且不報錯。