一句話結論：
LiveMark 的 LLM 編修功能應該被定義為一個 「局部、可審核、可替換 provider、可自定義 prompt 的文字編修系統」，而不是聊天主導的 AI 側欄，以避免破壞其核心寫作體驗。

LiveMark LLM 編修 PRD

1. Product Overview

1.1 產品名稱

LiveMark LLM Editing Assistant

1.2 產品目標

在不破壞 LiveMark 專注、即時、所見即所得 Markdown 編輯體驗的前提下，提供一套可插拔的 AI 編修能力，讓使用者可以對選定文字、段落或區塊進行語氣調整、精簡、重寫、翻譯、格式整理與自定義指令處理。

1.3 核心原則
	1.	AI 是 editor action，不是 editor 主體
	2.	預設只處理局部內容，不預設改整篇
	3.	所有修改都必須可預覽、可接受、可拒絕
	4.	prompt 與 provider 必須可配置
	5.	不得干擾打字流、游標穩定性與既有 Markdown 體驗

⸻

2. 問題定義

2.1 使用者痛點

目前 Markdown 寫作者常有以下需求：
	•	修正文法與語病
	•	改寫為更精簡或更專業語氣
	•	在中英之間翻譯
	•	將筆記重組成更清晰段落
	•	快速套用固定寫作風格
	•	對選定區域做局部優化，而不是交給整個 AI 聊天工具

但現有 AI 寫作工具常見問題是：
	•	UI 過重，干擾寫作
	•	直接覆蓋原文，缺乏可控性
	•	以聊天為中心，不適合局部編修
	•	無法自定義企業／個人 prompt
	•	與 Markdown 文件結構整合不佳

2.2 為什麼這功能適合 LiveMark

LiveMark 本身是以寫作與 inline editing 為核心，因此 LLM 最適合扮演：
	•	選取後的編修工具
	•	審稿建議生成器
	•	可保存的 prompt action system

而不是一個永遠開著的聊天助手。

⸻

3. Product Goals / Non-Goals

3.1 Goals

本版本要完成：
	1.	對選定文字或區塊進行 LLM 編修
	2.	支援內建 prompt 與自定義 prompt
	3.	支援 diff 預覽與 accept/reject
	4.	支援多 provider
	5.	保持主編輯器體驗簡潔、不被 AI UI 綁架

3.2 Non-Goals

本版本不做：
	1.	常駐聊天側欄
	2.	文件全文自動重寫
	3.	自動持續監控與主動插嘴建議
	4.	多輪 agent workflow
	5.	雲端協作式 AI 評審流程
	6.	自動修改文件而不經使用者確認

⸻

4. Target Users

4.1 主要使用者
	•	Markdown 重度使用者
	•	技術文件作者
	•	筆記型寫作者
	•	雙語寫作者
	•	有固定風格需求的專業用戶
	•	希望將 AI 作為「編修工具」而非「內容代寫工具」的使用者

4.2 次要使用者
	•	開源使用者，希望接不同模型
	•	企業內部用戶，希望掛自家模型或私有 endpoint
	•	進階使用者，希望建立 reusable prompt library

⸻

5. User Stories
	1.	作為一名使用者，我希望選取一段文字後可以快速點擊「潤稿」，並看到修改前後差異。
	2.	作為一名使用者，我希望建立自己的 prompt，例如「改成 CTO 向董事會匯報的語氣」。
	3.	作為一名使用者，我希望可以指定不同 provider，例如 OpenAI、Anthropic、Gemini 或本地 Ollama。
	4.	作為一名使用者，我希望 AI 的輸出不要直接覆蓋原文，而是先讓我 accept / reject。
	5.	作為一名使用者，我希望這套功能只在我需要時出現，不要打斷我寫作。
	6.	作為一名使用者，我希望快捷鍵能直接打開 AI 編修動作，而不必切到另一個面板。
	7.	作為一名使用者，我希望 prompt 可以引用目前選取內容、當前文件標題、frontmatter 等上下文。

⸻

6. Scope

6.1 In Scope
	•	選取文字觸發 AI 編修
	•	段落／區塊級編修
	•	自定義 prompt 模板
	•	prompt 管理 UI
	•	provider 設定
	•	diff 預覽
	•	accept / reject / retry
	•	快捷鍵與 command palette 入口
	•	基本上下文注入

6.2 Out of Scope
	•	全文自動大綱重寫
	•	自動多步 agent
	•	雲端 prompt 同步
	•	團隊共用 prompt marketplace
	•	語音輸入到 LLM 編修
	•	embedding / RAG 知識庫整合

⸻

7. Functional Requirements

7.1 編修對象層級

系統需支援以下粒度：

Level 1: Selection

使用者選取任意文字後執行編修。

Level 2: Current Block

若未選取文字，可對當前 block 執行，例如：
	•	段落
	•	heading
	•	list item
	•	quote block
	•	code comment block（非 code 內容本體，除非後續另開）

Level 3: Multi-block range

允許使用者選擇多個 block 一起處理。

7.2 內建 Prompt Actions

首版預設提供以下 action：
	•	Improve Writing
	•	Fix Grammar
	•	Make Concise
	•	Expand
	•	Rewrite in Professional Tone
	•	Rewrite in Friendly Tone
	•	Translate to English
	•	Translate to Chinese
	•	Summarize Selection
	•	Format as Bullet Points
	•	Custom Prompt

7.3 自定義 Prompt

使用者可以：
	•	新增 prompt
	•	編輯 prompt
	•	刪除 prompt
	•	排序 prompt
	•	收藏 prompt
	•	設定是否顯示於右鍵選單
	•	指定預設模型或 provider
	•	設定輸出模式

7.4 輸出模式

每個 prompt action 可指定輸出模式：
	1.	Replace Suggestion
顯示 diff，接受後取代原文
	2.	Insert Below
在原文下方插入結果
	3.	Side-by-side Preview
原文與結果並排顯示（僅在 preview panel / modal 中）
	4.	Append as Comment / Note
後續版本考慮，首版可不做

⸻

8. UX / UI Entry Points

8.1 主要入口

A. 文字選取浮動工具列

當使用者選取文字後，出現輕量浮動工具列：
	•	Improve
	•	Concise
	•	Translate
	•	Custom
	•	More…

這是最快入口。

B. 右鍵選單

右鍵選取內容時顯示：
	•	AI Rewrite
	•	AI Fix Grammar
	•	AI Translate
	•	AI Custom Prompt…

適合滑鼠導向使用者。

C. Command Palette

加入：
	•	AI: Improve Selection
	•	AI: Rewrite with Custom Prompt
	•	AI: Translate Selection
	•	AI: Retry Last Prompt
	•	AI: Manage Prompts
	•	AI: Open Provider Settings

適合鍵盤導向使用者。

D. 快捷鍵

建議：
	•	Mod+Shift+K：開啟 AI Action Picker
	•	Mod+Shift+Enter：執行最近一次 AI 編修
	•	Alt+Enter：接受目前 diff
	•	Esc：拒絕目前 diff

8.2 不建議的入口

首版不建議加入：
	•	永久開啟的 AI 側欄
	•	一個大型聊天視窗常駐右側
	•	編輯時自動跳出 AI 建議氣泡

原因：會破壞 LiveMark 的專注寫作感。

⸻

9. Diff Interaction Design

9.1 原則

LLM 結果不能直接覆蓋原文，必須先可審核。

9.2 Diff 呈現方式

Option A: Inline Diff Overlay

在原位置顯示：
	•	刪除部分以刪除樣式標示
	•	新增部分以新增樣式標示
	•	block 邊框高亮表示正在審核

適合短文字。

Option B: Review Panel Diff

較長輸出顯示在 review panel 中，提供：
	•	原文
	•	建議稿
	•	unified diff / split diff
	•	Accept
	•	Reject
	•	Retry
	•	Copy Result

適合長段落與多區塊。

Option C: Replace Preview Modal

若輸出跨度太大或結構改變過多，顯示 modal 預覽再決定。

9.3 Diff 操作

每次 AI 結果至少支援：
	•	Accept
	•	Reject
	•	Retry
	•	Copy Result
	•	Insert Below Instead
	•	Edit Prompt and Retry

9.4 Diff 邏輯要求
	•	保留原始 selection anchor
	•	接受修改後游標應停在合理位置
	•	拒絕修改後原始內容與選區完整恢復
	•	Undo/Redo 可正確回溯 AI accept 動作
	•	對 multi-block 修改要作為單一 transaction 提交

⸻

10. Prompt Schema

10.1 Prompt Object

建議資料結構：

{
  "id": "prompt_improve_professional",
  "name": "Rewrite in Professional Tone",
  "description": "Rewrite the selected text in a concise and professional style.",
  "systemPrompt": "You are a precise writing editor.",
  "userTemplate": "Rewrite the following text in a professional tone:\\n\\n{{selection}}",
  "inputScope": "selection",
  "outputMode": "replace_suggestion",
  "provider": "default",
  "model": "",
  "temperature": 0.3,
  "maxTokens": 1200,
  "tags": ["rewrite", "tone"],
  "showInContextMenu": true,
  "showInToolbar": true,
  "requiresConfirmation": false
}

10.2 Template Variables

首版支援以下變數：
	•	{{selection}}
	•	{{current_block}}
	•	{{document_title}}
	•	{{frontmatter}}
	•	{{language}}
	•	{{file_path}}

後續可擴充：
	•	{{previous_block}}
	•	{{next_block}}
	•	{{heading_path}}
	•	{{document_summary}}

10.3 Prompt Validation

儲存 prompt 前需驗證：
	•	必須至少包含一個輸入變數或固定內容
	•	不可空白
	•	字數上限需合理
	•	變數名稱非法時給出提示
	•	inputScope 與 prompt 內容一致

⸻

11. Provider Architecture

11.1 設計原則

Provider 層必須抽象化，避免與單一模型商深度綁定。

11.2 首版支援類型

建議 provider interface 支援：
	•	OpenAI-compatible
	•	Anthropic
	•	Gemini
	•	Ollama / Local model
	•	Custom HTTP endpoint

11.3 Provider Settings

每個 provider 至少需配置：
	•	provider type
	•	endpoint URL
	•	API key
	•	default model
	•	timeout
	•	max tokens
	•	temperature 上下限
	•	rate limit / retry policy（基本）

11.4 Provider 抽象介面

建議內部統一成：

interface LLMProvider {
  name: string;
  listModels(): Promise<ModelInfo[]>;
  generate(request: LLMRequest): Promise<LLMResponse>;
  validateConfig(config: ProviderConfig): Promise<ValidationResult>;
}

11.5 Request 統一格式

interface LLMRequest {
  systemPrompt?: string;
  userPrompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  metadata?: {
    documentPath?: string;
    language?: string;
    promptId?: string;
  };
}

11.6 Response 統一格式

interface LLMResponse {
  text: string;
  finishReason?: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
  raw?: unknown;
}

11.7 BYOK

首版應採用 BYOK（Bring Your Own Key）模式。
不做平台代管帳號，不做 LiveMark 自有 token billing。

原因：
	•	簡化商業與法務負擔
	•	保持開源中立
	•	便於企業與本地部署使用

⸻

12. Data & Storage

12.1 本地儲存內容

應儲存在本機設定檔中的資料：
	•	prompt library
	•	provider configs
	•	last used action
	•	per-document AI preferences（可後續加入）

12.2 敏感資訊

API key 必須：
	•	優先使用 OS keychain / secure storage
	•	若 fallback 到本地檔案，必須明確提示風險
	•	不記錄到一般 log
	•	不包含在 bug report 匯出中

12.3 不應預設上傳的內容
	•	全文內容
	•	背景檔案
	•	其他分頁文件
	•	使用者歷史 prompt 執行內容

預設只送出明確選取範圍與必要上下文。

⸻

13. Error Handling

13.1 必須處理的失敗類型
	•	API key 無效
	•	模型不存在
	•	provider 無回應
	•	timeout
	•	rate limit
	•	返回空結果
	•	返回過長結果
	•	輸出不適合目前 scope

13.2 錯誤 UX

錯誤應該：
	•	輕量提示
	•	不打斷文件編輯狀態
	•	提供 Retry
	•	允許切換 provider
	•	保留原始選取內容

⸻

14. Performance Requirements

14.1 互動性能
	•	觸發 action 後 UI 應在 100ms 內給出 loading feedback
	•	送出請求期間不得鎖死主編輯器
	•	diff 套用必須透過單次 transaction 完成
	•	不得造成游標異常跳動

14.2 長文限制

首版建議限制：
	•	selection token / 字元長度上限
	•	超出時提醒改用較小範圍
	•	多 block 處理需分段保護

⸻

15. Security / Privacy

15.1 基本原則

使用者必須清楚知道：
	•	哪些文字會被送到模型
	•	使用的是哪個 provider
	•	使用的是哪個模型

15.2 明確披露

在第一次使用時顯示：
	•	內容將發送至外部模型服務
	•	API key 使用方式
	•	本地模型與遠端模型差異

15.3 企業友善設計

支援：
	•	自定義 endpoint
	•	關閉遙測
	•	本地模型
	•	僅本機儲存 prompt

⸻

16. Technical Notes

16.1 與編輯器整合原則

LLM 編修結果不能粗暴 replace DOM，應該：
	•	先轉為 editor transaction
	•	用 ProseMirror-friendly diff / patch 套用
	•	保持 block 結構合法
	•	避免直接 innerHTML 注入

16.2 Markdown Safety

對輸出要做基本檢查：
	•	heading 層級合法
	•	list 結構不破
	•	table 輸出必要時正規化
	•	code fence 配對完整
	•	frontmatter 不得誤傷

16.3 多分頁情境

考慮你常見的多 terminal / 多工作流類似需求，LiveMark 若支援 multi-tab，則 AI 狀態必須與當前 tab 綁定，不能在切換 tab 後把結果套到錯的文件或錯的 selection 上。

⸻

17. MVP Definition

17.1 MVP 必做
	1.	選取文字後 AI Action Picker
	2.	4–6 個內建 prompt
	3.	自定義 prompt CRUD
	4.	單一 provider abstraction
	5.	OpenAI-compatible endpoint 支援
	6.	diff preview
	7.	accept / reject / retry
	8.	provider settings
	9.	secure API key storage

17.2 MVP 不做
	1.	常駐聊天 UI
	2.	文件全文 rewrite
	3.	prompt marketplace
	4.	雲端同步
	5.	多輪上下文記憶
	6.	自動審稿巡檢

⸻

18. Future Roadmap

Phase 2
	•	文件級 style profile
	•	prompt folders / tags
	•	模型切換快捷入口
	•	review panel 深度整合
	•	per-document prompt presets

Phase 3
	•	AI review mode
	•	heading-aware rewrite
	•	frontmatter-aware writing assistant
	•	批次處理多個 block
	•	本地模型最佳化
	•	prompt 匯入匯出

Phase 4
	•	結構級建議（標題、段落順序、重複內容）
	•	文件一致性檢查
	•	企業共享 prompt 套件

⸻

19. Success Metrics

19.1 Product Metrics
	•	每週至少一次使用 AI 編修的活躍使用者比例
	•	平均每位使用者的 prompt 執行次數
	•	自定義 prompt 建立率
	•	accept rate / reject rate
	•	retry rate
	•	provider 分布
	•	錯誤率與 timeout rate

19.2 Experience Metrics
	•	AI 功能觸發後的編輯中斷率
	•	diff 接受後 undo 使用率
	•	使用者是否更偏好 selection-level action 而非全段改寫
	•	是否出現顯著的游標／transaction 錯誤回報

⸻

20. Open Questions
	1.	自定義 prompt 是否允許 JavaScript-like transforms 或僅純模板？
	2.	是否要支援不同 prompt 指定不同 provider？
	3.	review panel 是否作為長輸出的唯一承載區？
	4.	是否需要 prompt 匯入匯出？
	5.	是否允許文件 frontmatter 控制預設 prompt？
	6.	本地模型是否要有專門的 token / timeout 最佳化策略？
	7.	AI 生成後是否要保留歷史版本供回看？

⸻

21. 推薦產品決策

我建議 LiveMark 對這功能採用下面這個產品定位：

「LLM-assisted editing, not AI-first writing」

也就是：
	•	AI 幫你修
	•	AI 幫你改
	•	AI 幫你提建議
	•	但 AI 不主宰整個寫作流程

這樣最符合 LiveMark 原本的價值，也最有機會做出和 Typora 明顯不同、但又不失控的差異化。

如果你要，我下一步可以直接幫你補成 工程可落地版本，把這份 PRD 繼續展開成：
資料結構、UI flow、狀態機、以及 PR 分階段拆分計畫。