/**
 * Human moderation only. Trigger this restricted workflow with the report UUID.
 * GitHub Actions actor access controls moderator privileges. Never exposes
 * Cloudflare write token to browser; no public admin API exists.
 */
const account="c37eaec570d5c0261dd4b3fdf8764ce4";
const token=process.env.CLOUDFLARE_D1_API_TOKEN;
const uuid=process.env.REPORT_ID,decision=process.env.DECISION;
if(!/^[a-f0-9-]{36}$/.test(uuid||"")||!["approved","rejected"].includes(decision))
  throw Error("Valid UUID and approved/rejected decision required");
if(!token)throw Error("Cloudflare token is missing");
const root="https://api.cloudflare.com/client/v4/accounts/"+account;
const res=await fetch(root+"/d1/database", {headers:{Authorization:"Bearer "+token}});
const listed=await res.json();
if(!res.ok||!listed.success)throw Error("D1 listing unavailable");
const db=listed.result.find(x=>x.name==="winter-smog-community");
if(!db)throw Error("Community database does not exist");
const r=await fetch(root+"/d1/database/"+(db.uuid||db.id)+"/query",{
  method:"POST",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},
  body:JSON.stringify({sql:"UPDATE community_reports SET status=? WHERE id=? AND status='pending'",params:[decision,uuid]})
});
const d=await r.json();
if(!r.ok||!d.success)throw Error("Moderation update failed");
const results=d.result;
const changes=(Array.isArray(results)?results:[results]).reduce((n,x)=>n+Number(x.meta?.changes||0),0);
if(changes!==1)throw Error("No pending report matched that UUID. Nothing changed.");
console.log("Human moderator action completed on one pending report: "+decision);
