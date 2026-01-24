---
description: Import FCL (Full Container Load) 完整工作流程
---

# Import FCL 工作流程

## 流程總覽

```
              1. ISF Filing
                    │
                    ▼
            2. Await Carrier AN
                    │
                    ▼
         📋 Stakeholder Info Required
                    │
         ┌──────────┴──────────┐
         │                     │
         ▼                     ▼
  3. Truck Scheduling    4. Customs Coordination
         │                     │
         │ (平行)              │
         ▼                     │
  5. Warehouse Coord ◄─────────┘
         │
         ▼
  6. Shipment Delivery (POD)
         │
         ▼
  7. Billing & Collection
```

---

## 步驟詳細說明

### 1. ISF Filing (Approve)
- **說明**：船到美國前要申報 ISF (Importer Security Filing)
- **類型**：Approve - 提醒 OP 記得發送

### 2. Await Carrier AN (Auto)
- **說明**：等船公司發 Arrival Notice
- **類型**：Auto - 系統自動監測收到的 Email
- **觸發下一步**：收到 Carrier AN

### 📋 Stakeholder Info Required
- **時機**：收到 Carrier AN 後
- **動作**：要求用戶填寫 Stakeholder 資訊
- **必填欄位**：
  - Consignee（收貨人）
  - Shipper（發貨人）
  - Notify Party（通知方）
  - Customs Broker（報關行）
  - Trucker（卡車公司）
  - Warehouse（倉庫）

### 3. Truck Scheduling (Approve)
- **說明**：安排司機去提貨
- **動作**：發 Pick-Up Instruction 給 Trucker
- **類型**：Approve
- **與 Step 4 平行進行**

### 4. Customs Coordination (子流程)
- **說明**：清關協調
- **與 Step 3 平行進行**
- **詳見下方子流程**

### 5. Warehouse Coordination (Approve)
- **說明**：跟 Warehouse 確認送貨時間
- **前置條件**：Trucker 說什麼時候可以送
- **動作**：跟 Warehouse 確認，等 Warehouse 確認

### 6. Shipment Delivery (Auto)
- **說明**：等待貨物送達
- **觸發條件**：Trucker 送貨完成
- **動作**：
  - 等待 Trucker 發送 POD (Proof of Delivery)
  - 收到 POD 後，Agent 自動跟 Trucker 要 Invoice
- **完成條件**：收到 POD + Trucker Invoice

### 7. Billing & Collection (Approve)
- **前置條件**：
  - Step 3, 4, 5, 6 全部完成
  - 收到 Trucker Invoice
- **動作**：提醒 OP 發 Final Invoice 給客人
- **完成條件**：客人付款

---

## Customs Coordination 子流程

```
收到 Carrier AN (Step 2 完成)
       │
       ▼
[Check Docs Status] ─────────────────────────────────────┐
   檢查是否已收齊客人文件：                               │
   - Commercial Invoice                                  │
   - Packing / Weight List                               │ 未收齊
   - TLX B/L                                             │ → 24hr 後 Follow-up 客人
   - Product Images                                      │
       │                                                 │
       ▼ 收齊                                            │
[Docs Complete]  ◄───────────────────────────────────────┘
       │
       ▼ Auto 組合 + 轉發給 Customs Broker
       發送內容：
       - Commercial Invoice (客人給的)
       - Packing / Weight List (客人給的)
       - TLX B/L (客人給的)
       - 我們的 Arrival Notice (這時候才產生)
       - Product Images (客人給的)
       │
[Sent to Broker]
       │
       │────► Broker 要更多資料 → Agent 轉給客人要 → 回到 [Check Docs]
       │────► 客人有疑慮 → 🔴 升級給 OP
       │
       ▼ Broker 確認 OK + 給 7501 (Customs Duty)
[7501 Received]
       │
       ▼ Agent 草擬 Email（附 7501）給客人確認
[Awaiting OP Review] ─────► OP 點 Approve 或修改後 Approve
       │
       ▼ 發送給客人
[Awaiting Customer Confirm]
       │
       │────► 24hr 未回 → Auto Follow-up
       │────► 48hr 未回 → 🟡 Needs Attention
       │
       ▼ 客人確認
[Customs Completed ✅]
```

---

## Agent 行為規則

### Email 審核規則

| Email 類型 | 觸發方式 | OP 需要做什麼？ | 升級條件 |
|-----------|---------|---------------|---------|
| Trucker P/U Instr | ✅ Auto 發送 | 不需要 | 司機回覆有問題 → 升級 |
| Broker 轉發文件 | ✅ Auto 轉發 | 不需要 | Broker 回覆有問題 → 升級 |
| Duty 確認（給客人） | ⚠️ 需 Review | 確認金額後點 Approve | - |
| Final Invoice | 📋 提醒 OP | 提醒 OP 記得自己發 | - |

### Agent 判斷邏輯

| 情況 | Agent 行為 | 升級條件 |
|------|-----------|---------|
| Broker 要更多資料 | Auto 轉給客人要 | 客人有疑慮 → 升級 |
| Broker 回覆有問題 | 升級給 OP | - |
| 客人文件不齊 | 24hr 後 Auto Follow-up | - |
| 客人確認 Duty | 等 OP Review 後發送 | - |
| Trucker 給 POD | Auto 跟 Trucker 要 Invoice | - |

### 客人不回覆處理

- **24hr 未回**：Agent 自動發 Follow-up
- **48hr 未回**：標記為 "Needs Attention"，Dashboard 高亮顯示
- OP 可以手動處理（打電話、Close without response 等）

---

## 步驟依賴關係

| Step | 依賴 | 說明 |
|------|-----|------|
| 1. ISF Filing | 無 | 獨立步驟 |
| 2. Await Carrier AN | Step 1 | 等待 Carrier AN |
| 3. Truck Scheduling | Step 2 + Stakeholder Info | 平行進行 |
| 4. Customs Coordination | Step 2 + Stakeholder Info | 平行進行 |
| 5. Warehouse Coordination | Step 3 (Trucker 給送貨時間) | 依賴 Truck Scheduling |
| 6. Shipment Delivery | Step 5 完成 | 等待 POD |
| 7. Billing & Collection | Step 6 完成 + Trucker Invoice | 最後步驟，客人付款完成 |
