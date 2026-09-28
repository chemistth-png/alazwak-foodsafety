import { supabase } from "@/integrations/supabase/client";

export type LovableFunctionName = "parse-document" | "generate-image";

export async function invokeLovableFunction<T>(
  functionName: LovableFunctionName,
  body: Record<string, unknown>,
): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("يجب تسجيل الدخول أولاً");

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${functionName}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        "Authorization": `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(body),
    },
  );

  const result = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(result?.error || `فشل الاتصال بالخدمة (${response.status})`);
  }
  return result as T;
}
