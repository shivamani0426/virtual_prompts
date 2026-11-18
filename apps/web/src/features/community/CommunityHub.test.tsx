import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import {cleanup,fireEvent,render,screen,waitFor} from "@testing-library/react";
import {CommunityHub} from "./CommunityHub";
import {communityRequest} from "./client";

vi.mock("./client",()=>({communityRequest:vi.fn()}));
const mock=vi.mocked(communityRequest);
const published={
  id:"6ee08b56-3cf6-4a5e-9f15-1535137f0653",city:"Bengaluru",
  category:"traffic_smoke",description:"Thick roadside smoke was visible in the city center.",created_at:"2026-11-18T09:00:00Z",
};
function useBackend(){
  let joined=false;
  mock.mockImplementation(async(path,method,body)=>{
    if(path==="/reports?city=Bengaluru")
      return {reports:[published]};
    if(path==="/my/reports")
      return {reports:[]};
    if(path==="/challenges")
      return {challenges:[{id:"smoke-free-home",title:"Smoke-free home week",
        description:"Practice smoke-free habits on three days.",category:"indoor",target_days:3}]};
    if(path==="/my/challenges")
      return {progress:joined?[{challenge_id:"smoke-free-home",completed_days:0}]:[]};
    if(path==="/alerts/preferences")
      return {preferences:{city:"Bengaluru",threshold:150,enabled:0}};
    if(path==="/reports" && method==="POST")return {id:"123",status:"pending"};
    if(path==="/challenges/smoke-free-home/join"){joined=true;return {joined:true};}
    if(path==="/challenges/smoke-free-home/checkin")return {completed_days:1};
    if(path==="/alerts/preferences" && method==="POST")return {saved:true};
    if(path==="/alerts/check")return {enabled:true,triggered:false,notice:"No confirmed alert."};
    throw Error("Unexpected community request: "+path+method+JSON.stringify(body||{}));
  });
}
beforeEach(()=>{vi.resetAllMocks();useBackend();});
afterEach(cleanup);

describe("Milestone 8 community UI contracts",()=>{
  it("shows only approved reports and labels moderation uncertainty",async()=>{
    render(<CommunityHub selectedCity="Bengaluru"/>);
    await screen.findByText("Thick roadside smoke was visible in the city center.");
    expect(screen.getByText(/Community reports are observations/)).toBeInTheDocument();
    expect(screen.getByText(/await human moderator approval/i)).toBeInTheDocument();
  });

  it("submits reports as pending, never displays them in the approved feed by itself",async()=>{
    render(<CommunityHub selectedCity="Bengaluru"/>);
    await screen.findByText("Thick roadside smoke was visible in the city center.");
    const description="A cloud of smoke was visible at the busy interchange yesterday afternoon.";
    fireEvent.change(screen.getByRole("textbox",{name:/Observation/}),{target:{value:description}});
    fireEvent.click(screen.getByRole("button",{name:"Submit for review"}));
    await screen.findByText(/awaiting human moderation/i);
    expect(mock).toHaveBeenCalledWith("/reports","POST",{
      city:"Bengaluru",category:"garbage_burning",description,
    });
    expect(screen.getAllByText(/Thick roadside smoke/)).toHaveLength(1);
  });

  it("joins a challenge but never credits a day until user logs it",async()=>{
    render(<CommunityHub selectedCity="Bengaluru"/>);
    await screen.findByRole("button",{name:"Join challenge"});
    fireEvent.click(screen.getByRole("button",{name:"Join challenge"}));
    await screen.findByRole("button",{name:"Log today's activity"});
    expect(mock).toHaveBeenCalledWith("/challenges/smoke-free-home/join","POST");
    expect(mock).not.toHaveBeenCalledWith("/challenges/smoke-free-home/checkin","POST");
  });

  it("sends a deliberate alert preference with typed US AQI threshold",async()=>{
    const notification=class {static permission="denied";};
    vi.stubGlobal("Notification",notification);
    render(<CommunityHub selectedCity="Bengaluru"/>);
    await screen.findByRole("button",{name:"Save alerts"});
    fireEvent.click(screen.getByRole("checkbox",{name:/Enable alerts/i}));
    fireEvent.click(screen.getByRole("button",{name:"Save alerts"}));
    await waitFor(()=>expect(mock).toHaveBeenCalledWith("/alerts/preferences","POST",{
      city:"Bengaluru",threshold:150,enabled:true,
    }));
    vi.unstubAllGlobals();
  });

  it("does not misrepresent an unavailable service as a populated feed",async()=>{
    mock.mockRejectedValue(new Error("Community service unavailable."));
    render(<CommunityHub selectedCity="Bengaluru"/>);
    await screen.findByRole("alert");
    expect(screen.queryByText("Thick roadside smoke was visible in the city center.")).not.toBeInTheDocument();
  });
});
