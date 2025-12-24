import { NextResponse } from "next/server";

export const runtime = 'edge';

export async function POST(request) {
  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    // 🏆 推荐方案：Flux.1-Dev (画质超强，光影细腻)
    // 相比 Schnell，它生成稍慢几秒，但质量是“商业级”的
    const MODEL_ID = "black-forest-labs/FLUX.1-dev";
    
    // 🥈 备选方案：DeepSeek Janus-Pro (如果想试新模型，可解开下面这行注释)
    // const MODEL_ID = "deepseek-ai/Janus-Pro-7B";

    const response = await fetch("https://api.siliconflow.cn/v1/images/generations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.SILICONFLOW_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL_ID,
        prompt: prompt,
        image_size: "1024x1024", // Flux 推荐分辨率
        num_inference_steps: 25, // Dev 版本推荐 20-30 步 (Schnell 只需要 4 步，所以之前画质差)
        seed: Math.floor(Math.random() * 1000000000) // 随机种子
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("SiliconFlow API Error:", errorData);
      throw new Error(errorData.message || "Failed to generate image");
    }

    const data = await response.json();
    const imageUrl = data.images[0].url;

    return NextResponse.json({ imageUrl });

  } catch (error) {
    console.error("Generate Image Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}