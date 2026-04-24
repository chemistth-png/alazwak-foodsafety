import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Send, Settings, ArrowLeft, Loader2, Bell, Save } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const TelegramManagement = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [botToken, setBotToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [broadcastMsg, setBroadcastMsg] = useState("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from("telegram_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) {
        toast({ title: "تعذر تحميل الإعدادات", variant: "destructive" });
      } else if (data) {
        setSettingsId(data.id);
        setBotToken(data.bot_token ?? "");
        setChatId(data.chat_id ?? "");
        setEnabled(data.enabled);
      }
      setLoading(false);
    })();
  }, [user, toast]);

  const saveSettings = async () => {
    if (!user) return;
    setSaving(true);
    const payload = {
      user_id: user.id,
      bot_token: botToken.trim() || null,
      chat_id: chatId.trim() || null,
      enabled,
    };
    const res = settingsId
      ? await supabase.from("telegram_settings").update(payload).eq("id", settingsId)
      : await supabase.from("telegram_settings").insert(payload).select("id").single();
    if (res.error) {
      toast({ title: "فشل الحفظ", description: res.error.message, variant: "destructive" });
    } else {
      if (!settingsId && "data" in res && res.data) setSettingsId((res.data as any).id);
      toast({ title: "تم حفظ الإعدادات" });
    }
    setSaving(false);
  };

  const sendBroadcast = async () => {
    if (!botToken || !chatId) {
      toast({ title: "أدخل التوكن ومعرف المحادثة أولاً", variant: "destructive" });
      return;
    }
    if (!broadcastMsg.trim()) return;
    setSending(true);
    try {
      const r = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: broadcastMsg, parse_mode: "HTML" }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.description || "Telegram error");
      toast({ title: "تم إرسال الرسالة" });
      setBroadcastMsg("");
    } catch (e: any) {
      toast({ title: "فشل الإرسال", description: e.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-background pb-20 md:pb-6">
      <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 py-3 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary text-primary-foreground">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-foreground">إدارة التليجرام</h1>
              <p className="text-[10px] text-muted-foreground">إعدادات البوت والإشعارات</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} title="العودة">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-5 space-y-5">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (
          <Tabs defaultValue="settings" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="settings">الإعدادات</TabsTrigger>
              <TabsTrigger value="broadcast">إرسال رسالة</TabsTrigger>
            </TabsList>

            <TabsContent value="settings">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Settings className="w-5 h-5 text-primary" /> إعدادات البوت الخاص بك
                  </CardTitle>
                  <CardDescription>كل مستخدم لديه بوت ومحادثة منفصلة (عزل كامل عبر RLS)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="token">Bot Token</Label>
                    <Input id="token" type="password" value={botToken} onChange={(e) => setBotToken(e.target.value)} placeholder="123456:ABC-DEF..." dir="ltr" />
                  </div>
                  <div>
                    <Label htmlFor="chat">Chat ID</Label>
                    <Input id="chat" value={chatId} onChange={(e) => setChatId(e.target.value)} placeholder="-1001234567890" dir="ltr" />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="text-sm font-medium">تفعيل البوت</p>
                      <p className="text-xs text-muted-foreground">{enabled ? "نشط" : "متوقف"}</p>
                    </div>
                    <Switch checked={enabled} onCheckedChange={setEnabled} />
                  </div>
                  <Button onClick={saveSettings} disabled={saving} className="w-full">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Save className="w-4 h-4 ml-2" />}
                    حفظ الإعدادات
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="broadcast">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Bell className="w-5 h-5 text-primary" /> إرسال تنبيه
                  </CardTitle>
                  <CardDescription>سيتم الإرسال إلى Chat ID المحدد في الإعدادات</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    placeholder="اكتب رسالتك هنا..."
                    className="min-h-[150px] text-right"
                    value={broadcastMsg}
                    onChange={(e) => setBroadcastMsg(e.target.value)}
                    disabled={!enabled}
                  />
                  <div className="flex justify-end">
                    <Button onClick={sendBroadcast} disabled={sending || !enabled || !broadcastMsg.trim()}>
                      {sending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Send className="w-4 h-4 ml-2" />}
                      إرسال الآن
                    </Button>
                  </div>
                  {!enabled && <p className="text-xs text-muted-foreground">فعّل البوت من تبويب الإعدادات أولاً</p>}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
};

export default TelegramManagement;
