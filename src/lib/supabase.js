import { createClient } from '@supabase/supabase-js';

// 打印日志检查是否读取到了 (调试用，修复后可删除)
console.log("Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log("Supabase Key:", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "Exists" : "Missing");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// 增加 headers 选项，有时候本地环境需要显式指定
export const supabase = createClient(supabaseUrl, supabaseKey);