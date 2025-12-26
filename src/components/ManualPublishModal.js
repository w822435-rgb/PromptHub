"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { X, Upload, Image as ImageIcon, Loader2 } from "lucide-react";

export default function ManualPublishModal({ isOpen, onClose, onSuccess, user }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    content: "", // 这里粘贴你的 Nano Banana 提示词
    category: "绘画",
  });
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.content || !imageFile || !user) {
      alert("请填写完整信息并上传图片");
      return;
    }
    setLoading(true);

    try {
      // 1. 上传图片到 Supabase Storage
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('prompt-images')
        .upload(filePath, imageFile);

      if (uploadError) throw uploadError;

      // 2. 获取图片公开链接
      const { data: { publicUrl } } = supabase.storage
        .from('prompt-images')
        .getPublicUrl(filePath);

      // 3. 写入数据库
      // 如果你粘贴的是 JSON 格式，尝试解析一下，保证格式正确；如果是纯文本也兼容
      let finalContent = formData.content;
      try {
          // 尝试美化 JSON 格式（如果用户粘贴的是压缩的 JSON）
          const json = JSON.parse(formData.content);
          finalContent = JSON.stringify(json, null, 2);
      } catch(e) {
          // 不是 JSON，就按普通文本存
      }

      const { error: dbError } = await supabase.from('prompts').insert({
        title: formData.title,
        content: finalContent,
        category: formData.category,
        author_id: user.id, // 关键：这就是为什么显示是你上传的
        image_url: publicUrl,
        is_public: true,
        likes: 0
      });

      if (dbError) throw dbError;

      alert("发布成功！");
      onSuccess(); // 刷新列表
      onClose();   // 关闭弹窗
      
      // 重置表单
      setFormData({ title: "", content: "", category: "绘画" });
      setImageFile(null);
      setPreviewUrl(null);

    } catch (error) {
      console.error("发布失败:", error);
      alert("发布失败: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h3 className="font-bold text-lg">手动发布作品 (Gemini Pro)</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        
        <div className="p-6 space-y-4">
          {/* 图片上传区 */}
          <div className="flex justify-center">
            <label className="relative cursor-pointer group">
              <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
              <div className={`w-full aspect-video min-w-[300px] rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center transition-all ${previewUrl ? 'border-transparent' : 'hover:border-blue-500 hover:bg-slate-50'}`}>
                {previewUrl ? (
                  <img src={previewUrl} className="w-full h-full object-cover rounded-xl" />
                ) : (
                  <>
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-2 group-hover:scale-110 transition-transform"><Upload className="w-6 h-6" /></div>
                    <span className="text-sm text-slate-500 font-medium">点击上传生成的图片</span>
                  </>
                )}
              </div>
            </label>
          </div>

          <input 
            className="w-full p-3 bg-slate-50 rounded-xl border border-slate-100 outline-none focus:border-black transition-colors font-bold"
            placeholder="给作品起个标题..."
            value={formData.title}
            onChange={e => setFormData({...formData, title: e.target.value})}
          />

          <textarea 
            className="w-full p-3 bg-slate-50 rounded-xl border border-slate-100 outline-none focus:border-black transition-colors text-sm font-mono h-32 resize-none"
            placeholder="粘贴提示词 (JSON 或 纯文本)..."
            value={formData.content}
            onChange={e => setFormData({...formData, content: e.target.value})}
          />
          
          <div className="flex gap-2">
              {['绘画', '对话', '编程'].map(cat => (
                  <button 
                    key={cat} 
                    onClick={() => setFormData({...formData, category: cat})}
                    className={`px-3 py-1.5 rounded-lg text-sm font-bold border ${formData.category === cat ? 'bg-black text-white border-black' : 'bg-white text-slate-500 border-slate-200'}`}
                  >
                      {cat}
                  </button>
              ))}
          </div>

          <button 
            onClick={handleSubmit} 
            disabled={loading}
            className="w-full py-3 bg-black text-white rounded-xl font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
            {loading ? "正在发布..." : "立即发布到社区"}
          </button>
        </div>
      </div>
    </div>
  );
}