"use client";

import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, Heart, Copy, Check, Share2, ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';

export default function PromptModal({ prompt, isOpen, onClose, onLike }) {
  const [copied, setCopied] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  // 🔥 核心逻辑：多图解析
  // 自动判断 image_url 是单张链接还是 JSON 数组字符串
  const images = (() => {
    if (!prompt?.image_url) return [];
    try {
      if (prompt.image_url.trim().startsWith("[")) {
        const parsed = JSON.parse(prompt.image_url);
        return Array.isArray(parsed) ? parsed : [prompt.image_url];
      }
      return [prompt.image_url];
    } catch (e) {
      return [prompt.image_url];
    }
  })();

  // 每次打开弹窗，重置为第一张图
  useEffect(() => {
    setCurrentImageIndex(0);
  }, [prompt]);

  if (!prompt) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(prompt.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 图片切换逻辑
  const nextImage = (e) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = (e) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-[100]">
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              {/* 卡片主体：白色背景，垂直布局 */}
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-3xl bg-white text-left align-middle shadow-2xl transition-all flex flex-col">
                
                {/* 1. 顶部 Header (用户信息 + 关闭按钮) */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                  <div className="flex items-center gap-3">
                    <img 
                      src={prompt.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${prompt.author_id}`} 
                      className="w-10 h-10 rounded-full border border-slate-200" 
                      alt="avatar" 
                    />
                    <div>
                      <h3 className="font-bold text-slate-900 text-lg leading-tight line-clamp-1">{prompt.title}</h3>
                      <p className="text-xs text-slate-500 font-medium">@{prompt.profiles?.username || "PromptHub User"}</p>
                    </div>
                  </div>
                  <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <X className="w-6 h-6 text-slate-400 hover:text-slate-600" />
                  </button>
                </div>

                {/* 2. 图片展示区 (支持多图轮播) */}
                <div className="relative w-full bg-slate-50 aspect-video group flex items-center justify-center overflow-hidden border-b border-slate-100">
                  {images.length > 0 ? (
                    <>
                      <img 
                        src={images[currentImageIndex]} 
                        alt={prompt.title} 
                        className="w-full h-full object-contain"
                      />
                      
                      {/* 如果有多张图，显示切换按钮 */}
                      {images.length > 1 && (
                        <>
                          <button 
                            onClick={prevImage}
                            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 text-slate-800 shadow-sm opacity-0 group-hover:opacity-100 transition-all hover:bg-white hover:scale-105"
                          >
                            <ChevronLeft className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={nextImage}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 text-slate-800 shadow-sm opacity-0 group-hover:opacity-100 transition-all hover:bg-white hover:scale-105"
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>
                          
                          {/* 底部小圆点指示器 */}
                          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 px-3 py-1.5 bg-black/20 backdrop-blur-sm rounded-full">
                            {images.map((_, idx) => (
                              <div 
                                key={idx} 
                                className={`w-1.5 h-1.5 rounded-full transition-all ${idx === currentImageIndex ? "bg-white w-3" : "bg-white/50"}`} 
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <div className="text-slate-400 flex flex-col items-center gap-2">
                      <Maximize2 className="w-8 h-8 opacity-50" />
                      <span className="text-sm font-bold tracking-widest opacity-50">NO PREVIEW</span>
                    </div>
                  )}
                </div>

                {/* 3. 内容详情滚动区 */}
                <div className="p-6 space-y-6 max-h-[40vh] overflow-y-auto">
                   
                   {/* 提示词内容 */}
                   <div className="space-y-3">
                      <div className="flex items-center gap-2">
                         <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                         <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">PROMPT</span>
                      </div>
                      
                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 text-sm text-slate-700 leading-relaxed font-mono whitespace-pre-wrap break-words selection:bg-blue-100 selection:text-blue-900">
                         <PromptContentDisplay content={prompt.content} />
                      </div>
                   </div>

                   {/* 简介 (About) */}
                   {prompt.description && prompt.description !== prompt.title && (
                      <div className="space-y-2">
                         <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">ABOUT</span>
                         </div>
                         <p className="text-sm text-slate-600 leading-relaxed pl-1">{prompt.description}</p>
                      </div>
                   )}
                </div>

                {/* 4. 底部 Footer (操作栏) */}
                <div className="p-5 border-t border-slate-100 bg-white flex items-center justify-between mt-auto">
                  <div className="flex gap-2">
                      <button 
                        onClick={() => onLike(prompt)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-all border ${
                          prompt.likes > 0 
                            ? "bg-red-50 text-red-500 border-red-100" 
                            : "bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700"
                        }`}
                      >
                        <Heart className={`w-4 h-4 ${prompt.likes > 0 ? "fill-current" : ""}`} />
                        {prompt.likes || 0}
                      </button>
                      <button className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-700 hover:border-slate-300 transition-all">
                        <Share2 className="w-4 h-4" />
                      </button>
                  </div>

                  <button 
                    onClick={handleCopy}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-black text-white text-sm font-bold hover:bg-slate-800 transition-all shadow-lg shadow-black/10 active:scale-95"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? "已复制" : "一键复制"}
                  </button>
                </div>

              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

// 辅助组件：智能显示内容 (支持 JSON 结构化显示或纯文本)
function PromptContentDisplay({ content }) {
  try {
    const json = JSON.parse(content);
    if (json.english_structure || json.chinese_structure) {
      return (
        <div className="flex flex-col gap-4">
          {json.english_structure && (
            <div>
              <div className="text-xs font-bold text-slate-400 mb-2 opacity-70">ENGLISH STRUCTURE</div>
              {Object.entries(json.english_structure).map(([k, v]) => (
                <div key={k} className="mb-1.5"><span className="font-bold text-slate-900 mr-2">{k}:</span>{v}</div>
              ))}
            </div>
          )}
           {json.chinese_structure && (
            <div className="pt-3 border-t border-slate-200/50">
              <div className="text-xs font-bold text-slate-400 mb-2 opacity-70">中文翻译</div>
              {Object.entries(json.chinese_structure).map(([k, v]) => (
                <div key={k} className="mb-1.5"><span className="font-bold text-slate-900 mr-2">{k}:</span>{v}</div>
              ))}
            </div>
          )}
        </div>
      );
    }
    return <>{content}</>;
  } catch (e) {
    return <>{content}</>;
  }
}