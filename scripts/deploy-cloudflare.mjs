// Direct Cloudflare Worker upload. Requires a token authorized for the specific target account.
// Never place a Cloudflare API token inside this repository.
import fs from "node:fs";
import {execFileSync} from "node:child_process";
const expectedAccount="c37eaec570d5c0261dd4b3fdf8764ce4";
const account=process.env.CLOUDFLARE_ACCOUNT_ID||expectedAccount;
const token=process.env.CLOUDFLARE_API_TOKEN;
const script="clearskies-ai";
if(account!==expectedAccount)throw new Error("Wrong Cloudflare account: expected the account specifically requested for this project ("+expectedAccount+").");
if(!token)throw new Error("Missing CLOUDFLARE_API_TOKEN. Add it as a GitHub Actions repository secret.");
if(!fs.existsSync("dist/worker.js"))execFileSync(process.execPath,["scripts/build.mjs"],{stdio:"inherit"});
const root="https://api.cloudflare.com/client/v4/accounts/"+account;
const parse=async(res,action)=>{
  let value;
  try{value=await res.json();}catch{throw Error(action+" failed with HTTP "+res.status+" and a non-JSON response.");}
  if(!res.ok||value.success===false){
    const errors=(value.errors||[]).map(e=>e.message).join("; ");
    throw Error(action+" failed (HTTP "+res.status+"): "+(errors||"Check this token's Workers Scripts permissions and account membership."));
  }
  return value.result;
};
const form=new FormData();
form.set("metadata",new Blob([JSON.stringify({
  main_module:"worker.js",
  compatibility_date:"2026-11-18",
  bindings:[{type:"ai",name:"AI"}],
  observability:{enabled:true,logs:{enabled:true,invocation_logs:true},traces:{enabled:true}}
})],{type:"application/json"}));
form.set("worker.js",new Blob([fs.readFileSync("dist/worker.js")],{type:"application/javascript+module"}),"worker.js");
console.log("Uploading Worker to authorized account "+account+"...");
const headers={Authorization:"Bearer "+token};
await parse(await fetch(root+"/workers/scripts/"+script,{method:"PUT",headers,body:form}),"Worker upload");
console.log("Worker upload completed.");
await parse(await fetch(root+"/workers/scripts/"+script+"/subdomain",{method:"POST",headers:{...headers,"content-type":"application/json"},body:JSON.stringify({enabled:true,previews_enabled:false})}),"Enable workers.dev route");
try{
  const res=await fetch(root+"/workers/subdomain",{headers});
  const data=await parse(res,"Read workers.dev subdomain");
  console.log("Deployment URL: https://"+script+"."+data.subdomain+".workers.dev");
}catch(e){console.log("Worker deployed. Open your Cloudflare Workers dashboard for its workers.dev URL: "+String(e));}
