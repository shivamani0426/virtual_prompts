/**
 * Daily D1 data retention, run on a protected GitHub Actions schedule.
 * Never accesses other databases. No personally identifying row contents
 * are emitted in GitHub Actions logs.
 */
import {retentionStatements} from "../apps/community/retention.mjs";
const account="c37eaec570d5c0261dd4b3fdf8764ce4",dbName="winter-smog-community";
const token=process.env.CLOUDFLARE_API_TOKEN;
const statements=retentionStatements();
if(process.env.COMMUNITY_DRY_RUN==="1"){
  if(statements.length!==6)throw Error("Unexpected retention plan");
  console.log("PASS: D1 community retention plan validated locally");
  process.exit(0);
}
if(!token||process.env.CLOUDFLARE_ACCOUNT_ID!==account)
  throw Error("Missing token or wrong Cloudflare account");
const base="https://api.cloudflare.com/client/v4/accounts/"+account;
const headers={Authorization:"Bearer "+token};
async function api(path,options={}){
  const res=await fetch(base+path,{...options,headers:{...headers,...options.headers}});
  const body=await res.json();
  if(!res.ok||body.success===false)throw Error("Retention API error "+res.status);
  return body.result;
}
const list=await api("/d1/database");
const db=list.find(x=>x.name===dbName);
if(!db)throw Error("Dedicated community D1 database not found; refusing prune");
const id=db.uuid||db.id;
for(const {sql,params} of statements){
  await api("/d1/database/"+id+"/query",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({sql,params}),
  });
}
console.log("PASS: Community 14-day report expiry, 30-day sessions and 48-hour rate events pruned");
