import {test} from "node:test";
import assert from "node:assert/strict";
import {approximateCoordinates,isPlace,placeLabel} from "../src/places";

test("Approximate device coordinates before air API request",()=>{
  assert.deepEqual(approximateCoordinates(12.97194,77.59369),{latitude:12.97,longitude:77.59});
  assert.deepEqual(approximateCoordinates(-33.8688,151.2093),{latitude:-33.87,longitude:151.21});
  assert.throws(()=>approximateCoordinates(Infinity,0));
  assert.throws(()=>approximateCoordinates(91,12));
  assert.throws(()=>approximateCoordinates(0,181));
});
test("Accept non-preset geocoded towns and reject invalid places",()=>{
  const p={name:"Chikkaballapur",admin1:"Karnataka",country:"India",latitude:13.43,longitude:77.73};
  assert.ok(isPlace(p));
  assert.equal(placeLabel(p),"Chikkaballapur, Karnataka, India");
  assert.ok(isPlace({name:"My approximate location",latitude:13.4,longitude:77.7}));
  assert.ok(isPlace({name:"Small town",latitude:14.2,longitude:75.4,admin1:null,country:"India"}));
  assert.equal(placeLabel({name:"Small town",latitude:14.2,longitude:75.4,admin1:null,country:"India"}),"Small town, India");
  for(const bad of [{name:"",latitude:12,longitude:70},{name:"City",latitude:NaN,longitude:70},
    {name:"City",latitude:-91,longitude:70},{name:"City",latitude:12,longitude:"70"},null,{}]){
    assert.equal(isPlace(bad),false);
  }
});
test("Location label avoids duplicate city and state",()=>{
  assert.equal(placeLabel({name:"Delhi",admin1:"Delhi",country:"India",latitude:28.61,longitude:77.21}),
    "Delhi, India");
});
