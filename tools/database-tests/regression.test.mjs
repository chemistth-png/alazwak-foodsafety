import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
const root = new URL('../../', import.meta.url);
const migration = name => readFileSync(new URL('supabase/migrations/' + name, root), 'utf8');
const repair = migration('20260922163518_repair_document_persistence.sql');
const quarantine = migration('20260922184249_quarantine_unverified_approvals.sql');
const workflow = migration('20260922185014_revision_approval_workflow.sql');
const C = '00000000-0000-4000-8000-000000000003';
const D = '00000000-0000-4000-8000-000000000004';
const A = '00000000-0000-4000-8000-000000000001';
const B = '00000000-0000-4000-8000-000000000002';
let db;
before(async () => {
  db = new PGlite();
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY, is_anonymous boolean DEFAULT false);
    CREATE TABLE auth.sessions(id uuid PRIMARY KEY,user_id uuid REFERENCES auth.users(id),not_after timestamptz);
    CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS
    $$ SELECT coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
    $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    INSERT INTO auth.users(id) VALUES ('${A}'), ('${B}'), ('${C}'), ('${D}');
    INSERT INTO auth.sessions(id,user_id) SELECT id,id FROM auth.users;`);
  // Real source migrations, selected to reproduce the audited tables and RLS.
  // This is deliberately NOT a full replay of the conflicting migration history.
  await db.exec(migration('20260308191435_5ad1308b-b06b-4e08-a0f0-509f4445b9bf.sql'));
  await db.exec(migration('20260403145548_c54c6ef4-aeff-4908-aed0-e966dbeb9d94.sql'));
  await db.exec(migration('20260419033043_98b4e74e-8412-4acc-9518-38951dea6078.sql'));
  await db.exec(migration('20260501220130_2bbc6d54-9ddc-465d-85ac-7a1a1b9798e6.sql'));
  await db.exec(repair);
  await db.exec(quarantine);
  await db.exec(workflow);
  await db.exec(`GRANT USAGE ON SCHEMA public, auth TO authenticated, anon;
    GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO authenticated, anon;`);
});
after(async () => { await db?.close(); });
async function asUser(user, run, role = 'authenticated') {
  await db.exec('BEGIN');
  try {
    await db.exec(`SET LOCAL ROLE ${role}`);
    await db.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [user ?? '']);
    await db.query("SELECT set_config('request.jwt.claims', $1, true)", [JSON.stringify({sub:user,session_id:user,aal:'aal2',amr:[{method:'totp',timestamp:Math.floor(Date.now()/1000)}]})]);
    const result = await run(); await db.exec('COMMIT'); return result;
  } catch (error) { await db.exec('ROLLBACK'); throw error; }
}
async function insert(user, content) {
  return asUser(user, async () => (await db.query(
    'INSERT INTO documents(user_id,file_name,content) VALUES ($1,$2,$3) RETURNING id',
    [user, 'إجراء.txt', content])).rows[0].id);
}
for (const [size,count] of [[0,0],[1,1],[50,1],[200,1],[2000,1],[2001,2],[5000,3]]) {
  test(`text length ${size}: finite chunks and exact reconstruction`, { timeout: 10000 }, async () => {
    const text = 'س'.repeat(size); const id = await insert(A, text);
    const { rows } = await db.query('SELECT chunk_index,content FROM document_chunks WHERE document_id=$1 ORDER BY chunk_index',[id]);
    assert.equal(rows.length,count);
    assert.equal(rows.map((r,i) => i ? r.content.slice(200) : r.content).join(''),text);
    assert.ok(rows.every((r,i) => r.chunk_index === i && r.content.length <= 2000));
  });
}
test('null content remains rejected by the real document constraint', async () => {
  await assert.rejects(insert(A, null), error => error.code === '23502');
});
test('replacement recreates chunks and owner deletion cascades', async () => {
  const id = await insert(A,'a'.repeat(5000));
  // UPDATE is an administrative fixture operation; no owner UPDATE policy exists.
  await db.query('UPDATE documents SET content=$1 WHERE id=$2',['replacement',id]);
  assert.deepEqual((await db.query('SELECT content FROM document_chunks WHERE document_id=$1',[id])).rows,[{content:'replacement'}]);
  await asUser(A, () => db.query('DELETE FROM documents WHERE id=$1',[id]));
  assert.equal((await db.query('SELECT * FROM document_chunks WHERE document_id=$1',[id])).rows.length,0);
});
test('a second user cannot read documents/chunks or delete the owner document', async () => {
  const id=await insert(A,'private document');
  await asUser(B, async () => {
    for(const table of ['documents','document_chunks']) {
      const column=table==='documents'?'id':'document_id';
      assert.equal((await db.query(`SELECT * FROM ${table} WHERE ${column}=$1`,[id])).rows.length,0);
    }
    assert.equal((await db.query('DELETE FROM documents WHERE id=$1 RETURNING id',[id])).rows.length,0);
  });
  assert.equal((await asUser(A,()=>db.query('SELECT id FROM documents WHERE id=$1',[id]))).rows.length,1);
});
test('forged owner insert and anonymous read are denied by RLS', async () => {
  await assert.rejects(asUser(B,()=>db.query('INSERT INTO documents(user_id,file_name,content) VALUES ($1,$2,$3)',[A,'x','x'])), e=>e.code==='42501');
  assert.equal((await asUser(null,()=>db.query('SELECT * FROM documents'),'anon')).rows.length,0);
});
test('chunks cannot be written directly and trigger function is not API-callable', async () => {
  const id=await insert(A,'text');
  await assert.rejects(asUser(A,()=>db.query('INSERT INTO document_chunks(document_id,user_id,content,file_name) VALUES ($1,$2,$3,$4)',[id,A,'forged','x'])),e=>e.code==='42501');
  const {rows}=await db.query("SELECT has_function_privilege('authenticated','public.chunk_document()','EXECUTE') AS allowed");
  assert.equal(rows[0].allowed,false);
});
test('repair migration is repeatable and new NCR fields round-trip under owner RLS', async () => {
  await db.exec(repair);
  const {rows}=await asUser(A,()=>db.query(`INSERT INTO nc_reports
    (user_id,report_number,title,batch_number,lot_code,hazard_type,ccp_ref,verified_by,verified_at)
    VALUES ($1,'NC-TEST','Test','B1','L1','biological','CCP1','',NULL)
    RETURNING id,batch_number,lot_code,hazard_type,ccp_ref,verified_at`,[A]));
  assert.equal(rows[0].batch_number,'B1'); assert.equal(rows[0].lot_code,'L1');
  assert.equal(rows[0].hazard_type,'biological');assert.equal(rows[0].ccp_ref,'CCP1');assert.equal(rows[0].verified_at,null);
  assert.equal((await asUser(B,()=>db.query('SELECT * FROM nc_reports WHERE id=$1',[rows[0].id]))).rows.length,0);
});

test('HACCP drafts save but forged approval and signature inserts fail', async () => {
  const insertPlan = (status, signature) => asUser(A, () => db.query(
    'INSERT INTO haccp_plans(user_id,status,signature_data) VALUES ($1,$2,$3) RETURNING id', [A,status,signature]));
  const {rows} = await insertPlan('draft', {});
  await assert.rejects(insertPlan('approved', {}), e => e.code === '42501');
  await assert.rejects(insertPlan('draft', {signer_name:'forged',signed_at:'2026-01-01'}), e => e.code === '42501');
  await assert.rejects(asUser(A,()=>db.query("UPDATE haccp_plans SET status='approved' WHERE id=$1",[rows[0].id])), e=>e.code==='42501');
  await assert.rejects(asUser(A,()=>db.query(`UPDATE haccp_plans SET signature_data='{"signer_name":"forged"}' WHERE id=$1`,[rows[0].id])), e=>e.code==='42501');
  assert.equal((await asUser(B,()=>db.query('SELECT id FROM haccp_plans WHERE id=$1',[rows[0].id]))).rows.length,0);
});
test('NCR cannot bypass verification guard through insert or direct update', async () => {
  const {rows}=await asUser(A,()=>db.query("INSERT INTO nc_reports(user_id,status) VALUES ($1,'closed') RETURNING id",[A]));
  for(const patch of ["status='verified'", "verified_by='forged'", "verified_at=now()"]){
    await assert.rejects(asUser(A,()=>db.query(`UPDATE nc_reports SET ${patch} WHERE id=$1`,[rows[0].id])),e=>e.code==='42501');
  }
  await assert.rejects(asUser(A,()=>db.query("INSERT INTO nc_reports(user_id,status) VALUES ($1,'verified')",[A])),e=>e.code==='42501');
  await assert.rejects(asUser(A,()=>db.query("INSERT INTO nc_reports(user_id,verified_by) VALUES ($1,'forged')",[A])),e=>e.code==='42501');
  await asUser(A,()=>db.query("UPDATE nc_reports SET status='in_progress' WHERE id=$1",[rows[0].id]));
});
test('quarantine is repeatable and trigger function is not API-callable', async () => {
  await db.exec(quarantine);
  const {rows}=await db.query("SELECT has_function_privilege('authenticated','public.guard_unverified_approval()','EXECUTE') AS allowed");
  assert.equal(rows[0].allowed,false);
});
test('existing approval evidence is preserved and can only return to draft/open', async () => {
  // Seed pre-migration records as administrator inside a transaction.
  await db.exec('BEGIN');
  try {
    await db.exec('ALTER TABLE haccp_plans DISABLE TRIGGER guard_haccp_approval; ALTER TABLE nc_reports DISABLE TRIGGER guard_nc_verification;');
    const plan=(await db.query(`INSERT INTO haccp_plans(user_id,status,signature_data) VALUES ($1,'approved','{"signer_name":"legacy"}') RETURNING id`,[A])).rows[0].id;
    const nc=(await db.query("INSERT INTO nc_reports(user_id,status,verified_by) VALUES ($1,'verified','legacy') RETURNING id",[A])).rows[0].id;
    await db.exec('ALTER TABLE haccp_plans ENABLE TRIGGER guard_haccp_approval; ALTER TABLE nc_reports ENABLE TRIGGER guard_nc_verification; COMMIT;');
    await db.exec(quarantine);
    assert.equal((await db.query('SELECT status FROM haccp_plans WHERE id=$1',[plan])).rows[0].status,'approved');
    await asUser(A,()=>db.query("UPDATE haccp_plans SET status='draft',title='Edited draft' WHERE id=$1",[plan]));
    await asUser(A,()=>db.query("UPDATE nc_reports SET status='open' WHERE id=$1",[nc]));
    assert.deepEqual((await db.query('SELECT signature_data FROM haccp_plans WHERE id=$1',[plan])).rows[0].signature_data,{signer_name:'legacy'});
    assert.equal((await db.query('SELECT verified_by FROM nc_reports WHERE id=$1',[nc])).rows[0].verified_by,'legacy');
  } catch(error) { await db.exec('ROLLBACK'); throw error; }
});

async function approval(user, id, action='read', revision=null, evidence='Evidence checked against controlled records', kind='haccp') {
  return asUser(user, async () => (await db.query('SELECT public.record_approval($1,$2,$3,$4,$5) AS result',[kind,id,action,revision,evidence])).rows[0].result);
}
async function planFixture() {
  const {rows}=await asUser(A,()=>db.query("INSERT INTO haccp_plans(user_id,title) VALUES ($1,'Approval test') RETURNING id",[A]));
  const id=rows[0].id;
  await db.query("INSERT INTO approval_private.assignments VALUES ('haccp',$1,$2,'reviewer'),('haccp',$1,$3,'approver')",[id,B,C]);
  return id;
}
test('workflow defaults disabled even for authenticated owner',async()=>{
  const id=await planFixture();
  await assert.rejects(approval(A,id),e=>e.code==='42501');
  await db.exec('UPDATE approval_private.settings SET enabled=true');
});
test('three separate identities submit, review, approve an immutable revision',async()=>{
  const id=await planFixture();
  assert.equal((await approval(A,id,'submit',1)).state,'submitted');
  assert.equal((await approval(B,id,'review',1)).state,'reviewed');
  const result=await approval(C,id,'approve',1);
  assert.equal(result.state,'approved');assert.equal(result.events.length,3);
  assert.equal(result.events[2].actor_id,C);assert.match(result.digest,/^[a-f0-9]{64}$/);
  assert.equal(result.events[2].digest,result.digest);
  await assert.rejects(approval(C,id,'approve',1),e=>e.code==='42501');
});
test('unassigned user and anonymous caller cannot read or sign another record',async()=>{
  const id=await planFixture();
  await assert.rejects(approval(D,id),e=>e.code==='42501');
  await assert.rejects(approval(null,id),e=>e.code==='42501');
  await assert.rejects(asUser(null,()=>db.query("SELECT public.record_approval('haccp',$1,'read')",[id]),'anon'),e=>e.code==='42501');
  await assert.rejects(approval(B,id,'submit',1),e=>e.code==='42501');
});
test('role assignments cannot bypass self approval or sequence checks',async()=>{
  const id=await planFixture();
  await db.query("INSERT INTO approval_private.assignments VALUES ('haccp',$1,$2,'reviewer'),('haccp',$1,$3,'approver')",[id,A,B]);
  await approval(A,id,'submit',1);
  await assert.rejects(approval(A,id,'review',1),e=>e.code==='42501');
  await assert.rejects(approval(C,id,'approve',1),e=>e.code==='42501');
  await approval(B,id,'review',1);
  await assert.rejects(approval(B,id,'approve',1),e=>e.code==='42501');
});
test('editing content invalidates approval and prevents stale decisions',async()=>{
  const id=await planFixture(); await approval(A,id,'submit',1);await approval(B,id,'review',1);await approval(C,id,'approve',1);
  await asUser(A,()=>db.query("UPDATE haccp_plans SET title='Changed',approval_revision=1 WHERE id=$1",[id]));
  const result=await approval(A,id);assert.equal(result.revision,2);assert.equal(result.state,'draft');assert.equal(result.events.length,3);
  await assert.rejects(approval(A,id,'submit',1),e=>e.code==='40001');
  await approval(A,id,'submit',2);
});
test('revoking assignment removes access immediately without JWT refresh',async()=>{
  const id=await planFixture();await approval(A,id,'submit',1);
  await db.query('DELETE FROM approval_private.assignments WHERE record_id=$1 AND actor_id=$2',[id,B]);
  await assert.rejects(approval(B,id,'review',1),e=>e.code==='42501');
});
test('MFA and live session checks cannot be replaced by metadata claims',async()=>{
  const id=await planFixture();
  for(const claims of [{session_id:A,aal:'aal1',user_metadata:{role:'approver'}},{session_id:D,aal:'aal2'}, {session_id:A,aal:'aal2',amr:[{method:'totp',timestamp:1}]}]) {
    await assert.rejects(asUser(A,async()=>{
      await db.query("SELECT set_config('request.jwt.claims',$1,true)",[JSON.stringify(claims)]);
      await db.query("SELECT public.record_approval('haccp',$1,'submit',1,'Evidence checked')",[id]);
    }),e=>e.code==='42501');
  }
});
test('empty evidence is rejected and rejection requires a new revision',async()=>{
  const id=await planFixture();
  await assert.rejects(approval(A,id,'submit',1,''),e=>e.code==='22023');
  await approval(A,id,'submit',1);assert.equal((await approval(B,id,'reject',1)).state,'rejected');
  await assert.rejects(approval(C,id,'approve',1),e=>e.code==='42501');
});
test('clients cannot grant themselves roles or mutate approval evidence',async()=>{
  for(const sql of ["UPDATE approval_private.settings SET enabled=true", "DELETE FROM approval_private.events", "DELETE FROM approval_private.assignments", "SELECT * FROM approval_private.events"]) {
    await assert.rejects(asUser(A,()=>db.exec(sql)),e=>e.code==='42501');
  }
});
test('NCR verification requires closed status and corrective-action evidence',async()=>{
  const {rows}=await asUser(A,()=>db.query('INSERT INTO nc_reports(user_id) VALUES ($1) RETURNING id',[A]));const id=rows[0].id;
  await assert.rejects(approval(A,id,'submit',1,'Checked effectiveness evidence','nc'),e=>e.code==='22023');
  await asUser(A,()=>db.query("UPDATE nc_reports SET status='closed',corrective_action='Replace seal and verify process' WHERE id=$1",[id]));
  await db.query("INSERT INTO approval_private.assignments VALUES ('nc',$1,$2,'reviewer'),('nc',$1,$3,'approver')",[id,B,C]);
  await approval(A,id,'submit',2,'Checked effectiveness evidence','nc');await approval(B,id,'review',2,'Checked effectiveness evidence','nc');
  assert.equal((await approval(C,id,'approve',2,'Checked effectiveness evidence','nc')).state,'approved');
});
test('submitted source cannot be deleted or change identity to replay an old approval',async()=>{
  const id=await planFixture();await approval(A,id,'submit',1);
  await assert.rejects(asUser(A,()=>db.query('DELETE FROM haccp_plans WHERE id=$1',[id])),e=>e.code==='42501');
  await assert.rejects(asUser(A,()=>db.query('UPDATE haccp_plans SET id=gen_random_uuid() WHERE id=$1',[id])),e=>e.code==='42501');
  await assert.rejects(asUser(A,()=>db.query('UPDATE haccp_plans SET user_id=$2 WHERE id=$1',[id,B])),e=>e.code==='42501');
});
test('expired or revoked live sessions cannot access approval records',async()=>{
  const id=await planFixture();
  await db.query("UPDATE auth.sessions SET not_after=now()-interval '1 minute' WHERE id=$1",[A]);
  await assert.rejects(approval(A,id),e=>e.code==='42501');
  await db.query('UPDATE auth.sessions SET not_after=NULL WHERE id=$1',[A]);
  await db.query('DELETE FROM auth.sessions WHERE id=$1',[A]);
  await assert.rejects(approval(A,id),e=>e.code==='42501');
  await db.query('INSERT INTO auth.sessions(id,user_id) VALUES ($1,$1)',[A]);
});
test('new private tables have RLS and public entry point uses invoker privileges',async()=>{
  const {rows}=await db.query("SELECT relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='approval_private' AND c.relkind='r'");
  assert.equal(rows.length,3);assert.ok(rows.every(r=>r.relrowsecurity));
  assert.equal((await db.query("SELECT prosecdef FROM pg_proc WHERE oid='public.record_approval(text,uuid,text,bigint,text)'::regprocedure")).rows[0].prosecdef,false);
});
test('local backup restores approval evidence, role isolation, and workflow configuration',async()=>{
  const before=(await db.query('SELECT id,digest,actor_id FROM approval_private.events ORDER BY id')).rows;
  const archive=await db.dumpDataDir();
  const restored=new PGlite({loadDataDir:archive});
  try {
    assert.deepEqual((await restored.query('SELECT id,digest,actor_id FROM approval_private.events ORDER BY id')).rows,before);
    assert.equal((await restored.query('SELECT enabled FROM approval_private.settings')).rows[0].enabled,true);
    await restored.exec('SET ROLE authenticated');
    await assert.rejects(restored.query('DELETE FROM approval_private.events'),e=>e.code==='42501');
  } finally {await restored.close();}
});
