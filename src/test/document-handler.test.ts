import { Blob } from "node:buffer";
import { handleDocument } from "../../supabase/functions/parse-document/handler";
const request = (body: unknown, token = true) => new Request("https://example.test", {
  method: "POST", headers: token ? { Authorization: "Bearer test" } : {}, body: JSON.stringify(body),
});
const input = { filePath: "user-a/file.txt", fileName: "إجراء.txt" };
const setup = () => ({ authenticate: vi.fn().mockResolvedValue("user-a"),
  download: vi.fn().mockResolvedValue(new Blob(["نص الإجراء"])), save: vi.fn().mockResolvedValue("doc-1") });
it("confirms success only after persistence", async () => {
  const deps = setup(); const res = await handleDocument(request(input), deps);
  expect(res.status).toBe(200);
  expect(await res.json()).toMatchObject({ saved: true, documentId: "doc-1", text: "نص الإجراء" });
  expect(deps.save).toHaveBeenCalledWith(expect.objectContaining({ user_id: "user-a", content: "نص الإجراء" }));
});
it("does not convert database failure into success or leak internals", async () => {
  const deps = setup(); deps.save.mockRejectedValue(new Error("database internal detail"));
  const res = await handleDocument(request(input), deps); expect(res.status).toBe(500);
  expect(await res.text()).not.toContain("database internal detail");
});
it.each(["user-b/file.txt", "user-a/../file.txt", "user-a/%2e%2e/file.txt", "user-a/\\file.txt"])("rejects path %s", async filePath => {
  const deps = setup(); expect((await handleDocument(request({ ...input, filePath }), deps)).status).toBe(403);
  expect(deps.download).not.toHaveBeenCalled();
});
it("rejects unauthenticated requests", async () => {
  const deps = setup(); expect((await handleDocument(request(input, false), deps)).status).toBe(401);
  expect(deps.authenticate).not.toHaveBeenCalled();
});
it("rejects unsupported Office files without placeholders", async () => {
  const deps = setup(); expect((await handleDocument(request({ ...input, fileName: "file.docx" }), deps)).status).toBe(415);
  expect(deps.save).not.toHaveBeenCalled();
});
it("rejects empty text", async () => {
  const deps = setup(); deps.download.mockResolvedValue(new Blob(["  "]));
  expect((await handleDocument(request(input), deps)).status).toBe(422);
  expect(deps.save).not.toHaveBeenCalled();
});
it("rejects expired sessions before download", async () => {
  const deps=setup(); deps.authenticate.mockResolvedValue(null);
  expect((await handleDocument(request(input),deps)).status).toBe(401);
  expect(deps.download).not.toHaveBeenCalled();
});
it("bounds actual request bytes even when Content-Length lies", async () => {
  const deps=setup(); const req=request({...input,padding:"x".repeat(9000)});
  req.headers.set("Content-Length","1");
  expect((await handleDocument(req,deps)).status).toBe(413);
  expect(deps.download).not.toHaveBeenCalled();
});
it("rejects malformed JSON without storage access", async () => {
  const deps=setup(); const req=new Request("https://example.test",{method:"POST",headers:{Authorization:"Bearer test"},body:"{"});
  expect((await handleDocument(req,deps)).status).toBe(400); expect(deps.download).not.toHaveBeenCalled();
});
it.each([null,[],{...input,filePath:4},{...input,fileName:""}])("rejects invalid input %j",async body=>{
  const deps=setup(); expect((await handleDocument(request(body),deps)).status).toBe(400);
  expect(deps.download).not.toHaveBeenCalled();
});
it("rejects invalid UTF-8 rather than persisting replacement characters",async()=>{
  const deps=setup();deps.download.mockResolvedValue(new Blob([new Uint8Array([255,254,0])]));
  expect((await handleDocument(request(input),deps)).status).toBe(422);expect(deps.save).not.toHaveBeenCalled();
});
it("rejects oversized extraction",async()=>{
  const deps=setup();deps.download.mockResolvedValue(new Blob(["a".repeat(1_000_001)]));
  expect((await handleDocument(request(input),deps)).status).toBe(413);expect(deps.save).not.toHaveBeenCalled();
});
it("truncates only the display while persisting the full source",async()=>{
  const deps=setup();const content="a".repeat(50001);deps.download.mockResolvedValue(new Blob([content]));
  const res=await handleDocument(request(input),deps);expect(res.status).toBe(200);
  expect(await res.json()).toMatchObject({truncated:true,saved:true});
  expect(deps.save).toHaveBeenCalledWith(expect.objectContaining({content}));
});
it("rejects missing persistence id",async()=>{
  const deps=setup();deps.save.mockResolvedValue("");expect((await handleDocument(request(input),deps)).status).toBe(500);
});
it("supports preflight without authentication or data access",async()=>{
  const deps=setup();const res=await handleDocument(new Request("https://example.test",{method:"OPTIONS"}),deps);
  expect(res.status).toBe(200);expect(deps.authenticate).not.toHaveBeenCalled();
});
