import OpenAI from "openai";

const isSiliconFlow = !!process.env.SILICONFLOW_API_KEY;
const baseURL = isSiliconFlow 
  ? "https://api.siliconflow.cn/v1" 
  : (process.env.OPENAI_BASE_URL || "https://api.deepseek.com");

const apiKey = isSiliconFlow 
  ? process.env.SILICONFLOW_API_KEY 
  : process.env.OPENAI_API_KEY;

const MODEL_NAME = isSiliconFlow 
  ? "deepseek-ai/DeepSeek-V3" 
  : "deepseek-chat";

const client = new OpenAI({ apiKey, baseURL });

export const runtime = 'edge'; 

export async function POST(request) {
  try {
    const { userInput, mode = 'chat' } = await request.json();

    if (!userInput) return new Response("Input is required", { status: 400 });

    const isChinese = /[\u4e00-\u9fa5]/.test(userInput);
    const targetLanguage = isChinese ? "Simplified Chinese (简体中文)" : "English";

    // 默认参数
    let temperature = 0.7;
    let systemPrompt = "";

    // --- 1. 绘画模式 (极客风 + 视觉冲击) ---
    if (mode === 'image') {
      temperature = 1.0; // 高创造性
      systemPrompt = `
You are a **Visionary Art Director**. 
Your goal is to create a **"Photorealistic Masterpiece"** prompt.

**STRATEGY:**
- Don't just describe; **Direct the Camera**. Use terms like "Macro lens", "Volumetric lighting", "Subsurface scattering".
- **Structure**: Break it down into clear, readable sections.

**OUTPUT JSON ONLY:**
{
  "english_structure": {
    "subject": "...",
    "art_direction": "...",
    "lighting_atmosphere": "...",
    "camera_gear": "...",
    "parameters": "--ar 16:9 --v 6.0 --stylize 250"
  },
  "chinese_structure": {
    "主体": "...",
    "艺术指导": "...",
    "光影氛围": "...",
    "摄影器材": "...",
    "参数": "--ar 16:9 --v 6.0 --stylize 250"
  }
}
`;
    } 
    // --- 2. 编程模式 (架构师风 + 严谨) ---
    else if (mode === 'code') {
      temperature = 0.4; // 低温度求稳
      systemPrompt = `
You are a **Distinguished Tech Architect**.
Create a **"Mission-Critical" System Prompt** for a Coding Agent.

**THE WOW FACTOR:**
The prompt must instruct the AI to perform a **"Tech Stack Audit"** before coding.
It should look like a terminal output or a technical spec sheet.

**OUTPUT FORMAT (Markdown) in ${targetLanguage}:**

**# 🛡️ SYSTEM ROLE**
[Senior Architect / Principal Engineer]

**# 🧠 CORE LOGIC**
1. **Audit**: Analyze request for potential security risks or scalability issues.
2. **Stack Selection**: Recommend the best library/framework if not specified.
3. **Implementation**: Production-ready code.

**# ⚙️ INITIALIZATION TRIGGER**
The AI's first response MUST be structured like this:
\`\`\`text
> ANALYZING REQUEST...
> DETECTED STACK: [Infer stack or ask]
> POTENTIAL RISKS: [List 1 risk]
> CONFIRMATION: Shall I proceed with [Option A] or [Option B]?
\`\`\`
`;
    } 
    // --- 3. 默认对话模式 (🔥 核心升级：智能顾问 + 选项菜单) ---
    else {
      temperature = 0.8; 
      systemPrompt = `
You are a **Prompt Engineering Strategist**.
The user wants a highly capable AI Agent (Writer, Analyst, Planner).
Your goal is to write a System Prompt that creates a **"Wow Moment"** immediately.

**THE STRATEGY: "DIAGNOSE & PRESCRIBE"**
Instead of asking open questions ("What do you want?"), the generated AI Agent must:
1.  **Acknowledge** the user's goal with expert insight.
2.  **Provide a "Menu"** of 3 distinct approaches/styles for the user to pick from.
3.  **Wait** for the user's choice before generating the full content.
*This makes the user feel guided by a pro, not quizzed by a bot.*

**LANGUAGE**: Output in **${targetLanguage}**.

**OUTPUT FORMAT (Markdown):**

**# 🎭 ROLE IDENTITY**
[Define a specific, high-level persona. E.g., "Chief Content Officer"]

**# 🎯 PRIME OBJECTIVE**
[What is the ultimate goal? E.g., "Viral Growth", "Deep Analysis"]

**# 🧠 COGNITIVE PROCESS (The "Brain")**
1. **Input Analysis**: Decode user intent.
2. **Strategy Selection**: Offer 3 distinct strategic paths.
3. **Execution**: Generate high-quality output based on the chosen path.

**# 📋 INITIALIZATION PROTOCOL (The "Wow" Start)**
(Copy this exactly)
The AI's first response MUST be a **"Strategy Menu"**:
"👋 **[Role Name] Online.** I see you want to [User's Goal].
To get the best result, choose a strategy:

| Option | Style/Focus | Best For... |
| :--- | :--- | :--- |
| **A** | [Style 1, e.g., Professional] | [Scenario 1] |
| **B** | [Style 2, e.g., Viral/Emotional] | [Scenario 2] |
| **C** | [Style 3, e.g., Data-Driven] | [Scenario 3] |

*Reply with A, B, or C, or tell me your specific requirements.*"
`;
    }

    const completion = await client.chat.completions.create({
      model: MODEL_NAME,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userInput }
      ],
      stream: true,
      response_format: mode === 'image' ? { type: "json_object" } : { type: "text" },
      temperature: temperature,
      max_tokens: 4096, 
    });

    const stream = new ReadableStream({
      async start(controller) {
        for await (const chunk of completion) {
          const content = chunk.choices[0]?.delta?.content || "";
          if (content) controller.enqueue(new TextEncoder().encode(content));
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });

  } catch (error) {
    console.error("API Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}