"use client";

import { useEffect, useRef, useState } from "react";

export default function WarpTunnel({ onFinished }) {
  const canvasRef = useRef(null);
  const [isFlashing, setIsFlashing] = useState(false); // 控制最后的白光

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    let animationFrameId;
    
    // 自适应屏幕尺寸
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", resize);
    resize();

    // 粒子系统配置
    const stars = [];
    const speed = 15; // 穿越速度
    const starCount = 800; // 代码碎片数量
    const codeSnippets = ["0", "1", "if", "const", "var", "{ }", "=>", "AI", "func", "return", ";", "</>"];

    // 初始化粒子
    for (let i = 0; i < starCount; i++) {
      stars.push({
        x: Math.random() * canvas.width - canvas.width / 2,
        y: Math.random() * canvas.height - canvas.height / 2,
        z: Math.random() * canvas.width // 深度
      });
    }

    // 绘图循环
    const render = () => {
      // 1. 拖尾效果：不用 clearRect，而是覆盖一层半透明黑色，形成运动轨迹
      ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      stars.forEach((star, index) => {
        // 移动粒子 (Z轴减小 = 靠近屏幕)
        star.z -= speed;

        // 如果粒子跑到了屏幕后面，重置到远处
        if (star.z <= 0) {
          star.x = Math.random() * canvas.width - canvas.width / 2;
          star.y = Math.random() * canvas.height - canvas.height / 2;
          star.z = canvas.width;
        }

        // 3D 投影公式：x2d = x / z * 焦距
        const x2d = (star.x / star.z) * canvas.width + cx;
        const y2d = (star.y / star.z) * canvas.width + cy;

        // 计算大小和透明度 (越近越大越亮)
        const size = (1 - star.z / canvas.width) * 20; 
        const opacity = (1 - star.z / canvas.width);

        if (x2d > 0 && x2d < canvas.width && y2d > 0 && y2d < canvas.height) {
          ctx.fillStyle = `rgba(0, 255, 128, ${opacity})`; // 极客绿
          ctx.font = `${size}px monospace`;
          // 随机取一个代码字符绘制
          ctx.fillText(codeSnippets[index % codeSnippets.length], x2d, y2d);
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center overflow-hidden animate-in fade-in duration-500">
      <canvas ref={canvasRef} className="absolute inset-0" />
      
      {/* 中心的光束源头 */}
      <div className="absolute w-2 h-2 bg-white rounded-full shadow-[0_0_100px_50px_rgba(255,255,255,0.8)] animate-pulse" />

      {/* 最后的白光过渡层 */}
      <div className={`absolute inset-0 bg-white pointer-events-none transition-opacity duration-700 ease-out ${isFlashing ? "opacity-100" : "opacity-0"}`} />
    </div>
  );
}