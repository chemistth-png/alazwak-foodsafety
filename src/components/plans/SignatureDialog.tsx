import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export interface SignaturePayload {
  signer_name: string;
  pin_hash: string;
  signed_at: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSigned: (sig: SignaturePayload) => void;
}

// Hash PIN client-side before storing (defense-in-depth; full security on backend)
async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(pin);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const SignatureDialog = ({ open, onOpenChange, onSigned }: Props) => {
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSign = async () => {
    if (!name.trim() || pin.length < 4) {
      toast.error("يرجى إدخال الاسم ورقم PIN (4 أرقام على الأقل)");
      return;
    }
    setLoading(true);
    try {
      const pin_hash = await hashPin(pin);
      onSigned({ signer_name: name.trim(), pin_hash, signed_at: new Date().toISOString() });
      toast.success("تم التوقيع بنجاح");
      setName(""); setPin("");
      onOpenChange(false);
    } catch {
      toast.error("فشل التوقيع");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            توقيع رقمي للاعتماد
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label htmlFor="sig-name">اسم الموقّع</Label>
            <Input id="sig-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="الاسم الكامل" />
          </div>
          <div>
            <Label htmlFor="sig-pin">رقم PIN السري</Label>
            <Input
              id="sig-pin"
              type="password"
              inputMode="numeric"
              maxLength={8}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              placeholder="••••"
            />
            <p className="text-xs text-muted-foreground mt-1">
              يُحفظ التوقيع مع طابع زمني وهوية المستخدم.
            </p>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button onClick={handleSign} disabled={loading}>
            {loading ? "جارٍ التوقيع..." : "توقيع واعتماد"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SignatureDialog;
