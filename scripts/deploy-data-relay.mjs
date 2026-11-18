// Deploy a narrow, public, read-only Open-Meteo relay for the FastAPI service.
// Nothing in this script modifies the production clearskies-ai or React Workers.
const token = process.env.CLOUDFLARE_API_TOKEN;
const expected = "c37eaec570d5c0261dd4b3fdf8764ce4";
if (process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_ACCOUNT_ID !== expected) {
  throw new Error("Deployment blocked: incorrect Cloudflare account.");
}
if (!token) throw new Error("GitHub Actions must provide CLOUDFLARE_API_TOKEN.");
const workerName = "winter-smog-relay";
const workerSource = String.raw`
const airUrl = "https://air-quality-api.open-meteo.com/v1/air-quality";
const weatherUrl = "https://api.open-meteo.com/v1/forecast";
function coordinate(value, minimum, maximum) {
  if (value === null || !/^-?\d{1,3}(?:\.\d{1,2})?$/.test(value)) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= minimum && number <= maximum ? number : null;
}
export default {
  async fetch(request) {
    const headers = {
      "content-type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "Cache-Control": "public, max-age=600",
    };
    if (request.method !== "GET")
      return new Response(JSON.stringify({error:"Method not allowed"}), {status:405,headers:{...headers,Allow:"GET"}});
    const url = new URL(request.url);
    if (url.pathname !== "/air" && url.pathname !== "/weather")
      return new Response(JSON.stringify({error:"Not found"}), {status:404,headers});
    const lat = coordinate(url.searchParams.get("lat"), -90, 90);
    const lon = coordinate(url.searchParams.get("lon"), -180, 180);
    if (lat === null || lon === null)
      return new Response(JSON.stringify({error:"Invalid approximate coordinates"}),{status:422,headers});
    const air = url.pathname === "/air";
    const base = air ? airUrl : weatherUrl;
    const query = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lon),
      current: air
        ? "us_aqi,pm2_5,pm10,nitrogen_dioxide,ozone"
        : "temperature_2m,relative_humidity_2m,wind_speed_10m",
      timezone: "auto",
    });
    if (air) {
      query.set("hourly", "us_aqi,pm2_5");
      query.set("forecast_days", "2");
    }
    try {
      const result = await fetch(base + "?" + query.toString(), {
        signal: AbortSignal.timeout(12000),
        cf: { cacheEverything: true, cacheTtl: 600 },
      });
      if (!result.ok)
        return new Response(JSON.stringify({error:"Environmental provider unavailable"}),{status:503,headers:{"content-type":"application/json","Cache-Control":"no-store"}});
      const data = await result.json();
      if (!data || typeof data !== "object" || data.error)
        return new Response(JSON.stringify({error:"No usable provider data"}),{status:503,headers:{"content-type":"application/json","Cache-Control":"no-store"}});
      return new Response(JSON.stringify(data),{status:200,headers});
    } catch {
      return new Response(JSON.stringify({error:"Environmental data temporarily unavailable"}),{status:503,headers:{"content-type":"application/json","Cache-Control":"no-store"}});
    }
  },
};
`;
const root = "https://api.cloudflare.com/client/v4/accounts/" + expected;
const headers = { Authorization: "Bearer " + token };
async function check(response, action) {
  const data = await response.json();
  if (!response.ok || data.success === false)
    throw Error(action + ": " + (data.errors || []).map(e => e.message).join("; "));
  return data.result;
}
const form = new FormData();
form.set("metadata", new Blob([JSON.stringify({main_module:"worker.js",compatibility_date:"2026-11-18"})],{type:"application/json"}));
form.set("worker.js", new Blob([workerSource],{type:"application/javascript+module"}),"worker.js");
await check(await fetch(root + "/workers/scripts/" + workerName,{method:"PUT",headers,body:form}),"Worker upload");
await check(await fetch(root + "/workers/scripts/" + workerName + "/subdomain",{
  method:"POST",
  headers:{...headers,"content-type":"application/json"},
  body:JSON.stringify({enabled:true,previews_enabled:false}),
}),"Workers.dev activation");
const account = await check(await fetch(root + "/workers/subdomain",{headers}),"Get subdomain");
console.log("Fallback air-data relay: https://" + workerName + "." + account.subdomain + ".workers.dev");
