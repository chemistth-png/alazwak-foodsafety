import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import HACCPTables from '@/components/plans/HACCPTables';
const fixture = vi.hoisted(() => ({user: {id: 'owner'}, record: {
  id: 'plan', doc_number: 'HACCP-LEGACY', hazards: [], ccps: [], status: 'approved',
  signature_data: {signer_name: 'FORGED-SIGNER', signed_at: '2026-01-01'},
}}));
vi.mock('@/hooks/useAuth', () => ({useAuth: () => ({user: fixture.user})}));
vi.mock('@/integrations/supabase/client', () => ({supabase: {from: () => ({select: () => ({eq: () => ({order: () => ({limit: () => ({maybeSingle: async () => ({data: fixture.record})})})})})})}}));
afterEach(cleanup);
test('legacy client signature does not authorize the UI or the PDF export region', async () => {
  render(<HACCPTables />);
  await waitFor(() => expect(screen.getByText(/رقم الوثيقة: HACCP-LEGACY/)).toBeInTheDocument());
  expect(screen.queryByText('FORGED-SIGNER')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', {name:'توقيع واعتماد'})).not.toBeInTheDocument();
  expect(document.getElementById('haccp-table-export')).toHaveTextContent('اعتماد غير موثّق');
  expect(screen.getByRole('button', {name:'حفظ'})).toBeEnabled();
});
