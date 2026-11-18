// Deploy the isolated React dashboard without modifying clearskies-ai.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve, relative, extname } from "node:path";

const account = "c37eaec570d5c0261dd4b3fdf8764ce4";
if (process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_ACCOUNT_ID !== account) {
  throw Error("Cloudflare account mismatch; deployment refused.");
}
const token = process.env.CLOUDFLARE_API_TOKEN;
if (!token) throw Error("Add CLOUDFLARE_API_TOKEN as a GitHub Actions repository secret.");
const worker = "winter-smog-web";
const dist = resolve("apps/web/dist");
if (!existsSync(resolve(dist, "index.html"))) throw Error("Build the React app first.");

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};
function readDirectory(folder) {
  const list = [];
  for (const item of readdirSync(folder, { withFileTypes: true })) {
    const full = resolve(folder, item.name);
    if (item.isDirectory()) {
      list.push(...readDirectory(full));
    } else if (item.isFile()) {
      const path = "/" + relative(dist, full).replaceAll("\\", "/");
      list.push([path, {
        base64: readFileSync(full).toString("base64"),
        mime: mime[extname(path)] || "application/octet-stream",
      }]);
    }
  }
  return list;
}
const assets = Object.fromEntries(readDirectory(dist));
assets["/"] = assets["/index.html"];

const workerSource = [
  "const assets=" + JSON.stringify(assets) + ";",
  "const decode=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));",
  "export default {async fetch(request){",
  "const url=new URL(request.url);",
  "const headers={'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY'};",
  "if(request.method!=='GET' && request.method!=='HEAD') return new Response('Method not allowed',{status:405,headers:{...headers,Allow:'GET, HEAD'}});",
  "if(url.pathname.startsWith('/api/'))return new Response('API is hosted separately on Render',{status:404,headers});",
  "const file=assets[url.pathname]||(url.pathname.includes('.')?null:assets['/']);",
  "if(!file)return new Response('Not found',{status:404,headers});",
  "headers['Content-Type']=file.mime;",
  "headers['Cache-Control']=url.pathname.startsWith('/assets/')?'public, max-age=31536000, immutable':'no-cache, no-store, must-revalidate';",
  "headers['Content-Security-Policy']=\"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://winter-smog-fastapi.onrender.com; object-src 'none'; base-uri 'none'; frame-ancestors 'none'\";",
  "return new Response(request.method==='HEAD'?null:decode(file.base64),{status:200,headers});",
  "}};",
].join("\n");

const endpoint = "https://api.cloudflare.com/client/v4/accounts/" + account;
const auth = { Authorization: "Bearer " + token };
async function check(response, name) {
  let obj;
  try { obj = await response.json(); }
  catch { throw Error(name + ": invalid Cloudflare API response (" + response.status + ")"); }
  if (!response.ok || obj.success === false) {
    throw Error(name + " failed (" + response.status + "): " + (obj.errors || []).map(x => x.message).join("; "));
  }
  return obj.result;
}
const form = new FormData();
form.set("metadata", new Blob([JSON.stringify({
  main_module: "worker.js", compatibility_date: "2026-11-18",
})], { type: "application/json" }));
form.set("worker.js", new Blob([workerSource], {
  type: "application/javascript+module",
}), "worker.js");
console.log("Uploading isolated React Worker to account " + account + "...");
await check(await fetch(endpoint + "/workers/scripts/" + worker, {
  method: "PUT", headers: auth, body: form,
}), "Upload");
await check(await fetch(endpoint + "/workers/scripts/" + worker + "/subdomain", {
  method: "POST", headers: { ...auth, "content-type": "application/json" },
  body: JSON.stringify({ enabled: true, previews_enabled: false }),
}), "Activate workers.dev URL");
const result = await check(await fetch(endpoint + "/workers/subdomain", {
  headers: auth,
}), "Read subdomain");
console.log("React dashboard URL: https://" + worker + "." + result.subdomain + ".workers.dev");
