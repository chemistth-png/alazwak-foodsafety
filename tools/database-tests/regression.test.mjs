import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
const root = new URL('../../', import.meta.url);
const migration = name => readFileSync(new URL('supabase/migrations/' + name, root), 'utf8');
const repair = migration('20260922163518_repair_document_persistence.sql');
const A = '00000000-0000-4000-8000-000000000001';
const B = '00000000-0000-4000-8000-000000000002';
let db;
before(async () => {
  db = new PGlite();
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
    $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    INSERT INTO auth.users VALUES ('${A}'), ('${B}');`);
  // Real source migrations, selected to reproduce the audited tables and RLS.
  // This is deliberately NOT a full replay of the conflicting migration history.
  await db.exec(migration('20260308191435_5ad1308b-b06b-4e08-a0f0-509f4445b9bf.sql'));
  await db.exec(migration('20260403145548_c54c6ef4-aeff-4908-aed0-e966dbeb9d94.sql'));
  await db.exec(migration('20260419033043_98b4e74e-8412-4acc-9518-38951dea6078.sql'));
  await db.exec(migration('20260501220130_2bbc6d54-9ddc-465d-85ac-7a1a1b9798e6.sql'));
  await db.exec(repair);
  await db.exec(`GRANT USAGE ON SCHEMA public, auth TO authenticated, anon;
    GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO authenticated, anon;`);
});
after(async () => { await db?.close(); });
async function asUser(user, run, role = 'authenticated') {
  await db.exec('BEGIN');
  try {
    await db.exec(`SET LOCAL ROLE ${role}`);
    await db.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [user ?? '']);
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
