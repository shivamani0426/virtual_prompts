import * as SecureStore from "expo-secure-store";
import {approximateCoordinates,isPlace} from "./places";
import type {Place} from "./places";
export const API="https://winter-smog-fastapi.onrender.com/api/v1";
export const COMMUNITY="https://winter-smog-community.1nc24cs197.workers.dev";
const STORAGE="winter-smog-mobile-community-session-v1";
export const CITIES:Record<string,{lat:number;lon:number}>={
  Bengaluru:{lat:12.97,lon:77.59},Delhi:{lat:28.61,lon:77.21},
  Mumbai:{lat:19.08,lon:72.88},Hyderabad:{lat:17.39,lon:78.49},
  Chennai:{lat:13.08,lon:80.27},Pune:{lat:18.52,lon:73.86},
  Kolkata:{lat:22.57,lon:88.36},Chikkaballapur:{lat:13.43,lon:77.73},
};
export const REPORT_TYPES={
  garbage_burning:"Garbage burning",construction_dust:"Construction dust",
  traffic_smoke:"Traffic smoke",other:"Other visible air concern",
} as const;
export type ReportType=keyof typeof REPORT_TYPES;
export type Report={
  id:string;city:string;category:ReportType;description:string;created_at:string;status?:string;
};
export type Challenge={
  id:string;title:string;description:string;target_days:number;category:string;
};
export type Air={
  aqi_scale:"US_AQI";
  official_cpcb_aqi:false;
  modelled:boolean;
  freshness:"live"|"cached"|"stale";
  observed_at:string|null;
  current:{us_aqi:number;pm25_ug_m3:number|null;pm10_ug_m3:number|null};
  category:{level:string;advice:string};
};
export type Assistant={
  mode:"generated"|"evidence_only"|"abstained"|"urgent_safety";
  answer:string;
  disclaimer:string;
  citations:{id:string;publisher:string;section:string;url:string;reviewed_summary?:string}[];
  limitations:string[];
};
export type AlertPref={enabled:boolean;city:string;threshold:number};
export type AlertStatus={enabled:boolean;triggered:boolean;available?:boolean;notice?:string;city?:string;snapshot?:{aqi:number;scale:string}};
async function getJson<T>(url:string,init?:RequestInit):Promise<T>{
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),22000);
  try{
    const response=await fetch(url,{...init,signal:controller.signal,headers:{Accept:"application/json",...(init?.headers||{})}});
    const parsed=await response.json() as T & {error?:string};
    if(!response.ok)throw new Error(parsed.error||(response.status===429?"Too many requests; try later.":"Service unavailable."));
    return parsed;
  } finally {clearTimeout(timer);}
}
export async function getAir(place:Place):Promise<Air>{
  const location=approximateCoordinates(place.latitude,place.longitude);
  const data=await getJson<Air>(API+"/air-quality?lat="+location.latitude.toFixed(2)+
    "&lon="+location.longitude.toFixed(2));
  if(data.aqi_scale!=="US_AQI"||data.official_cpcb_aqi!==false||
    !Number.isFinite(data.current?.us_aqi)||data.current.us_aqi<0)
    throw new Error("No verified usable modelled US AQI.");
  return data;
}
/** Searches the existing geocoding backend; not restricted to the preset city list. */
export async function searchCities(text:string):Promise<Place[]>{
  const q=text.trim();
  if(q.length<2||q.length>80||/[<>]/.test(q))throw new Error("Enter 2–80 characters for a city or town.");
  const response=await getJson<{results?:unknown}>(API+"/places?q="+encodeURIComponent(q));
  if(!Array.isArray(response.results))throw new Error("City search is temporarily unavailable.");
  return response.results.filter(isPlace).slice(0,8);
}
export async function ask(question:string):Promise<Assistant>{
  const prompt=question.trim();
  if(prompt.length<5||prompt.length>400)throw new Error("Enter 5–400 characters.");
  return getJson<Assistant>(API+"/assistant",{
    method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({question:prompt}),
  });
}
type Session={token:string;expires_at:string};
let inFlight:Promise<Session>|null=null;
async function getSession():Promise<Session>{
  const saved=await SecureStore.getItemAsync(STORAGE);
  if(saved){
    try{
      const session=JSON.parse(saved) as Session;
      if(/^[a-f0-9]{64}$/.test(session.token)&&Date.parse(session.expires_at)>Date.now()+60000)
        return session;
    }catch{/*renew*/}
  }
  if(!inFlight)inFlight=(async()=>{
    const session=await getJson<Session>(COMMUNITY+"/session",{method:"POST"});
    if(!/^[a-f0-9]{64}$/.test(session.token)||!Number.isFinite(Date.parse(session.expires_at)))
      throw Error("Invalid community session");
    await SecureStore.setItemAsync(STORAGE,JSON.stringify(session));
    return session;
  })().finally(()=>{inFlight=null;});
  return inFlight;
}
export async function community<T>(path:string,method:"GET"|"POST"|"DELETE"="GET",body?:object):Promise<T>{
  const session=await getSession();
  try{
    return await getJson<T>(COMMUNITY+path,{
      method,
      headers:{"Authorization":"Bearer "+session.token,...(method==="POST"?{"Content-Type":"application/json"}:{})},
      ...(body?{body:JSON.stringify(body)}:{}),
    });
  }catch(e){
    if(e instanceof Error&&e.message.includes("Start or renew"))await SecureStore.deleteItemAsync(STORAGE);
    throw e;
  }
}
export function officialURL(value:string):string|null{
  try{
    const url=new URL(value);
    if(url.protocol==="https:"&&["www.who.int","airquality.cpcb.gov.in"].includes(url.hostname))return url.toString();
  }catch{/*Invalid URL*/}
  return null;
}
