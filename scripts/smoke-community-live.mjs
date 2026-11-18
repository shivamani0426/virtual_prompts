/**
 * Live post-deployment smoke. Only an inert pending report is submitted; it is
 * deleted from D1 before the job completes. Human review is never bypassed.
 */
import assert from "node:assert/strict";
const base="https://winter-smog-community.1nc24cs197.workers.dev";
let token, reportId;
async function call(path,method="GET",payload){
  const response=await fetch(base+path,{
    method,headers:{
      "Accept":"application/json",
      ...(token?{"Authorization":"Bearer "+token}:{}),
      ...(payload?{"Content-Type":"application/json"}:{}),
    },
    ...(payload?{body:JSON.stringify(payload)}:{}),
    signal:AbortSignal.timeout(25000),
  });
  const body=await response.json();
  return {status:response.status,body};
}
const log=(line)=>console.log("PASS community live: "+line);
try{
  const health=await call("/health");
  assert.equal(health.status,200);
  assert.equal(health.body.ok,true);
  assert.equal(health.body.storage,"D1");
  log("D1 migrations and critical tables respond");
  const cities=await call("/cities");
  assert.ok(cities.body.cities.includes("Bengaluru"));
  const challenges=await call("/challenges");
  assert.equal(challenges.body.challenges.length,3);
  log("Public city and reviewed challenge definitions respond");
  assert.equal((await call("/my/reports")).status,401);
  const session=await call("/session","POST");
  assert.equal(session.status,201);
  token=session.body.token;
  assert.match(token,/^[a-f0-9]{64}$/);
  log("Pseudonymous bearer session issued and protected APIs deny anonymous access");
  const invalid=await call("/reports","POST",{
    city:"Bengaluru",category:"other",description:"short",
  });
  assert.equal(invalid.status,422);
  const report=await call("/reports","POST",{
    city:"Bengaluru",category:"other",
    description:"Automated QA test submission, not a real incident. Please do not approve this report.",
  });
  assert.equal(report.status,201);
  assert.equal(report.body.status,"pending");
  reportId=report.body.id;
  const feed=await call("/reports?city=Bengaluru");
  assert.equal(feed.status,200);
  assert.ok(!feed.body.reports.some(x=>x.id===reportId));
  const owned=await call("/my/reports");
  assert.ok(owned.body.reports.some(x=>x.id===reportId&&x.status==="pending"));
  log("Submission is pending and invisible in the public feed");
  const join=await call("/challenges/smoke-free-home/join","POST");
  assert.equal(join.status,200);
  const first=await call("/challenges/smoke-free-home/checkin","POST");
  const repeat=await call("/challenges/smoke-free-home/checkin","POST");
  assert.equal(first.body.completed_days,1);
  assert.equal(repeat.body.completed_days,1);
  log("Challenge check-ins deduplicate by Indian calendar day");
  const invalidPref=await call("/alerts/preferences","POST",{
    city:"Bengaluru",threshold:9999,enabled:true,
  });
  assert.equal(invalidPref.status,422);
  const pref=await call("/alerts/preferences","POST",{
    city:"Bengaluru",threshold:150,enabled:false,
  });
  assert.equal(pref.body.saved,true);
  const disabled=await call("/alerts/check");
  assert.equal(disabled.status,200);
  assert.equal(disabled.body.triggered,false);
  log("Alert preferences validate thresholds and respect explicit opt-in");
}finally{
  if(reportId&&token){
    const deleted=await call("/my/reports/"+reportId,"DELETE");
    assert.equal(deleted.body.deleted,true);
    const owned=await call("/my/reports");
    assert.ok(!owned.body.reports.some(x=>x.id===reportId),"Pending smoke report must be erased from D1");
    log("Test report permanently deleted, not left in public or private feed");
  }
}
