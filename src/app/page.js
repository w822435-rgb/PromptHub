"use client";

import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import AuthModal from "@/components/AuthModal";
import PromptModal from "@/components/PromptModal";
// 🔥 新增引入：手动发布组件
import ManualPublishModal from "@/components/ManualPublishModal"; 
import {
  ArrowUp, Sparkles, Bot, User, Copy, Check, Search, Share2, LogOut, Loader2, ArrowLeft, Zap, Code, Image as ImageIcon, MessageSquare, Star, PlusCircle
} from "lucide-react";
import ReactMarkdown from "react-markdown";

// 辅助函数：格式化点赞数
const formatLikes = (count) => {
  if (!count || count <= 0) return 0;
  if (count > 99) return "99+";
  return count;
};

export default function Home() {
  const [user, setUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState(null);
  
  // 🔥 新增状态：控制发布弹窗显示
  const [showPublishModal, setShowPublishModal] = useState(false);

  const [mode, setMode] = useState("landing");
  const [profileTab, setProfileTab] = useState("created");
  const [selectedCategory, setSelectedCategory] = useState("全部");

  const [generationMode, setGenerationMode] = useState("chat"); 

  const [userInput, setUserInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [publicPrompts, setPublicPrompts] = useState([]); 
  const [profilePrompts, setProfilePrompts] = useState([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    };
    checkUser();
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (!session?.user && mode === 'profile') setMode('landing');
    });
    return () => authListener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (mode === 'landing') fetchPublicPrompts();
  }, [selectedCategory, mode]);

  const fetchPublicPrompts = async () => {
    setIsLoadingMore(true);
    let query = supabase.from('prompts').select('*, profiles(username, avatar_url)').eq('is_public', true).order('created_at', { ascending: false }).limit(50);
    if (selectedCategory !== "全部") query = query.eq('category', selectedCategory);
    const { data, error } = await query;
    if (!error && data) setPublicPrompts(data);
    setIsLoadingMore(false);
  };

  const fetchProfileData = async () => {
    if (!user) return;
    setIsLoadingMore(true);
    let data = [];
    if (profileTab === "created") {
      const res = await supabase.from('prompts').select('*, profiles(username, avatar_url)').eq('author_id', user.id).order('created_at', { ascending: false });
      data = res.data;
    } else {
      const res = await supabase.from('prompt_likes').select('prompt_id, prompts(*, profiles(username, avatar_url))').eq('user_id', user.id).order('created_at', { ascending: false });
      data = res.data?.map(item => item.prompts).filter(Boolean) || [];
    }
    setProfilePrompts(data || []);
    setIsLoadingMore(false);
  };

  useEffect(() => { if (mode === 'profile' && user) fetchProfileData(); }, [mode, profileTab, user]);

  const handleLike = async (prompt) => {
    if (!user) { setShowAuthModal(true); return; }
    
    const { data: existingLike } = await supabase.from('prompt_likes').select('*').eq('user_id', user.id).eq('prompt_id', prompt.id).single();
    let newLikesCount = prompt.likes;

    if (existingLike) {
      await supabase.from('prompt_likes').delete().eq('user_id', user.id).eq('prompt_id', prompt.id);
      newLikesCount = Math.max(0, (prompt.likes || 0) - 1);
    } else {
      await supabase.from('prompt_likes').insert({ user_id: user.id, prompt_id: prompt.id });
      newLikesCount = (prompt.likes || 0) + 1;
    }

    const { error } = await supabase.from('prompts').update({ likes: newLikesCount }).eq('id', prompt.id);
    if (error) { console.error("点赞失败:", error); return; }

    const updateList = (list) => list.map(p => p.id === prompt.id ? { ...p, likes: newLikesCount } : p);
    setPublicPrompts(prev => updateList(prev));
    setProfilePrompts(prev => updateList(prev));
    if (selectedPrompt?.id === prompt.id) setSelectedPrompt(prev => ({ ...prev, likes: newLikesCount }));
  };

  const handleShareToCommunity = async (content) => {
    if (!user) { setShowAuthModal(true); return; }
    
    const tempTitle = window.prompt("第一步：请为这个提示词起个标题", userInput.substring(0, 15));
    if (!tempTitle) return;

    const categoryMap = { "chat": "对话", "image": "绘画", "code": "编程" };
    let categoryInput = categoryMap[generationMode] || "对话";

    let imageUrl = null;
    if (categoryInput === "绘画") {
      const proceed = window.confirm("🤖 是否为此绘画提示词生成预览图？(约需3-5秒)");
      if (proceed) {
        const loadingToast = document.createElement("div");
        loadingToast.className = "fixed top-4 left-1/2 -translate-x-1/2 bg-black text-white px-6 py-3 rounded-full shadow-xl z-[200] flex items-center gap-2 animate-in fade-in slide-in-from-top-2";
        loadingToast.innerHTML = `<span>正在生成预览图...</span>`;
        document.body.appendChild(loadingToast);
        try {
          let promptForImage = content;
          try {
             const jsonContent = JSON.parse(content);
             if (jsonContent.english_structure) {
               promptForImage = Object.values(jsonContent.english_structure).filter(Boolean).join(", ");
             }
          } catch (e) {}

          const imgRes = await fetch("/api/generate-image", {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: promptForImage }),
          });
          const imgData = await imgRes.json();
          if (imgData.imageUrl) imageUrl = imgData.imageUrl;
          else alert("生图失败，将发布文字版");
        } catch (err) { console.error(err); } finally { document.body.removeChild(loadingToast); }
      }
    }

    const { error } = await supabase.from('prompts').insert({
      title: tempTitle, content, description: content.substring(0, 100) + "...", category: categoryInput, is_public: true, author_id: user.id, likes: 0, image_url: imageUrl
    });

    if (!error) {
      alert(`发布成功！已归类为【${categoryInput}】🎉`);
      setMode("landing");
      setSelectedCategory("全部"); 
      fetchPublicPrompts();
    } else {
      alert("发布失败：" + error.message);
    }
  };

  const handleOptimize = async (inputOverride) => {
    const currentInput = inputOverride || userInput;
    if (!currentInput.trim() || loading) return;
    if (mode !== "chat") setMode("chat");
    setUserInput("");
    setLoading(true);
    
    setMessages(prev => [...prev, { role: "user", content: currentInput, mode: generationMode }, { role: "assistant", content: "", mode: generationMode }]);

    try {
      const response = await fetch("/api/optimize", {
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ 
          userInput: currentInput, 
          mode: generationMode 
        }),
      });
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false; let aiContent = "";
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        aiContent += decoder.decode(value, { stream: true });
        setMessages(prev => {
          const newMsgs = [...prev];
          newMsgs[newMsgs.length - 1] = { role: "assistant", content: aiContent, mode: generationMode };
          return newMsgs;
        });
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { if (mode === "chat") messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  return (
    <main className="min-h-screen bg-white text-slate-900 font-sans selection:bg-yellow-100 pb-20">
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} onLoginSuccess={setUser} />
      <PromptModal prompt={selectedPrompt} isOpen={!!selectedPrompt} onClose={() => setSelectedPrompt(null)} onLike={handleLike} />
      
      {/* 🔥 新增：手动发布弹窗 */}
      <ManualPublishModal 
        isOpen={showPublishModal} 
        onClose={() => setShowPublishModal(false)} 
        user={user} 
        onSuccess={() => {
          fetchPublicPrompts();
          setMode("landing");
        }} 
      />

      <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer hover:opacity-80" onClick={() => setMode("landing")}>
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white"><Sparkles className="w-5 h-5 fill-current" /></div>
            <span className="font-bold text-lg tracking-tight hidden md:block">PromptHub</span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setMode("landing")} className="hidden md:flex items-center gap-2 text-slate-600 hover:text-black font-medium text-sm px-4 py-2 rounded-full hover:bg-slate-50 transition-all">
              <Search className="w-4 h-4" /><span>探索</span>
            </button>
            <div className="h-6 w-px bg-slate-200 hidden md:block"></div>
            
            {/* 🔥 新增：手动发布按钮 (只有登录后显示) */}
            {user && (
              <button 
                onClick={() => setShowPublishModal(true)} 
                className="hidden md:flex items-center gap-2 text-white bg-black hover:bg-slate-800 font-bold text-sm px-4 py-2 rounded-full transition-all shadow-sm mr-2"
              >
                <PlusCircle className="w-4 h-4" />
                <span>发布作品</span>
              </button>
            )}

            {user ? (
              <div className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 pr-2 py-1 pl-1 rounded-full transition-all border border-transparent hover:border-slate-200" onClick={() => setMode("profile")}>
                <img src={user.user_metadata?.avatar_url} className="w-8 h-8 rounded-full border border-slate-200" />
                <span className="text-sm font-bold text-slate-700 hidden sm:block max-w-[100px] truncate">{user.user_metadata?.full_name}</span>
              </div>
            ) : (
              <button onClick={() => setShowAuthModal(true)} className="text-sm font-medium px-5 py-2 rounded-full border border-slate-200 hover:border-black hover:bg-black hover:text-white transition-all">登录 / 注册</button>
            )}
          </div>
        </div>
      </header>

      {mode === "profile" && user && (
        <div className="pt-24 max-w-5xl mx-auto px-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col md:flex-row items-start gap-8 mb-12">
            <div className="w-full md:w-64 flex flex-col items-center bg-slate-50 p-8 rounded-3xl border border-slate-100 text-center">
              <img src={user.user_metadata?.avatar_url} className="w-24 h-24 rounded-full border-4 border-white shadow-lg mb-4" />
              <h2 className="text-xl font-black text-slate-900 mb-1">{user.user_metadata?.full_name}</h2>
              <button onClick={async () => { await supabase.auth.signOut(); setUser(null); setMode("landing"); }} className="flex items-center gap-2 text-slate-400 hover:text-red-500 text-sm font-medium transition-colors"><LogOut className="w-4 h-4" /> 退出登录</button>
            </div>
            <div className="flex-1 w-full">
               <div className="flex items-center gap-6 border-b border-slate-100 mb-6">
                {["created", "liked"].map(tab => (
                  <button key={tab} onClick={() => setProfileTab(tab)} className={`pb-3 text-sm font-bold transition-all relative ${profileTab === tab ? "text-black" : "text-slate-400 hover:text-slate-600"}`}>
                    {tab === "created" ? "发布的提示词" : "收藏的提示词"}
                    {profileTab === tab && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-black rounded-full" />}
                  </button>
                ))}
              </div>
              {isLoadingMore ? <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-300" /></div> : profilePrompts.length === 0 ? <div className="text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-200"><p className="text-slate-400 font-medium">这里空空如也...</p></div> : <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{profilePrompts.map(item => <PromptCard key={item.id} item={item} onClick={() => setSelectedPrompt(item)} />)}</div>}
            </div>
          </div>
        </div>
      )}

      {mode === "landing" && (
        <div className="pt-32 pb-20">
          <div className="max-w-3xl mx-auto px-4 text-center mb-20">
            <h1 className="text-5xl md:text-6xl font-black text-slate-900 tracking-tighter mb-6 leading-[1.1]">让 AI <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-amber-600">更懂你</span></h1>
            <p className="text-xl text-slate-500 mb-10 font-medium">PromptHub，你的专属提示词构建与分享平台</p>
            
            <div className="relative group max-w-2xl mx-auto">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-[2rem] blur-md opacity-30 group-hover:opacity-50 transition duration-500"></div>
              
              <div className="relative bg-white rounded-[1.8rem] shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
                <div className="flex items-center p-2 pr-2 border-b border-slate-100/80">
                  <input 
                    type="text" 
                    value={userInput} 
                    onChange={(e) => setUserInput(e.target.value)} 
                    onKeyDown={(e) => e.key === "Enter" && handleOptimize()} 
                    placeholder={
                      generationMode === 'image' ? "例如：生成一只赛博朋克的猫，霓虹灯光..." :
                      generationMode === 'code' ? "例如：帮我写一个 Python 爬虫..." :
                      "例如：我想咨询一下感冒了该怎么办..."
                    }
                    className="flex-1 h-14 bg-transparent border-none outline-none text-lg px-6 text-slate-800 placeholder:text-slate-400" 
                  />
                  <button onClick={() => handleOptimize()} className="w-12 h-12 bg-black rounded-full flex items-center justify-center text-white hover:bg-slate-800 hover:scale-105 transition-all shadow-lg ml-2"><ArrowUp className="w-6 h-6" /></button>
                </div>

                <div className="flex items-center gap-1 p-2 pl-6 bg-slate-50/50">
                  {[
                    { id: "chat", label: "对话", icon: MessageSquare },
                    { id: "image", label: "绘画", icon: ImageIcon },
                    { id: "code", label: "编程", icon: Code },
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setGenerationMode(m.id)}
                      className={`
                        flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold transition-all duration-200
                        ${generationMode === m.id 
                          ? "bg-white text-black shadow-sm border border-slate-200/60" 
                          : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/40"}
                      `}
                    >
                      <m.icon className="w-4 h-4" />
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="max-w-7xl mx-auto px-4">
             <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
              <div className="flex items-center gap-3"><Sparkles className="w-5 h-5 text-yellow-500" /><h2 className="text-lg font-bold text-slate-900">社区精选提示词</h2></div>
              <div className="flex items-center bg-slate-100 p-1 rounded-xl">
                {["全部", "对话", "绘画", "编程"].map((cat) => (
                  <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all duration-300 ${selectedCategory === cat ? "bg-white text-black shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"}`}>{cat}</button>
                ))}
              </div>
            </div>
            {/* 🔥 Grid 布局确认：使用 grid-cols-4 保证整齐排列 */}
            {publicPrompts.length === 0 && !isLoadingMore ? <div className="text-center py-24 bg-slate-50 rounded-3xl border border-slate-100 border-dashed"><div className="flex flex-col items-center gap-3"><div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center text-slate-400"><Search className="w-6 h-6" /></div><p className="text-slate-500 font-medium">在“{selectedCategory}”分类下暂无内容...🚀</p></div></div> : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">{publicPrompts.map((item) => <PromptCard key={item.id} item={item} onClick={() => setSelectedPrompt(item)} />)}</div>}
            {isLoadingMore && <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-300" /></div>}
          </div>
        </div>
      )}

      {mode === "chat" && (
        <div className="flex flex-col h-screen pt-16">
          <div className="flex-1 overflow-y-auto px-4 md:px-0 pb-40">
            <div className="max-w-3xl mx-auto pt-10 space-y-10">
              <button onClick={() => setMode("landing")} className="flex items-center gap-2 text-sm text-slate-400 hover:text-black transition-colors pl-2"><ArrowLeft className="w-4 h-4"/> 返回首页</button>
              {messages.map((msg, index) => <MessageItem key={index} role={msg.role} content={msg.content} onShare={handleShareToCommunity} mode={msg.mode} />)}
              <div ref={messagesEndRef} />
            </div>
          </div>
          <div className="fixed bottom-0 w-full bg-gradient-to-t from-white via-white to-transparent pt-12 pb-8 px-4 z-40">
            <div className="max-w-3xl mx-auto relative">
              <div className={`relative flex items-end bg-white border border-slate-200 rounded-3xl shadow-xl transition-all duration-300 ${loading ? "opacity-80 cursor-wait" : "hover:border-slate-300 ring-4 ring-slate-50"}`}>
                <textarea value={userInput} onChange={(e) => setUserInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleOptimize())} disabled={loading} placeholder={`[${generationMode === 'chat' ? '对话' : generationMode === 'image' ? '绘画' : '编程'}模式] 继续输入...`} className="w-full max-h-[150px] py-4 pl-5 pr-14 bg-transparent border-none outline-none resize-none text-slate-800 placeholder:text-slate-400 text-base leading-relaxed no-scrollbar" rows={1} style={{ height: "auto", minHeight: "56px" }} />
                <button onClick={() => handleOptimize()} disabled={!userInput.trim() || loading} className="absolute right-2 bottom-2 p-2 rounded-xl bg-black text-white"><ArrowUp className="w-5 h-5" /></button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

const getCategoryStyle = (cat) => {
  switch (cat) {
    case "绘画": return { icon: <ImageIcon className="w-5 h-5 text-purple-600" />, bg: "bg-purple-100", text: "text-purple-700", gradient: "from-purple-500/10 to-pink-500/10" };
    case "编程": return { icon: <Code className="w-5 h-5 text-slate-700" />, bg: "bg-slate-100", text: "text-slate-700", gradient: "from-slate-500/10 to-gray-500/10" };
    case "对话": default: return { icon: <MessageSquare className="w-5 h-5 text-blue-600" />, bg: "bg-blue-100", text: "text-blue-700", gradient: "from-blue-500/10 to-cyan-500/10" };
  }
};

function PromptCard({ item, onClick }) {
  const rawCategory = item.category === "AI 助手" || !item.category ? "对话" : item.category;
  const style = getCategoryStyle(rawCategory);
  const isLiked = item.likes > 0;

  return (
    <div onClick={onClick} className="group relative flex flex-col bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.1)] hover:-translate-y-1 transition-all duration-300 cursor-pointer mb-6">
      <div className="relative w-full h-48 overflow-hidden bg-slate-50">
        {item.image_url ? (
          <>
            <img src={item.image_url} alt={item.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </>
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-br ${style.gradient} flex items-center justify-center`}>
            <div className="absolute w-32 h-32 bg-white/40 rounded-full blur-2xl -top-10 -left-10" />
            <div className="absolute w-24 h-24 bg-white/30 rounded-full blur-xl bottom-4 right-4" />
            <div className="relative z-10 w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300">{style.icon}</div>
          </div>
        )}
        <div className="absolute top-4 left-4 z-20">
          <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wide uppercase backdrop-blur-md shadow-sm ${item.image_url ? "bg-white/90 text-slate-800" : "bg-white text-slate-700"}`}>
            {style.icon}{rawCategory}
          </span>
        </div>
      </div>
      <div className="flex flex-col flex-1 p-5">
        <h3 className="text-lg font-bold text-slate-900 leading-snug mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">{item.title}</h3>
        
        {rawCategory === "绘画" ? (
           <p className="text-sm text-slate-500 leading-relaxed line-clamp-3 mb-5 min-h-[4.5em]">
             {(() => {
               try {
                 const json = JSON.parse(item.content);
                 return json.chinese_structure?.["主体"] || json.english_structure?.subject || "点击查看详情";
               } catch (e) {
                 return item.description || item.content;
               }
             })()}
           </p>
        ) : (
           <p className="text-sm text-slate-500 leading-relaxed line-clamp-3 mb-5 min-h-[4.5em]">{item.description || item.content}</p>
        )}

        <div className="mt-auto flex items-center justify-between pt-4 border-t border-slate-50">
          <div className="flex items-center gap-2"><img src={item.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.author_id}`} className="w-6 h-6 rounded-full border border-slate-100" alt="avatar" /><span className="text-xs font-semibold text-slate-400 max-w-[80px] truncate">{item.profiles?.username || "PromptHub"}</span></div>
          
          <div className={`
            flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all duration-300 group/star
            ${isLiked ? "bg-yellow-50 text-yellow-500" : "bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-500"}
          `}>
            <Star className={`w-4 h-4 transition-all duration-300 group-active/star:scale-125 ${isLiked ? "fill-yellow-500 text-yellow-500" : ""}`} />
            <span className="text-xs font-bold">{formatLikes(item.likes)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StructuredImagePrompt({ content }) {
  let parsedJson = null;
  try { parsedJson = JSON.parse(content); } catch (e) { return <div className="whitespace-pre-wrap font-medium font-mono text-sm">{content}</div>; }

  const { english_structure, chinese_structure } = parsedJson;
  if (!english_structure && !chinese_structure) return <div className="whitespace-pre-wrap font-medium font-mono text-sm">{content}</div>;

  return (
    <div className="flex flex-col gap-6">
      {english_structure && (
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200/60">
            <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-500"></span>English Version (For Midjourney/SD)</h4>
            <SingleCopyButton text={Object.values(english_structure).filter(Boolean).join(", ")} />
          </div>
          <div className="flex flex-col gap-2">
            {Object.entries(english_structure).map(([key, value]) => value && (
              <div key={key} className="font-mono text-[13px]"><span className="font-bold text-slate-500 uppercase mr-2">{key}:</span><span className="text-slate-800">{value}</span></div>
            ))}
          </div>
        </div>
      )}
      {chinese_structure && (
        <div className="bg-yellow-50/50 rounded-2xl p-4 border border-yellow-100/60">
           <div className="flex items-center justify-between mb-3 pb-2 border-b border-yellow-200/60">
            <h4 className="text-sm font-bold text-yellow-800 uppercase tracking-wider flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-yellow-500"></span>中文版 (参考译文)</h4>
            <SingleCopyButton text={Object.values(chinese_structure).filter(Boolean).join(", ")} label="复制中文" />
          </div>
          <div className="flex flex-col gap-2">
            {Object.entries(chinese_structure).map(([key, value]) => value && (
              <div key={key} className="text-sm"><span className="font-bold text-yellow-700 mr-2">{key}:</span><span className="text-yellow-900">{value}</span></div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SingleCopyButton({ text, label = "Copy English" }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <button onClick={handleCopy} className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold transition-all bg-white border border-slate-200 hover:bg-slate-100 active:scale-95">
      {copied ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3 text-slate-500" />}
      <span className={copied ? "text-green-600" : "text-slate-500"}>{copied ? "已复制" : label}</span>
    </button>
  );
}

function MessageItem({ role, content, onShare, mode }) {
  const isAi = role === "assistant";
  const isImageMode = mode === "image";
  const [copied, setCopied] = useState(false);
  
  const handleGenericCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex gap-4 ${role === "user" ? "flex-row-reverse" : ""}`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${isAi ? "bg-white border border-slate-200 text-yellow-500" : "bg-black text-white"}`}>{isAi ? <Bot className="w-6 h-6" /> : <User className="w-6 h-6" />}</div>
      <div className="flex flex-col gap-2 max-w-[85%]">
        <div className={`relative px-6 py-5 rounded-3xl text-[15px] leading-7 shadow-sm ${isAi ? "bg-white border border-slate-100 text-slate-800" : "bg-slate-50 text-slate-900 border border-slate-200"}`}>
          {isAi ? ( <> 
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 select-none"><Zap className="w-4 h-4 text-amber-500 fill-amber-500" /><span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{isImageMode ? "Midjourney Prompt Structure" : "Optimized Prompt"}</span></div> 
            {isImageMode ? (<StructuredImagePrompt content={content} />) : (<div className="markdown-body prose prose-slate max-w-none"><ReactMarkdown>{content}</ReactMarkdown></div>)} 
          </>) : <div className="whitespace-pre-wrap font-medium">{content}</div>}
        </div>
        
        {isAi && content && (
          <div className="flex items-center gap-2 pl-2 animate-in fade-in duration-500">
            {!isImageMode && (
              <button onClick={handleGenericCopy} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border bg-white text-slate-500 border-slate-200 hover:text-slate-900">
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? "已复制" : "复制"}
              </button>
            )}
            <button onClick={() => onShare(content)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white text-slate-500 border border-slate-200 hover:text-blue-600"><Share2 className="w-3 h-3" />分享到社区</button>
          </div>
        )}
      </div>
    </div>
  );
}