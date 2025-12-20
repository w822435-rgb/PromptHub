"use client";

import { X, Copy, Check, Heart, User, Maximize2, ZoomIn } from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";

export default function PromptModal({ prompt, isOpen, onClose, onLike }) {
  const [copied, setCopied] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false); // 控制图片放大状态

  if (!isOpen || !prompt) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(prompt.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {/* --- 主弹窗 --- */}
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div 
          className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
        
        <div className="relative bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
          
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-white z-10">
            <div className="flex items-center gap-3">
              {prompt.profiles?.avatar_url ? (
                <img src={prompt.profiles.avatar_url} className="w-10 h-10 rounded-full border border-slate-200" alt="avatar" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                  <User className="w-5 h-5" />
                </div>
              )}
              <div>
                <h2 className="text-lg font-bold text-slate-900 leading-tight line-clamp-1">{prompt.title}</h2>
                <p className="text-xs text-slate-500 font-medium">@{prompt.profiles?.username || "PromptHub"}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto bg-slate-50/50 custom-scrollbar">
            
            {/* 🔥 新增：图片展示区域 */}
            {prompt.image_url && (
              <div className="p-6 pb-0">
                <div 
                  className="relative w-full rounded-2xl overflow-hidden bg-slate-200 border border-slate-200 group cursor-zoom-in shadow-sm"
                  onClick={() => setIsZoomed(true)}
                >
                  <img 
                    src={prompt.image_url} 
                    alt="Preview" 
                    className="w-full h-auto object-cover" 
                  />
                  {/* 悬浮提示：点击放大 */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 duration-300">
                    <div className="bg-white/90 backdrop-blur px-3 py-1.5 rounded-full flex items-center gap-2 text-xs font-bold text-slate-800 shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-all">
                      <ZoomIn className="w-3.5 h-3.5" />
                      点击放大预览
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Markdown 文本区域 */}
            <div className="p-6">
              <div className="markdown-body prose prose-slate max-w-none bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <ReactMarkdown>{prompt.content}</ReactMarkdown>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-5 border-t border-slate-100 flex items-center justify-between bg-white z-10">
            <button 
              onClick={() => onLike(prompt)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full hover:bg-red-50 text-slate-600 hover:text-red-500 transition-all font-medium border border-transparent hover:border-red-100"
            >
              <Heart className={`w-5 h-5 ${prompt.likes > 0 ? "fill-red-500 text-red-500" : ""}`} />
              <span>{prompt.likes || 0}</span>
            </button>

            <button 
              onClick={handleCopy}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-full font-bold transition-all shadow-lg hover:scale-105 active:scale-95
                ${copied ? "bg-green-500 text-white" : "bg-black text-white hover:bg-slate-800"}
              `}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "已复制" : "复制提示词"}
            </button>
          </div>
        </div>
      </div>

      {/* --- 🔥 新增：全屏图片放大查看器 (Lightbox) --- */}
      {isZoomed && prompt.image_url && (
        <div 
          className="fixed inset-0 z-[150] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-200 cursor-zoom-out"
          onClick={() => setIsZoomed(false)}
        >
          {/* 关闭按钮 */}
          <button className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors">
            <X className="w-6 h-6" />
          </button>

          <img 
            src={prompt.image_url} 
            alt="Full Preview" 
            className="max-w-full max-h-[90vh] rounded-lg shadow-2xl object-contain animate-in zoom-in-95 duration-300"
          />
        </div>
      )}
    </>
  );
}