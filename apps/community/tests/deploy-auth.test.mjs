import {test} from "node:test";
import assert from "node:assert/strict";

test("D1 operations and Worker uploads require separately scoped Cloudflare tokens", async()=>{
  const originalFetch=globalThis.fetch;
  const previous={
    CLOUDFLARE_API_TOKEN:process.env.CLOUDFLARE_API_TOKEN,
    CLOUDFLARE_D1_API_TOKEN:process.env.CLOUDFLARE_D1_API_TOKEN,
    CLOUDFLARE_ACCOUNT_ID:process.env.CLOUDFLARE_ACCOUNT_ID,
    COMMUNITY_DRY_RUN:process.env.COMMUNITY_DRY_RUN,
  };
  const calls=[];
  process.env.CLOUDFLARE_API_TOKEN="worker-edit-token-only";
  process.env.CLOUDFLARE_D1_API_TOKEN="d1-edit-token-only";
  process.env.CLOUDFLARE_ACCOUNT_ID="c37eaec570d5c0261dd4b3fdf8764ce4";
  delete process.env.COMMUNITY_DRY_RUN;
  globalThis.fetch=async(url,options={})=>{
    const path=new URL(url).pathname;
    const auth=options.headers?.Authorization;
    if(path.includes("/d1/database"))assert.equal(auth,"Bearer d1-edit-token-only");
    else if(path.includes("/workers/"))assert.equal(auth,"Bearer worker-edit-token-only");
    else throw Error("Unexpected Cloudflare API path: "+path);
    calls.push({path,method:options.method||"GET"});
    const result=path.endsWith("/d1/database")
      ?[{name:"winter-smog-community",uuid:"a16cdd11-ff5e-4c47-93de-214852a33b82"}]
      :path.endsWith("/workers/subdomain")?{subdomain:"local-test"}:{};
    return new Response(JSON.stringify({success:true,result}),{status:200,headers:{"Content-Type":"application/json"}});
  };
  try {
    await import("../../../scripts/deploy-community.mjs");
    assert.ok(calls.filter(x=>x.path.includes("/d1/database/")&&x.path.endsWith("/query")).length>=6,
      "The existing D1 schema should be migrated through dedicated database auth");
    assert.ok(calls.some(x=>x.path.includes("/workers/scripts/")&&x.method==="PUT"),
      "Worker script upload must still use its existing Worker token");
  }finally{
    globalThis.fetch=originalFetch;
    for(const [key,value] of Object.entries(previous)){
      if(value===undefined)delete process.env[key];
      else process.env[key]=value;
    }
  }
});
