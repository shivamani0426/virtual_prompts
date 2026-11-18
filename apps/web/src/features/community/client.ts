export const COMMUNITY_BASE =
  (import.meta.env.VITE_COMMUNITY_API_BASE_URL || "https://winter-smog-community.1nc24cs197.workers.dev").replace(/\/$/, "");
const KEY="winter-smog:community-session-v1";
export type Report={id:string;city:string;category:string;description:string;status?:string;created_at:string};
export type Challenge={id:string;title:string;description:string;category:string;target_days:number};
export type AlertStatus={enabled:boolean;triggered:boolean;notice?:string;city?:string;available?:boolean;snapshot?:{aqi:number;scale:string}};
type Session={token:string;expires_at:string};
let pending:Promise<Session>|null=null;
async function getSession():Promise<Session>{
  try{
    const existing=JSON.parse(localStorage.getItem(KEY)||"null") as Session|null;
    if(existing && /^[a-f0-9]{64}$/.test(existing.token)&&Date.parse(existing.expires_at)>Date.now()+60000)return existing;
  }catch{/*create new session*/}
  if(!pending)pending=(async()=>{
    const res=await fetch(COMMUNITY_BASE+"/session",{method:"POST"});
    if(!res.ok)throw new Error("Community session is unavailable.");
    const result=await res.json() as Session;
    if(!/^[a-f0-9]{64}$/.test(result.token)||!Number.isFinite(Date.parse(result.expires_at)))throw new Error("Invalid community session");
    localStorage.setItem(KEY,JSON.stringify(result));
    return result;
  })().finally(()=>{pending=null;});
  return pending;
}
export async function communityRequest<T>(path:string,method:"GET"|"POST"|"DELETE"="GET",body?:object):Promise<T>{
  const session=await getSession();
  const response=await fetch(COMMUNITY_BASE+path,{method,
    headers:{"Authorization":"Bearer "+session.token,"Accept":"application/json",...(method==="POST"?{"Content-Type":"application/json"}:{})},
    ...(body?{body:JSON.stringify(body)}:{})});
  let data:({error?:string}&T);
  try{data=await response.json() as ({error?:string}&T);}catch{throw new Error("Community returned an invalid response");}
  if(!response.ok){if(response.status===401)localStorage.removeItem(KEY);throw new Error(data.error||"Community request failed");}
  return data;
}