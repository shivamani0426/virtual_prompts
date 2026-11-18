import {DatabaseSync} from "node:sqlite";
import {readFileSync} from "node:fs";
import {test} from "node:test";
import assert from "node:assert/strict";
import worker from "../worker.mjs";

function environment() {
  const sqlite=new DatabaseSync(":memory:");
  sqlite.exec(readFileSync(new URL("../schema.sql",import.meta.url),"utf8"));
  const DB={
    prepare(sql) {
      const stmt=sqlite.prepare(sql);
      return {
        bind(...parameters) {
          return {
            async first(){return stmt.get(...parameters)||null;},
            async all(){return {results:stmt.all(...parameters)};},
            async run(){const result=stmt.run(...parameters);return {meta:{changes:Number(result.changes)}};},
          };
        },
        async first(){return stmt.get()||null;},
      };
    },
  };
  const limit={async limit(){return {success:true};}};
  return {sqlite,env:{DB,SESSION_LIMIT:limit,REPORT_LIMIT:limit}};
}
function req(path,method="GET",json,token) {
  return new Request("https://example.invalid"+path,{
    method,headers:{
      ...(json?{"Content-Type":"application/json"}:{}),
      ...(token?{Authorization:"Bearer "+token}:{}),
      Origin:"https://winter-smog-web.1nc24cs197.workers.dev",
    },
    ...(json?{body:JSON.stringify(json)}:{}),
  });
}
async function response(env,path,method="GET",body,token) {
  const res=await worker.fetch(req(path,method,body,token),env);
  return {status:res.status,body:await res.json(),headers:res.headers};
}
test("D1 session, report privacy, human moderation, deletion and request validation",async()=>{
  const {sqlite,env}=environment();
  const health=await response(env,"/health");
  assert.equal(health.status,200);
  const session=await response(env,"/session","POST");
  assert.equal(session.status,201);
  const token=session.body.token;
  assert.match(token,/^[a-f0-9]{64}$/);
  assert.equal(sqlite.prepare("SELECT token_hash FROM community_sessions").get().token_hash===token,false);
  const noAuth=await response(env,"/my/reports");
  assert.equal(noAuth.status,401);
  const invalid=await response(env,"/reports","POST",{city:"Bengaluru",category:"garbage_burning",description:"a".repeat(24)},token);
  assert.equal(invalid.status,422);
  const report=await response(env,"/reports","POST",{
    city:"Bengaluru",category:"garbage_burning",
    description:"A burning waste pile was seen near the main market area this afternoon.",
  },token);
  assert.equal(report.status,201);
  assert.equal(report.body.status,"pending");
  const publicFeed=await response(env,"/reports?city=Bengaluru");
  assert.deepEqual(publicFeed.body.reports,[],"unreviewed reports must never leak");
  const owned=await response(env,"/my/reports","GET",undefined,token);
  assert.equal(owned.body.reports.length,1);
  assert.equal(owned.body.reports[0].status,"pending");
  sqlite.prepare("UPDATE community_reports SET status='approved' WHERE id=?").run(report.body.id);
  const approved=await response(env,"/reports?city=Bengaluru");
  assert.equal(approved.body.reports.length,1);
  assert.equal(approved.body.reports[0].session_id,undefined,"public feed hides author");
  const removed=await response(env,"/my/reports/"+report.body.id,"DELETE",undefined,token);
  assert.equal(removed.body.deleted,true);
  const after=await response(env,"/reports?city=Bengaluru");
  assert.deepEqual(after.body.reports,[]);
  sqlite.close();
});
test("Challenges are joined and deduplicated once per calendar date",async()=>{
  const {sqlite,env}=environment();
  const session=(await response(env,"/session","POST")).body.token;
  const challenges=await response(env,"/challenges");
  assert.equal(challenges.body.challenges.length,3);
  const noJoin=await response(env,"/challenges/smoke-free-home/checkin","POST",undefined,session);
  assert.equal(noJoin.status,403);
  assert.equal((await response(env,"/challenges/smoke-free-home/join","POST",undefined,session)).status,200);
  const first=await response(env,"/challenges/smoke-free-home/checkin","POST",undefined,session);
  const repeat=await response(env,"/challenges/smoke-free-home/checkin","POST",undefined,session);
  assert.equal(first.body.completed_days,1);
  assert.equal(repeat.body.completed_days,1);
  assert.equal((await response(env,"/my/challenges","GET",undefined,session)).body.progress[0].completed_days,1);
  sqlite.close();
});
test("AQI alert preferences are opt-in and cannot claim unavailable data is safe",async()=>{
  const {sqlite,env}=environment();
  const token=(await response(env,"/session","POST")).body.token;
  const initial=await response(env,"/alerts/check","GET",undefined,token);
  assert.equal(initial.body.triggered,false);
  const malformed=await response(env,"/alerts/preferences","POST",{enabled:true,city:"Bengaluru",threshold:5000},token);
  assert.equal(malformed.status,422);
  const save=await response(env,"/alerts/preferences","POST",{enabled:true,city:"Bengaluru",threshold:100},token);
  assert.equal(save.body.saved,true);
  const actualFetch=globalThis.fetch;
  globalThis.fetch=async()=>new Response(JSON.stringify({aqi_scale:"US_AQI",official_cpcb_aqi:false,
    freshness:"stale",current:{us_aqi:150}}),{status:200});
  try {
    const stale=await response(env,"/alerts/check","GET",undefined,token);
    assert.equal(stale.body.triggered,false);
    assert.equal(stale.body.available,false);
    globalThis.fetch=async()=>new Response(JSON.stringify({aqi_scale:"US_AQI",official_cpcb_aqi:false,
      freshness:"live",current:{us_aqi:150}}),{status:200});
    const triggered=await response(env,"/alerts/check","GET",undefined,token);
    assert.equal(triggered.body.triggered,true);
    assert.equal(triggered.body.snapshot.scale,"US_AQI");
  }finally{globalThis.fetch=actualFetch;}
  sqlite.close();
});
test("D1 report per-session daily rate cap and PII screening",async()=>{
  const {sqlite,env}=environment();
  const token=(await response(env,"/session","POST")).body.token;
  const body={city:"Delhi",category:"other",description:"Smoke was visible from a roadside fire near a busy junction."};
  for(let i=0;i<3;i++)assert.equal((await response(env,"/reports","POST",body,token)).status,201);
  assert.equal((await response(env,"/reports","POST",body,token)).status,429);
  const second=(await response(env,"/session","POST")).body.token;
  assert.equal((await response(env,"/reports","POST",{...body,description:"Call my phone at +91 98765 43210 for more details."},second)).status,422);
  sqlite.close();
});
