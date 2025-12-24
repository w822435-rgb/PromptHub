"use client";

import { X, Copy, Check, Star, User, Maximize2, ZoomIn } from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";

// 辅助函数：格式化点赞数
const formatLikes = (count) => {
  if (!count || count <= 0) return 0;
  if (count > 99) return "99+";
  return count;
};

// 🔥 核心修改：独立的复制小按钮组件 (复用自 page.js)
function SingleCopyButton({ text, label = "Copy English" }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e) => { 
    e.stopPropagation(); // 防止触发弹窗背景点击
    navigator.clipboard.writeText(text); 
    setCopied(true); 
    setTimeout(() => setCopied(false), 2000); 
  };
  return (
    <button onClick={handleCopy} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all bg-white border border-slate-200 hover:bg-slate-50 active:scale-95 shadow-sm">
      {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
      <span className={copied ? "text-green-600" : "text-slate-700"}>{copied ? "已复制" : label}</span>
    </button>
  );
}

// 🔥 核心修改：双版本结构化渲染组件 (弹窗版，样式更精致)
function StructuredImagePromptModal({ content }) {
  let parsedJson = null;
  try { parsedJson = JSON.parse(content); } catch (e) { return <div className="markdown-body prose prose-slate max-w-none p-4 bg-slate-50 rounded-2xl"><ReactMarkdown>{content}</ReactMarkdown></div>; }

  const { english_structure, chinese_structure } = parsedJson;
  if (!english_structure && !chinese_structure) return <div className="markdown-body prose prose-slate max-w-none p-4 bg-slate-50 rounded-2xl"><ReactMarkdown>{content}</ReactMarkdown></div>;

  return (
    <div className="flex flex-col gap-8">
      {/* 英文版板块 */}
      {english_structure && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="flex items-center gap-2 text-base font-bold text-slate-800 uppercase tracking-wider"><span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>English Version (For Midjourney/SD)</h3>
            <SingleCopyButton text={Object.values(english_structure).filter(Boolean).join(", ")} />
          </div>
          <div className="bg-slate-50 p-5 rounded-[1.5rem] border border-slate-100 flex flex-col gap-3">
            {Object.entries(english_structure).map(([key, value]) => value && (
              <div key={key} className="font-mono text-[14px] leading-relaxed"><span className="font-bold text-slate-500 uppercase mr-3">{key}:</span><span className="text-slate-800 break-words">{value}</span></div>
            ))}
          </div>
        </div>
      )}
      {/* 中文版板块 */}
      {chinese_structure && (
        <div>
           <div className="flex items-center justify-between mb-4">
            <h3 className="flex items-center gap-2 text-base font-bold text-yellow-800 uppercase tracking-wider"><span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>中文版 (参考译文)</h3>
            <SingleCopyButton text={Object.values(chinese_structure).filter(Boolean).join(", ")} label="复制中文" />
          </div>
          <div className="bg-yellow-50/50 p-5 rounded-[1.5rem] border border-yellow-100/80 flex flex-col gap-3">
            {Object.entries(chinese_structure).map(([key, value]) => value && (
              <div key={key} className="text-[15px] leading-relaxed"><span className="font-bold text-yellow-700 mr-3">{key}:</span><span className="text-yellow-900 break-words">{value}</span></div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PromptModal({ prompt, isOpen, onClose, onLike }) {
  const [isZoomed, setIsZoomed] = useState(false);
  if (!isOpen || !prompt) return null;

  const isLiked = prompt.likes > 0;
  const isImageCategory = prompt.category === "绘画";

  // 🔥 核心修改：底部主复制按钮的逻辑
  // 如果是绘画，默认复制英文版；如果是其他，复制原始内容
  const handleMainCopy = () => {
    let textToCopy = prompt.content;
    if (isImageCategory) {
        try {
            const json = JSON.parse(prompt.content);
            if (json.english_structure) {
                 textToCopy = Object.values(json.english_structure).filter(Boolean).join(", ");
            }
        } catch(e) {}
    }
    navigator.clipboard.writeText(textToCopy);
    // 这里借用一个临时的状态显示复制成功，或者干脆不显示状态，因为上面已经有独立的复制按钮了
    // 为了简洁，这里我们只执行复制动作，不改变UI状态，因为用户可以直接用上面的按钮获得反馈
    alert("已复制英文提示词 (可直接用于 Midjourney)");
  };

  return (
    <>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
        <div className="relative bg-white rounded-[2rem] w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-white z-10">
            <div className="flex items-center gap-4">
              {prompt.profiles?.avatar_url ? (<img src={prompt.profiles.avatar_url} className="w-12 h-12 rounded-full border border-slate-200 shadow-sm" alt="avatar" />) : (<div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400"><User className="w-6 h-6" /></div>)}
              <div><h2 className="text-xl font-black text-slate-900 leading-tight line-clamp-1 mb-1">{prompt.title}</h2><p className="text-sm text-slate-500 font-bold">@{prompt.profiles?.username || "PromptHub"}</p></div>
            </div>
            <button onClick={onClose} className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors"><X className="w-5 h-5 text-slate-500" /></button>
          </div>

          <div className="flex-1 overflow-y-auto bg-white custom-scrollbar p-6">
            {prompt.image_url && (
              <div className="mb-8">
                <div className="relative w-full rounded-3xl overflow-hidden bg-slate-100 border border-slate-200 group cursor-zoom-in shadow-sm" onClick={() => setIsZoomed(true)}>
                  <img src={prompt.image_url} alt="Preview" className="w-full h-auto object-cover" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 duration-300"><div className="bg-white/90 backdrop-blur px-4 py-2 rounded-full flex items-center gap-2 text-sm font-bold text-slate-800 shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all"><ZoomIn className="w-4 h-4" />点击放大预览</div></div>
                </div>
              </div>
            )}

            <div className="pb-6">
              {/* 🔥 核心修改：使用新的双版本渲染组件 */}
              {isImageCategory ? (<StructuredImagePromptModal content={prompt.content} />) : (<div className="markdown-body prose prose-slate max-w-none p-6 bg-slate-50 rounded-3xl border border-slate-100"><ReactMarkdown>{prompt.content}</ReactMarkdown></div>)}
            </div>
          </div>

          <div className="p-6 border-t border-slate-100 flex items-center justify-between bg-white z-10">
            <button onClick={() => onLike(prompt)} className={`flex items-center gap-2 px-5 py-3 rounded-full transition-all duration-300 font-bold border group/modal-star ${isLiked ? "bg-yellow-50 text-yellow-500 border-yellow-100" : "bg-slate-50 text-slate-500 border-slate-100 hover:bg-slate-100 hover:border-slate-200"}`}>
              <Star className={`w-5 h-5 transition-all duration-300 group-active/modal-star:scale-125 ${isLiked ? "fill-yellow-500 text-yellow-500" : ""}`} /><span>{formatLikes(prompt.likes)}</span>
            </button>

            {/* 🔥 核心修改：底部的“一键复制”按钮逻辑调整 */}
            <button onClick={handleMainCopy} className={`flex items-center gap-2 px-8 py-3 rounded-full font-bold transition-all shadow-lg hover:scale-105 active:scale-95 text-lg bg-black text-white hover:bg-slate-800`}>
              <Copy className="w-5 h-5" />
              {isImageCategory ? "一键复制英文版" : "一键复制"}
            </button>
          </div>
        </div>
      </div>

      {isZoomed && prompt.image_url && (
        <div className="fixed inset-0 z-[150] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-200 cursor-zoom-out" onClick={() => setIsZoomed(false)}>
          <button className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"><X className="w-8 h-8" /></button>
          <img src={prompt.image_url} alt="Full Preview" className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl object-contain animate-in zoom-in-95 duration-300" />
        </div>
      )}
    </>
  );
}
// 在 systemPrompt 字符串的最后加上：
"**IMPORTANT:** Stop generating immediately after the # EXAMPLE section. Do not add any closing remarks."