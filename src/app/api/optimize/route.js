import OpenAI from "openai";

// 🔥 保持 Edge 模式以防止超时
export const runtime = 'edge'; 

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

export async function POST(request) {
  try {
    const { userInput, mode = 'chat' } = await request.json();

    if (!userInput) return new Response("Input is required", { status: 400 });

    const isChinese = /[\u4e00-\u9fa5]/.test(userInput);
    const targetLanguage = isChinese ? "Simplified Chinese (简体中文)" : "English";

    let temperature = 0.7;
    let systemPrompt = "";

    // --- 1. 绘画模式 (保持不变) ---
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
    // --- 2. 提示词生成模式 (Meta-Prompt 极速版) ---
    else {
      temperature = 0.7; 
      systemPrompt = `
You are a **Senior Prompt Architect**. 
Your goal is to transform the user's request into a **High-Performance System Prompt** using a strict template.

**CRITICAL RULE: KEEP IT CONCISE.** The output must be efficient. Do not generate overly long descriptions.

**STRICT OUTPUT STRUCTURE:**

---
**# ROLE**
[Define a specific expert persona.]

**# CONTEXT**
[Briefly describe the scenario and boundaries.]

**# TASK**
1. **Information Gathering**: [Design 3-4 critical questions to ask the user first.]
2. **Analysis**: [Instruct to analyze the input.]
3. **Action**: [Instruct to provide the solution.]

**# CONSTRAINTS**
* [Tone/Style guidelines.]
* [Core Limitations & Safety protocols.]

**# FORMAT**
[Define the response structure: 1. Acknowledge -> 2. Analysis -> 3. Solution.]

**# EXAMPLE**
[Create a **VERY BRIEF** User/AI dialogue example. **Limit the example to under 100 words**. Show the STRUCTURE, but keep the content minimal.]
---

**INSTRUCTIONS:**
1. **Do NOT** execute the user's request. Write a *System Prompt* for an AI that can do it.
2. **Interactive Approach**: The # TASK must include an "Information Gathering" step.
3. Output directly in **${targetLanguage}**.
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
    return new Response(JSON.stringify({ error: `AI Error: ${error.message}` }), { status: 500 });
  }
}