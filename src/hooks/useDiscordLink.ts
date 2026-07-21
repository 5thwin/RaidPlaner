import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";

// 사람이 타이핑하기 헷갈리는 문자(0/O, 1/I/L)를 뺀 32자 알파벳.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;
const CODE_TTL_MS = 10 * 60 * 1000;

function generateRandomCode(): string {
  return Array.from(
    { length: CODE_LENGTH },
    () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)],
  ).join("");
}

// 로그인한 유저 본인의 디스코드 연동 상태를 확인하고, 연동용 1회성 코드를
// 발급하는 훅. 실제 연동(discord_links row 생성)은 디스코드에서 "/연동
// 코드:XXXXXX"를 입력했을 때 discord-interactions Edge Function이 처리한다 —
// 이 훅은 코드 발급까지만 담당한다.
export function useDiscordLink() {
  const { user } = useAuth();
  const [isLinked, setIsLinked] = useState<boolean | null>(null);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!user) {
      setIsLinked(null);
      return;
    }

    const { data } = await supabase
      .from("discord_links")
      .select("discord_user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    setIsLinked(data !== null);
  }, [user]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function generateCode(): Promise<string> {
    if (!user) {
      throw new Error("로그인이 필요합니다.");
    }

    setIsGenerating(true);
    setError(null);

    try {
      const code = generateRandomCode();
      const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString();

      const { error: insertError } = await supabase
        .from("discord_link_codes")
        .insert({ code, user_id: user.id, expires_at: expiresAt });

      if (insertError) {
        throw new Error(`코드 발급에 실패했습니다: ${insertError.message}`);
      }

      setGeneratedCode(code);
      return code;
    } catch (err) {
      setError(err instanceof Error ? err.message : "코드 발급에 실패했습니다.");
      throw err;
    } finally {
      setIsGenerating(false);
    }
  }

  return {
    isLinked,
    generatedCode,
    isGenerating,
    error,
    generateCode,
    reload,
  };
}
