import OpenAI from "openai";

// 🔥 核心修改 1：强制使用 Edge Runtime，突破 10秒 超时限制
export const runtime = 'edge'; 

const isSiliconFlow = !!process.env.SILICONFLOW_API_KEY;
const baseURL = isSiliconFlow 
  ? "https://api.siliconflow.cn/v1" 
  : (process.env.OPENAI_BASE_URL || "https://api.deepseek.com");

const apiKey = isSiliconFlow 
  ? process.env.SILICONFLOW_API_KEY 
  : process.env.OPENAI_API_KEY;

// 如果用的是 SiliconFlow，通常模型名是 'deepseek-ai/DeepSeek-V3'
// 如果用的是 DeepSeek 官方，模型名通常是 'deepseek-chat'
const MODEL_NAME = isSiliconFlow 
  ? "deepseek-ai/DeepSeek-V3" 
  : "deepseek-chat";

const client = new OpenAI({ apiKey, baseURL });

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
    // --- 2. 默认对话模式 (策略菜单逻辑) ---
    else {
      temperature = 1.3; // DeepSeek 建议稍微调高温度以获得更有创意的思维
      systemPrompt = `
You are a **Prompt Engineering Strategist**.
The user wants a highly capable AI Agent.
Your goal is to write a System Prompt that creates a **"Wow Moment"**.

**THE STRATEGY: "DIAGNOSE & PRESCRIBE"**
1. **Acknowledge** the user's goal.
2. **Provide a "Menu"** of 3 distinct approaches/styles.
3. **Wait** for the user's choice.

**LANGUAGE**: Output in **${targetLanguage}**.

**OUTPUT FORMAT (Markdown):**
**# 🎭 ROLE IDENTITY**
...
**# 🎯 PRIME OBJECTIVE**
...
**# 📋 STRATEGY MENU**
| Option | Style | Best For... |
| :--- | :--- | :--- |
| **A** | ... | ... |
| **B** | ... | ... |
| **C** | ... | ... |
`;
    }

    const completion = await client.chat.completions.create({
      model: MODEL_NAME,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userInput }
      ],
      stream: true, // 🔥 必须开启流式传输，防止 Vercel 认为连接挂起
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
    return new Response(JSON.stringify({ error: `AI 响应超时或出错: ${error.message}` }), { status: 500 });
  }
}