import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import ApprovalRecord from '@/pages/ApprovalRecord';
const mocks=vi.hoisted(()=>({rpc:vi.fn(),verify:vi.fn(),list:vi.fn(),enroll:vi.fn(),unenroll:vi.fn()}));
vi.mock('@/hooks/useAuth',()=>({useAuth:()=>({user:{id:'owner'}})}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{rpc:mocks.rpc,auth:{mfa:{listFactors:mocks.list,challengeAndVerify:mocks.verify,enroll:mocks.enroll,unenroll:mocks.unenroll}}}}));
const record={revision:1,state:'draft',snapshot:{title:'Controlled plan'},digest:'a'.repeat(64),events:[],is_owner:true,roles:[]};
function mount(){render(<MemoryRouter initialEntries={['/approvals/haccp/00000000-0000-4000-8000-000000000001']}><Routes><Route path="/approvals/:kind/:id" element={<ApprovalRecord/>}/></Routes></MemoryRouter>);}
beforeEach(()=>{
  mocks.rpc.mockReset();mocks.verify.mockReset();mocks.list.mockReset();mocks.enroll.mockReset();mocks.unenroll.mockReset();
  mocks.rpc.mockResolvedValue({data:record,error:null});
  mocks.list.mockResolvedValue({data:{totp:[{id:'factor',status:'verified'}]},error:null});
  mocks.verify.mockResolvedValue({error:null});
  mocks.enroll.mockResolvedValue({data:{id:'new-factor',totp:{qr_code:'qr-data'}},error:null});
  mocks.unenroll.mockResolvedValue({data:null,error:null});
});
afterEach(cleanup);
async function prepareDecision(){
  await screen.findByText('Controlled plan');
  fireEvent.change(screen.getByLabelText(/دليل المراجعة/),{target:{value:'Evidence reference TEST-001 checked'}});
  fireEvent.click(screen.getByText('التحقق الثنائي قبل القرار'));
  fireEvent.change(await screen.findByLabelText('رمز تطبيق المصادقة'),{target:{value:'123456'}});
  fireEvent.click(screen.getByRole('button',{name:'تحقق'}));
  await waitFor(()=>expect(screen.getByRole('button',{name:'إرسال للمراجعة'})).toBeEnabled());
}
test('owner cannot approve and submission requires MFA even with evidence',async()=>{
  mount();await screen.findByText('Controlled plan');
  fireEvent.change(screen.getByLabelText(/دليل المراجعة/),{target:{value:'Evidence reference TEST-001 checked'}});
  expect(screen.getByRole('button',{name:'إرسال للمراجعة'})).toBeDisabled();
  expect(screen.queryByRole('button',{name:'اعتماد الإصدار'})).not.toBeInTheDocument();
});
test('successful decision uses server response and sends exact reviewed revision',async()=>{
  mount();await prepareDecision();
  mocks.rpc.mockResolvedValueOnce({data:{...record,state:'submitted'},error:null});
  fireEvent.click(screen.getByRole('button',{name:'إرسال للمراجعة'}));
  await screen.findByText('الإصدار 1 — بانتظار المراجعة');
  expect(mocks.rpc).toHaveBeenLastCalledWith('record_approval',expect.objectContaining({p_action:'submit',p_revision:1,p_evidence:'Evidence reference TEST-001 checked'}));
});
test('stale revision or persistence failure does not show approval success',async()=>{
  mount();await prepareDecision();
  mocks.rpc.mockResolvedValueOnce({error:{code:'40001'},data:null});
  fireEvent.click(screen.getByRole('button',{name:'إرسال للمراجعة'}));
  expect(await screen.findByRole('alert')).toHaveTextContent('لم يُسجّل القرار');
  expect(screen.queryByText('Controlled plan')).not.toBeInTheDocument();
});
test('unavailable workflow fails closed without action controls',async()=>{
  mocks.rpc.mockResolvedValueOnce({error:{code:'42501'},data:null});mount();
  expect(await screen.findByRole('alert')).toHaveTextContent('تعذّر تحميل');
  expect(screen.queryByRole('button',{name:'إرسال للمراجعة'})).not.toBeInTheDocument();
});

async function prepareNewFactor(){
  mocks.list.mockResolvedValueOnce({data:{totp:[]},error:null});
  mount();await screen.findByText('Controlled plan');
  fireEvent.change(screen.getByLabelText(/دليل المراجعة/),{target:{value:'Evidence reference TEST-001 checked'}});
  fireEvent.click(screen.getByText('التحقق الثنائي قبل القرار'));
  await waitFor(()=>expect(screen.getByLabelText('رمز تطبيق المصادقة')).toBeInTheDocument());
}
test('failed OTP preserves newly enrolled factor so user can retry',async()=>{
  mocks.verify.mockResolvedValueOnce({error:{message:'Invalid TOTP'}});
  await prepareNewFactor();
  fireEvent.change(screen.getByLabelText('رمز تطبيق المصادقة'),{target:{value:'999999'}});
  fireEvent.click(screen.getByRole('button',{name:'تحقق'}));
  await screen.findByRole('alert');
  expect(mocks.unenroll).not.toHaveBeenCalled();
  expect(screen.getByLabelText('رمز تطبيق المصادقة')).toBeInTheDocument();
});
test('successful verification never unenrolls new factor',async()=>{
  await prepareNewFactor();
  fireEvent.change(screen.getByLabelText('رمز تطبيق المصادقة'),{target:{value:'123456'}});
  fireEvent.click(screen.getByRole('button',{name:'تحقق'}));
  await waitFor(()=>expect(screen.getByRole('button',{name:'إرسال للمراجعة'})).toBeEnabled());
  expect(mocks.unenroll).not.toHaveBeenCalled();
});
test('explicit cancellation only unenrolls a confirmed unverified new factor',async()=>{
  await prepareNewFactor();
  mocks.list.mockResolvedValueOnce({data:{totp:[{id:'new-factor',status:'unverified'}]},error:null});
  fireEvent.click(screen.getByRole('button',{name:'إلغاء إعداد العامل الجديد'}));
  await waitFor(()=>expect(mocks.unenroll).toHaveBeenCalledWith({factorId:'new-factor'}));
  await waitFor(()=>expect(screen.queryByLabelText('رمز تطبيق المصادقة')).not.toBeInTheDocument());
});
test('cancellation preserves a factor already verified elsewhere',async()=>{
  await prepareNewFactor();
  mocks.list.mockResolvedValueOnce({data:{totp:[{id:'new-factor',status:'verified'}]},error:null});
  fireEvent.click(screen.getByRole('button',{name:'إلغاء إعداد العامل الجديد'}));
  await screen.findByRole('alert');
  expect(mocks.unenroll).not.toHaveBeenCalled();
});
test('unmount does not unenroll a newly enrolled factor',async()=>{
  await prepareNewFactor();
  cleanup();
  expect(mocks.unenroll).not.toHaveBeenCalled();
});
