import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";
import { handleDocument } from "./handler.ts";

serve(async (req) => {
  // Caller JWT keeps storage and document RLS active; no service-role bypass.
  const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  return handleDocument(req, {
    authenticate: async () => {
      const { data, error } = await client.auth.getUser();
      return error ? null : data.user?.id ?? null;
    },
    download: async (path) => {
      const { data, error } = await client.storage.from("chat-files").download(path);
      if (error || !data) throw new Error("Download failed");
      return data;
    },
    save: async (document) => {
      const { data, error } = await client.from("documents").insert(document).select("id").single();
      if (error || !data) throw new Error("Persistence failed");
      return data.id;
    },
  });
});
