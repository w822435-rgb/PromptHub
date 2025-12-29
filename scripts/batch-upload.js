const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// ---------------- 配置区 ----------------

const START_FROM_INDEX = 0; 

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
// 确保填入正确的 service_role key
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRidnVkeHdib3d1dmZzZHVmZnFuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjA0MzY5NiwiZXhwIjoyMDgxNjE5Njk2fQ.vE7NWmuoLEvzUGjJGF9jUiNCH3BLSGSP4S-ETerItKY";

// 你的用户ID
const AUTHOR_ID = "4790e8c7-69c1-41e2-b24f-2b66e31d6249"; 

const BUCKET_NAME = 'prompt-images';

// ----------------------------------------

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || SUPABASE_SERVICE_KEY.startsWith("这里")) {
    console.error("❌ 错误：请检查 SUPABASE_URL 和 SUPABASE_SERVICE_KEY！");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const results = [];
const CSV_PATH = path.join(__dirname, 'data/prompts.csv');
const IMAGES_DIR = path.join(__dirname, 'data/images');

console.log("🚀 开始读取 CSV 文件...");

fs.createReadStream(CSV_PATH)
  .pipe(csv({
    mapHeaders: ({ header }) => header.trim().replace(/^\ufeff/, '') 
  }))
  .on('data', (data) => results.push(data))
  .on('end', async () => {
    console.log(`📊 共找到 ${results.length} 条数据，准备从第 ${START_FROM_INDEX} 条开始处理...`);

    let successCount = 0;
    let skipCount = 0;

    // 遍历所有数据，但只处理指定范围
    for (let i = 0; i < results.length; i++) {
      const row = results[i];
      // 这里的 i 是从 0 开始的 (0 代表第1条)，所以第 111 条的索引是 110
      // 我们用人类直觉：如果当前是第 (i+1) 条，小于设置的起始条数，就跳过
      if ((i + 1) < START_FROM_INDEX) {
          continue; 
      }

      try {
        const title = (row['标题'] || row['Title'])?.trim(); 
        const imageName = row['输出图片 (Output)']?.trim(); 
        const promptContent = row['提示词 (Prompt)'];
        
        if (!imageName || !promptContent) {
            console.log(`⚠️ [无效行] 第 ${i + 1} 条数据缺失图片或提示词`);
            continue;
        }

        // 再次检查防重 (双重保险)
        const { data: existing } = await supabase
            .from('prompts')
            .select('id')
            .eq('title', title)
            .eq('author_id', AUTHOR_ID)
            .maybeSingle();

        if (existing) {
            console.log(`⏩ [跳过] 第 ${i + 1} 条已存在: ${title}`);
            skipCount++;
            continue; 
        }

        console.log(`\n🔄 [上传中] 第 ${i + 1} 条: ${title} (${imageName})...`);

        // --- 上传逻辑 ---
        const localImagePath = path.join(IMAGES_DIR, imageName);
        if (!fs.existsSync(localImagePath)) {
          console.error(`   ❌ 错误：图片文件不存在 (${localImagePath})`);
          continue;
        }

        const fileBuffer = fs.readFileSync(localImagePath);
        const fileExt = path.extname(imageName);
        const storagePath = `batch_import/${Date.now()}_${imageName}`; 

        const { error: uploadError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(storagePath, fileBuffer, {
            contentType: fileExt === '.png' ? 'image/png' : 'image/jpeg',
            upsert: true
          });

        if (uploadError) throw new Error(`上传图片失败: ${uploadError.message}`);

        const { data: { publicUrl } } = supabase.storage
          .from(BUCKET_NAME)
          .getPublicUrl(storagePath);

        const finalContent = JSON.stringify({
            english_structure: {
                subject: promptContent,
                style: "Nano Banana Style"
            }
        });

        const { error: dbError } = await supabase.from('prompts').insert({
          title: title || '未命名作品',
          content: finalContent,
          description: promptContent.substring(0, 150),
          category: '绘画',
          author_id: AUTHOR_ID,
          image_url: publicUrl,
          is_public: true,
          likes: Math.floor(Math.random() * 20)
        });

        if (dbError) throw new Error(`数据库写入失败: ${dbError.message}`);

        console.log(`   ✅ 成功导入！`);
        successCount++;

      } catch (err) {
        console.error(`   ❌ 失败:`, err.message);
      }
    }
    console.log(`\n🎉 全部完成！本次新增: ${successCount} 条，跳过已存在: ${skipCount} 条`);
  });