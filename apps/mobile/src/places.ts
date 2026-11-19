/** A city or a device-supplied approximate coordinate for public AQI lookup. */
export type Place={
  name:string;
  latitude:number;
  longitude:number;
  country?:string|null;
  admin1?:string|null;
};

export function approximateCoordinates(latitude:number,longitude:number){
  if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||
     latitude < -90||latitude > 90||longitude < -180||longitude > 180)
    throw new Error("Invalid location. Choose a city instead.");
  // Same two-decimal precision as the website; never transmit GPS precision.
  return {latitude:Number(latitude.toFixed(2)),longitude:Number(longitude.toFixed(2))};
}

export function isPlace(value:unknown):value is Place{
  if(!value||typeof value!=="object")return false;
  const p=value as Partial<Place>;
  return typeof p.name==="string"&&p.name.trim().length>0&&p.name.length<=140&&
    typeof p.latitude==="number"&&typeof p.longitude==="number"&&
    Number.isFinite(p.latitude)&&Number.isFinite(p.longitude)&&
    p.latitude>=-90&&p.latitude<=90&&p.longitude>=-180&&p.longitude<=180&&
    (p.country==null||typeof p.country==="string")&&
    (p.admin1==null||typeof p.admin1==="string");
}

export function placeLabel(place:Place):string{
  return [place.name,place.admin1,place.country]
    .filter((part,index,all)=>Boolean(part)&&all.indexOf(part)===index)
    .join(", ");
}
