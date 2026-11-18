/**
 * Create/reuse a dedicated D1 database, idempotently migrate it, deploy
 * the isolated community Worker. Never touches the existing ClearSkies worker.
 */
import {readFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
const account="c37eaec570d5c0261dd4b3fdf8764ce4";
const workerToken=process.env.CLOUDFLARE_API_TOKEN;
const d1Token=process.env.CLOUDFLARE_D1_API_TOKEN;
const workerName="winter-smog-community";
const dbName="winter-smog-community";
const source=readFileSync("apps/community/worker.mjs","utf8");
const schema=readFileSync("apps/community/schema.sql","utf8");
execFileSync(process.execPath,["--check","apps/community/worker.mjs"],{stdio:"pipe"});
if(!source.includes("CREATE TABLE") && !schema.includes("community_reports"))throw Error("Missing schema");
if(process.env.COMMUNITY_DRY_RUN==="1"){
  console.log("PASS Community Worker syntax and D1 schema present");process.exit(0);
}
if(!workerToken||!d1Token)throw Error("Missing Cloudflare Workers or dedicated D1 GitHub secret");
if(process.env.CLOUDFLARE_ACCOUNT_ID!==account)throw Error("Cloudflare account mismatch");
const root="https://api.cloudflare.com/client/v4/accounts/"+account;

async function api(path,opts={}){
  const auth={Authorization:"Bearer "+(path.startsWith("/d1/")?d1Token:workerToken)};
  const r=await fetch(root+path,{...opts,headers:{...auth,...(opts.headers||{})}});
  const data=await r.json();
  if(!r.ok||data.success===false)throw Error(path+" HTTP "+r.status+": "+(data.errors||[]).map(x=>x.message).join("; "));
  return data.result;
}
const all=await api("/d1/database");
let db=all.find(x=>x.name===dbName);
if(!db){
  db=await api("/d1/database",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:dbName})});
  console.log("Created isolated community D1 database");
}
const id=db.uuid||db.id;
if(!id||!/^[a-f0-9-]{36}$/.test(id))throw Error("Unexpected D1 database id");
for(const command of schema.split(";").map(x=>x.trim()).filter(Boolean)){
  await api("/d1/database/"+id+"/query",{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({sql:command}),
  });
}
console.log("D1 schema migrated idempotently");
const metadata={
  main_module:"worker.mjs", compatibility_date:"2026-11-18",
  bindings:[
    {type:"d1",name:"DB",id},
    {type:"ratelimit",name:"SESSION_LIMIT",namespace_id:"77081",simple:{limit:5,period:60}},
    {type:"ratelimit",name:"REPORT_LIMIT",namespace_id:"77082",simple:{limit:10,period:60}},
  ],
};
const form=new FormData();
form.set("metadata",new Blob([JSON.stringify(metadata)],{type:"application/json"}));
form.set("worker.mjs",new Blob([source],{type:"application/javascript+module"}),"worker.mjs");
await api("/workers/scripts/"+workerName,{method:"PUT",body:form});
await api("/workers/scripts/"+workerName+"/subdomain",{
  method:"POST",headers:{"Content-Type":"application/json"},
  body:JSON.stringify({enabled:true,previews_enabled:false}),
});
const domain=await api("/workers/subdomain");
console.log("Community API deployed: https://"+workerName+"."+domain.subdomain+".workers.dev");
