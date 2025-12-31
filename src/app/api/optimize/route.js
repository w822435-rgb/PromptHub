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

    // --- 1. 绘画模式 (Nano Banana Pro 深度优化版) ---
    if (mode === 'image') {
      temperature = 1.0; 
      systemPrompt = `
You are a **Prompt Specialist for Stable Diffusion (Nano Banana Pro model)**.
Your goal is to convert user descriptions into high-quality AI art prompts optimized for SDXL/Pony based models.

**KEY OPTIMIZATION RULES:**
1. **Format**: Use a mix of **Danbooru tags** (e.g., "1girl, solo") and **Natural Language**.
2. **Quality Boosters**: **MANDATORY**: The 'art_direction' field MUST start with: "(masterpiece, best quality, 8k, highly detailed),".
3. **Subject Purity**: The 'subject' field should ONLY describe the main character/object and action. Do NOT put quality tags here.
4. **Lighting & Camera**: Explicitly state lighting and camera angle.
5. **No Parameters**: Do NOT output technical parameters like steps or sampler.

**OUTPUT JSON ONLY:**
{
  "english_structure": {
    "subject": "Subject Description using tags + prose (e.g., 1girl, solo, standing in rain, white shirt)",
    "art_direction": "(masterpiece, best quality, 8k, highly detailed), Art style (e.g., anime style, realistic, oil painting)",
    "lighting_atmosphere": "Lighting keywords (e.g., volumetric lighting, neon lights)",
    "camera_gear": "Camera angle and focus (e.g., wide angle, macro, bokeh)"
  },
  "chinese_structure": {
    "主体": "...",
    "艺术指导": "...",
    "光影氛围": "...",
    "摄影器材": "..."
  }
}
`;
    } 
    // --- 2. 默认对话模式 (保持原有 CO-STAR + 策略菜单逻辑) ---
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

**LANGUAGE**: Output in **${targetLanguage}**.

**OUTPUT FORMAT (Markdown):**

**# 🎭 ROLE IDENTITY**
[Define a specific, high-level persona.]

**# 🎯 PRIME OBJECTIVE**
[What is the ultimate goal?]

**# 🧠 COGNITIVE PROCESS**
1. **Input Analysis**
2. **Strategy Selection**
3. **Execution**

**# 📋 INITIALIZATION PROTOCOL**
The AI's first response MUST be a **"Strategy Menu"**:
"👋 **[Role Name] Online.** I see you want to [User's Goal].
To get the best result, choose a strategy:

| Option | Style/Focus | Best For... |
| :--- | :--- | :--- |
| **A** | [Style 1] | [Scenario 1] |
| **B** | [Style 2] | [Scenario 2] |
| **C** | [Style 3] | [Scenario 3] |

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