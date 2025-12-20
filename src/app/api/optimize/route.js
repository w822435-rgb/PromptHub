import OpenAI from "openai";

const isSiliconFlow = !!process.env.SILICONFLOW_API_KEY;
const baseURL = isSiliconFlow 
  ? "https://api.siliconflow.cn/v1" 
  : (process.env.OPENAI_BASE_URL || "https://api.deepseek.com");

const apiKey = isSiliconFlow 
  ? process.env.SILICONFLOW_API_KEY 
  : process.env.OPENAI_API_KEY;

// 优先使用 V3，如果没有 V3 权限请改为 V2.5
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

    let systemPrompt = "";

    // 1. 绘画模式
    if (mode === 'image') {
      systemPrompt = `
You are a **Midjourney Prompt Generator**. 
The user will describe an image concept. You must translate it into a high-quality Midjourney prompt.
**RULES:**
1. **DO NOT** act as a consultant or ask questions.
2. **DO NOT** output Markdown headers.
3. **ONLY** output the raw prompt string in English.
4. Structure: **[Subject] + [Art Style] + [Environment/Lighting] + [Camera/Color] + [Parameters]**.
**EXAMPLE OUTPUT:**
A futuristic cyberpunk cat with neon mechanical limbs, sitting on a rainy rooftop at night, cinematic lighting, volumetric fog, hyper-realistic, 8k resolution --ar 16:9 --v 6.0
`;
    } 
    // 2. 编程模式
    else if (mode === 'code') {
      systemPrompt = `
You are an elite **Senior Software Architect** from "PromptHub".
The user will ask for a coding solution. Design a robust **CO-STAR** prompt for another AI.
**OUTPUT FORMAT (Markdown):**
**# ROLE**
[Specific Tech Role]
**# CONTEXT**
[Tech Stack & Environment]
**# TASK**
[Step-by-step coding plan]
**# CONSTRAINTS**
[Performance, Security, Best Practices]
**# EXAMPLE**
[**VERY BRIEF** code snippet, max 10 lines]
`;
    } 
    // 3. 默认对话模式
    else {
      systemPrompt = `
You are an elite expert from "PromptHub". Your goal is to write a **Meta-Prompt**.
**CRITICAL RULE:**
1. Do NOT act as the expert yourself.
2. Write a prompt that instructs *ChatGPT/Claude* to act as the expert.
3. Keep the # EXAMPLE section **EXTREMELY BRIEF** (max 100 words) to prevent cutoff.

**OUTPUT FORMAT (Markdown):**
**# ROLE**
[Expert Persona in ${targetLanguage}]
**# CONTEXT**
[Domain Background in ${targetLanguage}]
**# TASK**
[Step-by-step instructions in ${targetLanguage}]
**# CONSTRAINTS**
[Limitations in ${targetLanguage}]
**# FORMAT**
[Structure in ${targetLanguage}]
**# EXAMPLE**
[Short snippet]
`;
    }

    const completion = await client.chat.completions.create({
      model: MODEL_NAME,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userInput }
      ],
      stream: true,
      temperature: 0.7,
      max_tokens: 8192, // 🔥 核心修复：增加最大 token 限制
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