import OpenAI from "openai";
import { createClient } from '@supabase/supabase-js';

// 1. 初始化 SiliconFlow 客户端
const client = new OpenAI({
  apiKey: process.env.SILICONFLOW_API_KEY, 
  baseURL: "https://api.siliconflow.cn/v1" // 硅基流动地址
});

// 2. 初始化 Supabase Admin (用于上传)
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
);

export const runtime = 'edge';

export async function POST(request) {
  try {
    const { prompt } = await request.json();

    if (!prompt) return new Response("Prompt is required", { status: 400 });

    console.log("开始生成预览图...");

    // --- A. 调用 Flux.1-schnell (又快又好) ---
    const imageResponse = await client.images.generate({
      model: "black-forest-labs/FLUX.1-schnell", 
      prompt: prompt.substring(0, 500), 
      n: 1,
      size: "1024x1024", 
    });

    const originalImageUrl = imageResponse.data[0].url;
    console.log("Flux 生成成功，URL:", originalImageUrl);

    // --- B. 转存到 Supabase Storage ---
    // 下载图片
    const imgRes = await fetch(originalImageUrl);
    const imgBuffer = await imgRes.arrayBuffer();
    
    // 上传到 Supabase
    const fileName = `flux_${Date.now()}.png`;
    const { error: uploadError } = await supabaseAdmin
      .storage
      .from('prompt-images')
      .upload(fileName, imgBuffer, {
        contentType: 'image/png',
        upsert: false
      });

    if (uploadError) throw uploadError;

    // 获取公开链接
    const { data: { publicUrl } } = supabaseAdmin
      .storage
      .from('prompt-images')
      .getPublicUrl(fileName);

    return new Response(JSON.stringify({ imageUrl: publicUrl }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("生图失败:", error);
    // 即使失败也返回 null，不阻断流程
    return new Response(JSON.stringify({ imageUrl: null, error: error.message }), { status: 200 });
  }
}