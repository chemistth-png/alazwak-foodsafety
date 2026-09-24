import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const eventSchema = z.object({id:z.string(),revision:z.number(),action:z.string(),actor_id:z.string(),recorded_at:z.string(),evidence:z.string(),digest:z.string()});
const recordSchema = z.object({revision:z.number(),state:z.enum(['draft','submitted','reviewed','approved','rejected']),snapshot:z.record(z.unknown()),digest:z.string(),events:z.array(eventSchema),is_owner:z.boolean(),roles:z.array(z.string())});
type Approval = z.infer<typeof recordSchema>;
const labels: Record<string,string> = {draft:'مسودة',submitted:'بانتظار المراجعة',reviewed:'بانتظار الاعتماد',approved:'معتمد لهذا الإصدار',rejected:'مرفوض — يلزم إصدار جديد',submit:'إرسال للمراجعة',review:'تسجيل المراجعة',approve:'اعتماد الإصدار',reject:'رفض',title:'العنوان',doc_number:'رقم الوثيقة',report_number:'رقم التقرير',description:'الوصف',hazards:'تحليل المخاطر',ccps:'نقاط التحكم الحرجة',corrective_action:'الإجراء التصحيحي',responsible:'المسؤول',status:'الحالة التشغيلية',batch_number:'الدفعة',lot_code:'رقم التشغيلة',hazard_type:'نوع الخطر',ccp_ref:'مرجع CCP',step:'الخطوة',hazard:'الخطر',type:'النوع',severity:'الشدة',likelihood:'الاحتمال',controlMeasure:'إجراء التحكم',isCCP:'نقطة تحكم حرجة',ccpNumber:'رقم CCP',criticalLimit:'الحد الحرج',monitoring:'الرصد',frequency:'التكرار',correctiveAction:'الإجراء التصحيحي',verification:'التحقق',records:'السجلات'};
function Snapshot({value}: {value:unknown}) {
  if(Array.isArray(value)) return <ol className="space-y-3 list-decimal list-inside">{value.map((row,i)=><li key={i}><Snapshot value={row}/></li>)}</ol>;
  if(value && typeof value==='object') return <dl className="space-y-2">{Object.entries(value).filter(([key])=>key in labels).map(([key,entry])=><div key={key}><dt className="font-semibold">{labels[key]}</dt><dd className="whitespace-pre-wrap break-words"><Snapshot value={entry}/></dd></div>)}</dl>;
  return <>{typeof value==='boolean' ? (value?'نعم':'لا') : String(value??'—')}</>;
}
export default function ApprovalRecord() {
  const {kind,id}=useParams(); const {user}=useAuth();
  return <ApprovalBody key={`${user?.id}/${kind}/${id}`} kind={kind} id={id}/>;
}
function ApprovalBody({kind,id}:{kind?:string;id?:string}) {
  const {user}=useAuth();
  const [record,setRecord]=useState<Approval|null>(null);const [error,setError]=useState('');const [busy,setBusy]=useState(false);
  const [evidence,setEvidence]=useState('');const [code,setCode]=useState('');const [factorId,setFactorId]=useState('');const [qr,setQr]=useState('');const [mfaReady,setMfaReady]=useState(false);const [enrolledThisSession,setEnrolledThisSession]=useState(false);
  const load=useCallback(async()=>{
    setRecord(null);setError('');setMfaReady(false);
    if(!id || !z.string().uuid().safeParse(id).success || !['haccp','nc'].includes(kind??'')){setError('رابط السجل غير صالح');return;}
    setBusy(true);
    try {
      const {data,error:failure}=await supabase.rpc('record_approval',{p_kind:kind!,p_id:id,p_action:'read'});
      if(failure) throw failure;
      setRecord(recordSchema.parse(data));
    }catch {setError('تعذّر تحميل سجل الاعتماد. قد يكون المسار غير مفعّل أو لا تملك صلاحية الوصول.');}
    finally {setBusy(false);}
  },[kind,id]);
  useEffect(()=>{void load();},[load]);
  async function prepareMfa() {
    setBusy(true);setError('');
    try {
      const {data,error:failure}=await supabase.auth.mfa.listFactors();if(failure)throw failure;
      const existing=data.totp.find(f=>f.status==='verified');
      if(existing){setFactorId(existing.id);setEnrolledThisSession(false);return;}
      const result=await supabase.auth.mfa.enroll({factorType:'totp',friendlyName:`Approval ${Date.now()}`});
      if(result.error)throw result.error;
      setFactorId(result.data.id);setQr(result.data.totp.qr_code);setEnrolledThisSession(true);
    }catch {setError('تعذّر تجهيز التحقق الثنائي. راجع إعدادات حسابك.');}finally{setBusy(false);}
  }
  async function verifyMfa() {
    setBusy(true);setError('');
    try {
      const {error:failure}=await supabase.auth.mfa.challengeAndVerify({factorId,code});if(failure)throw failure;
      setMfaReady(true);setQr('');setCode('');setEnrolledThisSession(false);
    }catch {setError('رمز التحقق غير صالح أو انتهت صلاحيته.');}finally{setBusy(false);}
  }
  async function cancelMfaSetup() {
    // Explicit cancellation only: never unenroll on a failed OTP, network error or unmount.
    if(!enrolledThisSession || !factorId || mfaReady)return;
    setBusy(true);setError('');
    try {
      const {data,error:failure}=await supabase.auth.mfa.listFactors();if(failure)throw failure;
      const factor=data.totp.find(f=>f.id===factorId);
      // Fail closed if the factor is already verified or its status cannot be established.
      if(!factor || factor.status!=='unverified'){
        setError('تعذّر تأكيد حالة العامل؛ لم يتم حذفه. راجع إعدادات حسابك.');
        return;
      }
      const result=await supabase.auth.mfa.unenroll({factorId});
      if(result.error)throw result.error;
      setFactorId('');setQr('');setCode('');setEnrolledThisSession(false);
    }catch {setError('تعذّر إلغاء إعداد التحقق الثنائي؛ لم نؤكد حذف العامل. حاول مجددًا من إعدادات الحساب.');}
    finally {setBusy(false);}
  }
  async function decide(action:string) {
    if(!record || !id || !kind)return;
    setBusy(true);setError('');
    try {
      const {data,error:failure}=await supabase.rpc('record_approval',{p_kind:kind,p_id:id,p_action:action,p_revision:record.revision,p_evidence:evidence.trim()});
      if(failure)throw failure;
      setRecord(recordSchema.parse(data));setEvidence('');setMfaReady(false);
    }catch {setRecord(null);setError('لم يُسجّل القرار. أعد تحميل السجل: ربما تغيّر الإصدار أو الصلاحية أو الجلسة.');}
    finally {setBusy(false);setMfaReady(false);}
  }
  const reviewer=record?.events.find(e=>e.revision===record.revision&&e.action==='review')?.actor_id;
  const canReview=record&&!record.is_owner&&record.state==='submitted'&&record.roles.includes('reviewer');
  const canApprove=record&&!record.is_owner&&record.state==='reviewed'&&record.roles.includes('approver')&&reviewer!==user?.id;
  const actions=record?.is_owner&&record.state==='draft'?['submit']:canReview?['review','reject']:canApprove?['approve','reject']:[];
  return <main dir="rtl" className="flex-1 overflow-auto p-4 space-y-5 max-w-4xl mx-auto w-full pb-24">
    <h1 className="text-xl font-bold">مراجعة واعتماد الإصدار المحفوظ</h1>
    <p>التعديلات غير المحفوظة لا تدخل في هذا القرار. أي حفظ جديد يتطلب مراجعة واعتماداً جديدين.</p>
    {error&&<p role="alert" className="text-destructive">{error}</p>}
    <Button onClick={()=>void load()} disabled={busy}>تحديث السجل</Button>
    {record&&<>
      <h2 className="font-bold">الإصدار {record.revision} — {labels[record.state]}</h2>
      <section aria-label="محتوى الإصدار" className="border rounded p-4"><Snapshot value={record.snapshot}/></section>
      <details><summary>بصمة الإصدار SHA-256</summary><code className="break-all" dir="ltr">{record.digest}</code></details>
      {!!actions.length&&<section className="space-y-3">
        <Label htmlFor="approval-evidence">دليل المراجعة أو الفاعلية وسبب القرار (10–4000 حرف)</Label>
        <Textarea id="approval-evidence" value={evidence} onChange={e=>setEvidence(e.target.value)} maxLength={4000}/>
        {!mfaReady&&<>
          {!factorId&&<Button onClick={()=>void prepareMfa()} disabled={busy}>التحقق الثنائي قبل القرار</Button>}
          {qr&&<div><p>أضف الحساب إلى تطبيق المصادقة عبر الرمز التالي.</p><img src={qr} alt="رمز إعداد المصادقة الثنائية للحساب" className="w-48 h-48"/></div>}
          {enrolledThisSession&&factorId&&<Button disabled={busy} onClick={()=>void cancelMfaSetup()}>إلغاء إعداد العامل الجديد</Button>}
          {factorId&&<><Label htmlFor="approval-otp">رمز تطبيق المصادقة</Label><Input id="approval-otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))}/><Button disabled={busy||code.length!==6} onClick={()=>void verifyMfa()}>تحقق</Button></>}
        </>}
        <div className="flex gap-3 flex-wrap">{actions.map(action=><Button key={action} disabled={busy||!mfaReady||evidence.trim().length<10} onClick={()=>void decide(action)}>{labels[action]}</Button>)}</div>
      </section>}
      <h2 className="font-bold">سجل القرارات</h2>
      {record.events.map(event=><article key={event.id} className="border rounded p-3 space-y-1"><p>الإصدار {event.revision} — {labels[event.action]}</p><p>هوية المستخدم: <span dir="ltr">{event.actor_id}</span></p><p>{new Date(event.recorded_at).toLocaleString('ar-EG')}</p><p className="whitespace-pre-wrap">{event.evidence}</p></article>)}
    </>}
  </main>;
}
