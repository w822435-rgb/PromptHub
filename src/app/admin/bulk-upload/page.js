"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Upload, Check, AlertCircle, Loader2 } from "lucide-react";

export default function BulkUploadPage() {
  const [jsonInput, setJsonInput] = useState("");
  const [files, setFiles] = useState([]);
  const [logs, setLogs] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  const addLog = (msg, type = "info") => {
    setLogs((prev) => [...prev, { msg, type, time: new Date().toLocaleTimeString() }]);
  };

  const handleUpload = async () => {
    if (!jsonInput) return alert("请粘贴 JSON 数据");
    if (files.length === 0) return alert("请选择图片文件");

    setIsUploading(true);
    setLogs([]);
    
    try {
      // 1. 解析 JSON
      let data;
      try {
        data = JSON.parse(jsonInput);
      } catch (e) {
        throw new Error("JSON 格式错误，请检查");
      }

      // 获取当前用户
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("请先登录");

      addLog(`开始处理 ${data.length} 条数据...`);

      // 2. 循环处理每一条
      for (let i = 0; i < data.length; i++) {
        const item = data[i];
        addLog(`[${i + 1}/${data.length}] 正在处理: ${item.title}`);

        // 2.1 找到对应的图片文件
        const imageFile = Array.from(files).find(f => f.name === item.imageFileName);
        
        let publicUrl = null;

        if (imageFile) {
          // 2.2 上传图片
          const fileExt = imageFile.name.split('.').pop();
          const fileName = `bulk_${Date.now()}_${i}.${fileExt}`;
          const filePath = `${user.id}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('prompt-images')
            .upload(filePath, imageFile);

          if (uploadError) {
            addLog(`❌ 图片上传失败: ${item.imageFileName}`, "error");
            continue; 
          }

          const { data: urlData } = supabase.storage
            .from('prompt-images')
            .getPublicUrl(filePath);
            
          publicUrl = urlData.publicUrl;
          addLog(`✅ 图片上传成功`);
        } else {
          addLog(`⚠️ 未找到图片文件: ${item.imageFileName}，将仅上传文字`, "warning");
        }

        // 2.3 写入数据库
        // 如果 content 不是 JSON 结构，尝试包装一下，或者直接存
        let finalContent = item.content;
        
        const { error: dbError } = await supabase.from('prompts').insert({
          title: item.title,
          content: finalContent,
          category: item.category || "绘画",
          author_id: user.id,
          image_url: publicUrl,
          is_public: true,
          likes: Math.floor(Math.random() * 10) // 随机给点初始赞
        });

        if (dbError) {
          addLog(`❌ 数据库写入失败: ${dbError.message}`, "error");
        } else {
          addLog(`🎉发布成功: ${item.title}`, "success");
        }
      }

      addLog("🏁 所有任务处理完毕！");

    } catch (error) {
      addLog(`🔥 致命错误: ${error.message}`, "error");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl p-8">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Upload className="w-6 h-6" /> 批量上传工具 (Bulk Upload)
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* 左侧：输入区 */}
          <div className="space-y-6">
            <div>
              <label className="block font-bold mb-2">1. 粘贴 JSON 数据</label>
              // 方法一：用 {' ... '} 包裹（推荐，最简单）
             <p className="text-xs text-slate-500 mb-2">
              格式: {'[{"title": "...", "imageFileName": "1.jpg", "content": "..."}]'}
              </p>
              <textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                className="w-full h-64 p-3 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs"
                placeholder='[
  {
    "title": "示例标题",
    "imageFileName": "1.jpg",
    "content": "提示词...",
    "category": "绘画"
  }
]'
              />
            </div>

            <div>
              <label className="block font-bold mb-2">2. 选择图片文件 (多选)</label>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => setFiles(e.target.files)}
                className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              <p className="text-xs text-slate-400 mt-1">已选择 {files.length} 个文件</p>
            </div>

            <button
              onClick={handleUpload}
              disabled={isUploading}
              className={`w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 ${isUploading ? 'bg-slate-400' : 'bg-black hover:bg-slate-800'}`}
            >
              {isUploading ? <Loader2 className="animate-spin" /> : <Upload />}
              {isUploading ? "正在疯狂上传中..." : "开始批量上传"}
            </button>
          </div>

          {/* 右侧：日志区 */}
          <div className="bg-slate-900 rounded-xl p-4 overflow-hidden flex flex-col h-[500px]">
            <h3 className="text-white font-bold mb-2 text-sm border-b border-slate-700 pb-2">运行日志</h3>
            <div className="flex-1 overflow-y-auto space-y-1 font-mono text-xs">
              {logs.length === 0 && <p className="text-slate-500 italic">等待开始...</p>}
              {logs.map((log, i) => (
                <div key={i} className={`flex gap-2 ${
                  log.type === 'error' ? 'text-red-400' : 
                  log.type === 'success' ? 'text-green-400' : 
                  log.type === 'warning' ? 'text-yellow-400' : 'text-slate-300'
                }`}>
                  <span className="opacity-50">[{log.time}]</span>
                  <span>{log.msg}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}