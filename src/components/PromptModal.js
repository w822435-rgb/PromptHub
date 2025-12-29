"use client";

// ✅ 修复：在这里增加了 Star 组件的引入
import { X, Copy, Check, Star, Download, Share2 } from "lucide-react";
import { useState, useEffect } from "react";

export default function PromptModal({ prompt, isOpen, onClose, onLike }) {
  const [copied, setCopied] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  useEffect(() => {
    if (prompt) {
      setIsLiked(prompt.likes > 0); 
    }
  }, [prompt]);

  if (!isOpen || !prompt) return null;

  // 解析提示词内容
  let displayContent = prompt.content;
  let isJson = false;
  try {
    const json = JSON.parse(prompt.content);
    if (json.english_structure) {
      displayContent = json.english_structure;
      isJson = true;
    }
  } catch (e) {
    // 解析失败则显示原始内容
  }

  const handleCopy = () => {
    let textToCopy = "";
    if (isJson) {
       textToCopy = Object.values(displayContent).filter(Boolean).join(", ");
    } else {
       textToCopy = displayContent;
    }
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 格式化数字显示
  const displayLikes = prompt.likes > 0 ? prompt.likes : 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
       {/* 背景遮罩 */}
       <div 
         className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200" 
         onClick={onClose} 
       />
       
       {/* 卡片主体 */}
       <div className="relative w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-300">
          
          {/* 1. 顶部固定栏 (作者 + 关闭) */}
          <div className="absolute top-0 left-0 right-0 z-30 bg-white/80 backdrop-blur-md border-b border-white/20 px-6 py-4 flex items-center justify-between shadow-sm">
             <div className="flex items-center gap-3">
                <img 
                  src={prompt.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${prompt.author_id}`} 
                  className="w-9 h-9 rounded-full border border-slate-100 shadow-sm"
                />
                <div className="flex flex-col">
                   <h2 className="font-black text-base text-slate-900 leading-tight max-w-[180px] sm:max-w-[300px] truncate">{prompt.title}</h2>
                   <p className="text-[10px] font-bold text-slate-400">@{prompt.profiles?.username || "PromptHub User"}</p>
                </div>
             </div>

             <button 
                onClick={onClose} 
                className="bg-slate-100 hover:bg-slate-200 p-2 rounded-full text-slate-600 transition-colors"
             >
                <X className="w-5 h-5" />
             </button>
          </div>

          {/* 中间滚动区域 */}
          <div className="overflow-y-auto custom-scrollbar pt-[70px] pb-[90px]">
             
             {/* 2. 图片区域 (宽度铺满) */}
             <div className="w-full bg-slate-50 relative min-h-[200px]">
                 {prompt.image_url ? (
                   <img 
                     src={prompt.image_url} 
                     alt={prompt.title} 
                     className="w-full h-auto object-contain block" 
                   />
                 ) : (
                   <div className="flex flex-col items-center justify-center text-slate-300 py-24">
                     <Share2 className="w-10 h-10 mb-2 opacity-50" />
                     <span className="font-bold text-xs uppercase tracking-wider">No Preview</span>
                   </div>
                 )}
             </div>

             {/* 3. 提示词内容区域 */}
             <div className="px-6 py-8 md:px-8 md:py-10 bg-white space-y-6">
                
                {/* 标题栏 */}
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.4)]"></div>
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest">
                        PROMPT
                      </h4>
                   </div>
                </div>

                {/* 内容框 */}
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 text-slate-700 font-sans text-[15px] leading-relaxed">
                   {isJson ? (
                      <div className="space-y-6">
                         {Object.entries(displayContent).map(([key, value]) => value && (
                            <div key={key} className="group">
                               <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5 select-none group-hover:text-blue-500 transition-colors">
                                 {key}
                               </div>
                               <div className="text-slate-800 font-medium break-words leading-7 selection:bg-blue-100 selection:text-blue-900">
                                 {value}
                               </div>
                            </div>
                         ))}
                      </div>
                   ) : (
                      <p className="break-words font-medium whitespace-pre-wrap leading-7">{displayContent}</p>
                   )}
                </div>
             </div>
          </div>

          {/* 4. 底部固定操作栏 */}
          <div className="absolute bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-50 px-6 py-4 flex items-center justify-between shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
             
             {/* 左侧：星星收藏 + 下载 */}
             <div className="flex items-center gap-3">
                <button 
                  onClick={() => onLike && onLike(prompt)}
                  className={`
                    flex items-center gap-1.5 px-4 py-2.5 rounded-full border transition-all duration-300 active:scale-95
                    ${isLiked || prompt.likes > 0 
                        ? "border-yellow-100 bg-yellow-50 text-yellow-600" 
                        : "border-slate-100 hover:border-slate-300 text-slate-500 hover:text-slate-700"}
                  `}
                  title={isLiked || prompt.likes > 0 ? "取消收藏" : "收藏"}
                >
                   {/* ✅ 这里使用了 Star 组件 */}
                   <Star className={`w-5 h-5 ${isLiked || prompt.likes > 0 ? "fill-yellow-500 text-yellow-500" : ""}`} />
                   <span className="font-bold text-sm tabular-nums">{displayLikes}</span>
                </button>

                {prompt.image_url && (
                    <a 
                      href={prompt.image_url} 
                      download 
                      target="_blank"
                      className="w-11 h-11 rounded-full flex items-center justify-center border border-slate-100 text-slate-400 hover:text-black hover:border-black transition-all active:scale-90"
                      title="下载图片"
                    >
                       <Download className="w-5 h-5" />
                    </a>
                )}
             </div>

             {/* 右侧：复制按钮 */}
             <button
               onClick={handleCopy}
               className="flex items-center gap-2 bg-black text-white px-8 py-3.5 rounded-full font-bold text-sm shadow-lg shadow-slate-200 hover:bg-slate-800 hover:scale-[1.02] active:scale-95 transition-all"
             >
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? "已复制" : "一键复制"}</span>
             </button>

          </div>

       </div>
    </div>
  );
}