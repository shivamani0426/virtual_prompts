import assert from "node:assert/strict";
import worker from "../dist/worker.js";

let calls = [];
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url) => {
  calls.push(String(url));
  if (String(url).includes("geocoding-api")) {
    return Response.json({results:[{id:1,name:"Delhi",country:"India",latitude:28.61,longitude:77.20}]});
  }
  return Response.json({
    timezone:"Asia/Kolkata",
    current:{time:"2026-11-18T14:00",us_aqi:183,pm2_5:94.5,pm10:132,nitrogen_dioxide:25,ozone:13},
    hourly:{time:["2026-11-18T14:00","2026-11-18T15:00"],us_aqi:[183,175],pm2_5:[94.5,90]}
  });
};
try {
  const make=(path,options)=>new Request("https://clearskies.example"+path,options);
  let response=await worker.fetch(make("/api/health"),{});
  assert.equal(response.status,200);
  assert.equal((await response.json()).aiConfigured,false);

  response=await worker.fetch(make("/api/air"),{});
  assert.equal(response.status,400,"Missing coordinates must not silently resolve to 0,0");
  response=await worker.fetch(make("/api/air?lat=100&lon=77"),{});
  assert.equal(response.status,400);
  response=await worker.fetch(make("/api/air?lat=28.61&lon=77.20"),{});
  assert.equal(response.status,200);
  let result=await response.json();
  assert.equal(result.current.aqi,183);
  assert.equal(result.category.name,"Unhealthy");
  assert.equal(result.scale,"US AQI");
  assert.equal(result.forecast.length,2);

  response=await worker.fetch(make("/api/places?q=Delhi"),{});
  assert.equal((await response.json()).results[0].name,"Delhi");

  response=await worker.fetch(make("/api/assist",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({question:"Can kids play outside?",location:"Delhi",aqi:null,profile:{people:["children"],commute:"public"}})}),{});
  result=await response.json();
  assert.equal(result.mode,"guidance");
  assert.match(result.answer,/rule-based/i);

  const ai={run:async()=>({choices:[{message:{content:"Stay indoors during severe pollution. Why it helps: Less exposure. Impact: Qualitative."}}]})};
  response=await worker.fetch(make("/api/assist",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({question:"How can I protect my family?",aqi:183,profile:{people:["children"]}})}),{AI:ai});
  result=await response.json();
  assert.equal(result.mode,"ai");
  assert.match(result.answer,/Why it helps:/);

  response=await worker.fetch(make("/"),{});
  assert.match(await response.text(),/ClearSkies AI/);
  response=await worker.fetch(make("/styles.css"),{});
  assert.match(response.headers.get("content-type"),/text\/css/);
  response=await worker.fetch(make("/app.js"),{});
  assert.match(response.headers.get("content-type"),/javascript/);
  response=await worker.fetch(make("/not-found"),{});
  assert.equal(response.status,404);
  assert.ok(calls.length>=2);
  console.log("All ClearSkies route integration tests passed.");
} finally {
  globalThis.fetch=originalFetch;
}
