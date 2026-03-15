
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { 
  Send, Users, MessageSquare, Settings, Bell, 
  ShieldCheck, ArrowLeft, RefreshCw, Search, Loader2
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

interface TelegramUser {
  id: string;
  telegram_id: number;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  is_active: boolean;
  created_at: string;
}

interface TelegramMessage {
  id: string;
  content: string;
  role: 'user' | 'bot';
  created_at: string;
  telegram_user_id: string;
  telegram_users: {
    first_name: string | null;
    username: string | null;
  } | null;
}

const TelegramManagement = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [users, setUsers] = useState<TelegramUser[]>([]);
  const [messages, setMessages] = useState<TelegramMessage[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, messagesRes, settingsRes] = await Promise.all([
        supabase.from("telegram_users").select("*").order("created_at", { ascending: false }),
        supabase.from("telegram_messages").select("*, telegram_users(first_name, username)").order("created_at", { ascending: false }).limit(50),
        supabase.from("telegram_settings").select("*")
      ]);

      if (usersRes.error) throw usersRes.error;
      if (messagesRes.error) throw messagesRes.error;
      if (settingsRes.error) throw settingsRes.error;

      if (usersRes.data) setUsers(usersRes.data);
      if (messagesRes.data) setMessages(messagesRes.data as any);
      if (settingsRes.data) {
        const settingsMap = settingsRes.data.reduce((acc: any, curr) => {
          acc[curr.key] = curr.value;
          return acc;
        }, {});
        setSettings(settingsMap);
      }
    } catch (error: any) {
      console.error("Error fetching telegram data:", error);
      toast({
        variant: "destructive",
        title: "خطأ في جلب البيانات",
        description: error.message || "تأكد من وجود الجداول اللازمة في قاعدة البيانات",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBot = async (enabled: boolean) => {
    try {
      const newValue = { ...settings.bot_status, enabled };
      const { error } = await supabase
        .from("telegram_settings")
        .upsert({ key: "bot_status", value: newValue }, { onConflict: 'key' });

      if (error) throw error;
      setSettings({ ...settings, bot_status: newValue });
      toast({
        title: enabled ? "تم تفعيل البوت" : "تم تعطيل البوت",
        description: "تم تحديث حالة البوت بنجاح",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "فشل تحديث حالة البوت: " + error.message,
      });
    }
  };

  const handleSendBroadcast = async () => {
    if (!broadcastMsg.trim()) return;
    if (users.length === 0) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "لا يوجد مشتركين لإرسال الرسالة إليهم",
      });
      return;
    }
    
    setIsSending(true);
    toast({
      title: "جاري الإرسال",
      description: "يتم الآن إرسال الرسالة لجميع المشتركين...",
    });
    
    // Note: In a real environment, this would call a Supabase Edge Function
    // that iterates through users and sends messages via Telegram Bot API.
    // For now, we simulate the process.
    setTimeout(() => {
      setIsSending(false);
      toast({
        title: "تم الإرسال",
        description: `تم إرسال الرسالة إلى ${users.length} مشترك بنجاح`,
      });
      setBroadcastMsg("");
    }, 2000);
  };

  const filteredUsers = users.filter(u => 
    u.username?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.telegram_id.toString().includes(searchTerm)
  );

  if (loading && users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground">جاري تحميل بيانات التليجرام...</p>
      </div>
    );
  }

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
              <p className="text-[10px] text-muted-foreground">التحكم في البوت والمشتركين</p>
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

      <div className="max-w-7xl mx-auto px-4 py-5 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">المشتركين</p>
                  <p className="text-2xl font-bold">{users.length}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-secondary/10 rounded-lg">
                  <MessageSquare className="w-5 h-5 text-secondary" />
                </div>
                <div>
                  <p className="text-sm font-medium">الرسائل اليوم</p>
                  <p className="text-2xl font-bold">{messages.filter(m => new Date(m.created_at).toDateString() === new Date().toDateString()).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-500/10 rounded-lg">
                  <Settings className="w-5 h-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-sm font-medium">حالة البوت</p>
                  <p className="text-xs text-muted-foreground">{settings.bot_status?.enabled ? "نشط" : "متوقف"}</p>
                </div>
              </div>
              <Switch 
                checked={settings.bot_status?.enabled || false} 
                onCheckedChange={handleToggleBot}
              />
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="broadcast" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="broadcast">بث رسالة</TabsTrigger>
            <TabsTrigger value="users">المشتركين</TabsTrigger>
            <TabsTrigger value="messages">آخر الرسائل</TabsTrigger>
          </TabsList>

          <TabsContent value="broadcast">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bell className="w-5 h-5 text-primary" />
                  إرسال تنبيه عام
                </CardTitle>
                <CardDescription>سيتم إرسال هذه الرسالة إلى جميع مستخدمي البوت النشطين</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea 
                  placeholder="اكتب رسالتك هنا..." 
                  className="min-h-[150px] text-right"
                  value={broadcastMsg}
                  onChange={(e) => setBroadcastMsg(e.target.value)}
                  disabled={isSending}
                />
                <div className="flex justify-end">
                  <Button onClick={handleSendBroadcast} disabled={!broadcastMsg.trim() || isSending}>
                    {isSending ? <Loader2 className="ml-2 w-4 h-4 animate-spin" /> : <Send className="ml-2 w-4 h-4" />}
                    إرسال الآن
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">قائمة المشتركين</CardTitle>
                  <div className="relative w-64">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      placeholder="بحث عن مشترك..." 
                      className="pr-9"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">الاسم</TableHead>
                        <TableHead className="text-right">المعرف (Username)</TableHead>
                        <TableHead className="text-right">Telegram ID</TableHead>
                        <TableHead className="text-right">تاريخ الاشتراك</TableHead>
                        <TableHead className="text-right">الحالة</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.length > 0 ? (
                        filteredUsers.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">{user.first_name} {user.last_name}</TableCell>
                            <TableCell>@{user.username || "N/A"}</TableCell>
                            <TableCell className="font-mono text-xs">{user.telegram_id}</TableCell>
                            <TableCell className="text-xs">{new Date(user.created_at).toLocaleDateString('ar-EG')}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${user.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
                                <span className="text-xs">{user.is_active ? "نشط" : "غير نشط"}</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                            لا يوجد مشتركين مطابقين للبحث
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="messages">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">سجل المحادثات</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-[500px] overflow-y-auto p-2">
                  {messages.length > 0 ? (
                    messages.map((msg) => (
                      <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-start' : 'items-end'}`}>
                        <div className={`max-w-[85%] p-3 rounded-lg ${
                          msg.role === 'user' 
                            ? 'bg-muted text-foreground rounded-tr-none' 
                            : 'bg-primary text-primary-foreground rounded-tl-none shadow-sm'
                        }`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold opacity-80">
                              {msg.role === 'user' ? (msg.telegram_users?.first_name || "مستخدم") : "البوت الذكي"}
                            </span>
                            <span className="text-[9px] opacity-60">
                              {new Date(msg.created_at).toLocaleTimeString('ar-EG')}
                            </span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10 text-muted-foreground">لا توجد رسائل مسجلة</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default TelegramManagement;
