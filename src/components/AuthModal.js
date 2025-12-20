"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { X, Loader2, Mail, Lock, User as UserIcon } from "lucide-react";

export default function AuthModal({ isOpen, onClose, onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true); // true=登录, false=注册
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      if (isLogin) {
        // --- 登录逻辑 ---
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        onLoginSuccess(data.user);
        onClose();
      } else {
        // --- 注册逻辑 ---
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: email.split("@")[0], // 默认用邮箱前缀做昵称
              avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`, // 随机头像
            },
          },
        });
        if (error) throw error;
        alert("注册成功！请检查您的邮箱完成验证（如果开启了邮箱验证）。");
        setIsLogin(true); // 注册完切回登录
      }
    } catch (err) {
      setErrorMsg(err.message === "Invalid login credentials" ? "账号或密码错误" : err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* 遮罩层 */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* 弹窗主体 */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* 关闭按钮 */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-slate-50 rounded-full hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5 text-slate-500" />
        </button>

        <div className="p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              {isLogin ? "欢迎回来" : "加入社区"}
            </h2>
            <p className="text-slate-500 mt-2 text-sm">
              {isLogin ? "登录账号，管理你的提示词库" : "注册账号，分享你的创意"}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {/* 邮箱输入 */}
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-black transition-colors" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="邮箱地址"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pl-12 pr-4 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all font-medium"
              />
            </div>

            {/* 密码输入 */}
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-black transition-colors" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="密码 (至少6位)"
                minLength={6}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pl-12 pr-4 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all font-medium"
              />
            </div>

            {errorMsg && (
              <div className="text-red-500 text-xs text-center font-medium bg-red-50 py-2 rounded-lg">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white font-bold py-4 rounded-2xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-black/20"
            >
              {loading && <Loader2 className="w-5 h-5 animate-spin" />}
              {isLogin ? "立即登录" : "创建账号"}
            </button>
          </form>

          {/* 切换登录/注册 */}
          <div className="mt-6 text-center">
            <button
              onClick={() => { setIsLogin(!isLogin); setErrorMsg(""); }}
              className="text-sm font-medium text-slate-500 hover:text-black underline underline-offset-4 transition-colors"
            >
              {isLogin ? "没有账号？去注册" : "已有账号？去登录"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}