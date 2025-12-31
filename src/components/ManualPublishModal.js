"use client";

import { useState, useRef } from "react";
import { X, Loader2, Trash2, Plus, Image as ImageIcon, MessageSquare } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function ManualPublishModal({ isOpen, onClose, user, onSuccess }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState(""); 
  const [category, setCategory] = useState("绘画"); // 默认改为绘画，方便您测试
  const [imageFiles, setImageFiles] = useState([]); 
  const [imagePreviews, setImagePreviews] = useState([]); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    if (imageFiles.length + files.length > 4) {
      alert("最多只能上传 4 张图片！");
      return;
    }

    const MAX_SIZE = 5 * 1024 * 1024; 
    const validFiles = files.filter(file => {
      if (file.size > MAX_SIZE) {
        alert(`图片 ${file.name} 超过了 5MB 限制，已跳过。`);
        return false;
      }
      return true;
    });

    const newPreviews = validFiles.map(file => URL.createObjectURL(file));
    setImageFiles(prev => [...prev, ...validFiles]);
    setImagePreviews(prev => [...prev, ...newPreviews]);
  };

  const removeImage = (index) => {
    const newFiles = [...imageFiles];
    const newPreviews = [...imagePreviews];
    URL.revokeObjectURL(newPreviews[index]);
    newFiles.splice(index, 1);
    newPreviews.splice(index, 1);
    setImageFiles(newFiles);
    setImagePreviews(newPreviews);
  };

  // 🔥 核心修改：更严格的上传逻辑
  const uploadImages = async () => {
    if (imageFiles.length === 0) return null;

    const uploadedUrls = [];
    
    for (const file of imageFiles) {
      // 这里的路径很重要，确保不包含特殊字符
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      console.log(`正在上传: ${filePath}`);

      const { data, error: uploadError } = await supabase.storage
        .from('prompt-images')
        .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
        });

      if (uploadError) {
        console.error("Supabase 上传详细错误:", uploadError);
        // 🔥 直接抛出错误，中断发布流程，让你知道是上传挂了
        throw new Error(`图片上传失败: ${uploadError.message} (请检查 Supabase Storage Policy)`);
      }

      const { data: publicData } = supabase.storage.from('prompt-images').getPublicUrl(filePath);
      uploadedUrls.push(publicData.publicUrl);
    }

    return uploadedUrls.length > 0 ? JSON.stringify(uploadedUrls) : null;
  };

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      alert("请至少填写标题和提示词内容");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. 上传图片
      let imageUrlString = null;
      if (imageFiles.length > 0) {
          imageUrlString = await uploadImages();
      }

      // 2. 插入数据库
      const { error } = await supabase.from('prompts').insert({
        title,
        description: description || title,
        content,
        category, // 确保这里选的是“绘画”，列表页才会显示大图模式
        author_id: user.id,
        is_public: true,
        image_url: imageUrlString, 
        likes: 0
      });

      if (error) throw error;

      // 重置并关闭
      setTitle("");
      setDescription("");
      setContent("");
      setImageFiles([]);
      setImagePreviews([]);
      
      onSuccess(); 
      onClose();   

    } catch (error) {
      alert("发布失败: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <h2 className="text-lg font-bold text-slate-900">手动发布作品</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 block">
              作品预览图 <span className="text-slate-400 font-normal">(最多4张)</span>
            </label>
            <div className="grid grid-cols-4 gap-4">
              {imagePreviews.map((src, index) => (
                <div key={index} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 group">
                  <img src={src} className="w-full h-full object-cover" alt="preview" />
                  <button onClick={() => removeImage(index)} className="absolute top-1 right-1 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {imageFiles.length < 4 && (
                <div onClick={() => fileInputRef.current?.click()} className="aspect-square rounded-xl border-2 border-dashed border-slate-200 hover:border-slate-400 hover:bg-slate-50 flex flex-col items-center justify-center cursor-pointer transition-all gap-2 group">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Plus className="w-5 h-5 text-slate-400" />
                  </div>
                  <span className="text-xs text-slate-400 font-medium">添加图片</span>
                </div>
              )}
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleImageChange} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">标题</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 transition-all font-bold" placeholder="给你的提示词起个名字..." />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">提示词内容</label>
            <textarea value={content} onChange={(e) => setContent(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 transition-all min-h-[150px] font-mono text-sm leading-relaxed resize-none" placeholder="在这里粘贴你的 Prompt..." />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">分类</label>
            <div className="flex items-center gap-2">
              {[{ id: "对话", icon: MessageSquare }, { id: "绘画", icon: ImageIcon }].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all border ${
                    category === cat.id ? "bg-black text-white border-black shadow-lg shadow-black/20" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <cat.icon className="w-4 h-4" />
                  {cat.id}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
          <button onClick={onClose} className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200/50 transition-colors">取消</button>
          <button onClick={handleSubmit} disabled={isSubmitting} className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-black hover:bg-slate-800 transition-all shadow-lg shadow-black/10 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {isSubmitting ? "发布中..." : "立即发布到社区"}
          </button>
        </div>
      </div>
    </div>
  );
}