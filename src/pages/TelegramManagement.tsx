
import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
  ArrowLeft, RefreshCw, Search, Loader2, Construction
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

const TelegramManagement = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [botEnabled, setBotEnabled] = useState(false);

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
        {/* Placeholder notice */}
        <Card className="border-dashed border-2 border-muted-foreground/30">
          <CardContent className="p-6 flex flex-col items-center gap-3 text-center">
            <Construction className="w-10 h-10 text-muted-foreground" />
            <h2 className="text-lg font-semibold text-foreground">قيد التطوير</h2>
            <p className="text-sm text-muted-foreground max-w-md">
              ميزة إدارة التليجرام قيد التطوير. سيتم ربط البوت بقاعدة البيانات قريباً لإدارة المشتركين والرسائل.
            </p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">المشتركين</p>
                  <p className="text-2xl font-bold">0</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-secondary/10 rounded-lg">
                <MessageSquare className="w-5 h-5 text-secondary-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">الرسائل اليوم</p>
                <p className="text-2xl font-bold">0</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent rounded-lg">
                  <Settings className="w-5 h-5 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">حالة البوت</p>
                  <p className="text-xs text-muted-foreground">{botEnabled ? "نشط" : "متوقف"}</p>
                </div>
              </div>
              <Switch 
                checked={botEnabled} 
                onCheckedChange={(v) => {
                  setBotEnabled(v);
                  toast({ title: v ? "تم تفعيل البوت" : "تم تعطيل البوت" });
                }}
              />
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="broadcast" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="broadcast">بث رسالة</TabsTrigger>
            <TabsTrigger value="users">المشتركين</TabsTrigger>
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
                  disabled
                />
                <div className="flex justify-end">
                  <Button disabled>
                    <Send className="ml-2 w-4 h-4" />
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
                        <TableHead className="text-right">المعرف</TableHead>
                        <TableHead className="text-right">الحالة</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-10 text-muted-foreground">
                          لا يوجد مشتركين بعد
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
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
