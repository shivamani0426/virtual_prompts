export type Locale="en"|"hi"|"kn"|"te"|"ta"|"bn"|"mr";
export const LANGUAGES:Record<Locale,{label:string;tag:string}>={
  en:{label:"English",tag:"en-IN"},hi:{label:"हिन्दी",tag:"hi-IN"},
  kn:{label:"ಕನ್ನಡ",tag:"kn-IN"},te:{label:"తెలుగు",tag:"te-IN"},
  ta:{label:"தமிழ்",tag:"ta-IN"},bn:{label:"বাংলা",tag:"bn-IN"},
  mr:{label:"मराठी",tag:"mr-IN"},
};
type Key="home"|"assistant"|"community"|"challenges"|"alerts"|"language"|"city"|"refresh"|
  "ask"|"askHint"|"speak"|"source"|"report"|"pending"|"join"|"checkIn"|
  "enableAlerts"|"save"|"check"|"aqiNotice"|"privacy"|"unavailable"|"threshold"|"myReports";
const english:Record<Key,string>={
  home:"Air outlook",assistant:"Evidence AI",community:"Reports",challenges:"Challenges",alerts:"Alerts",
  language:"Language",city:"Choose city",refresh:"Refresh",ask:"Ask with sources",
  askHint:"Ask about WHO/CPCB guidance",speak:"Read answer aloud",source:"Official sources",
  report:"Submit for review",pending:"Pending human moderation",join:"Join",checkIn:"Log today",
  enableAlerts:"Enable advisory alerts",save:"Save preferences",check:"Check current AQI",
  aqiNotice:"Modelled US AQI, not official CPCB data.",privacy:"No names, addresses or personal details.",
  unavailable:"Data unavailable; no reading invented.",threshold:"Alert threshold (US AQI)",myReports:"My reports",
};
const dictionaries:Record<Locale,Partial<Record<Key,string>>>={
  en:english,
  hi:{home:"वायु गुणवत्ता",assistant:"स्रोत आधारित AI",community:"रिपोर्ट",challenges:"चुनौतियाँ",alerts:"चेतावनी",language:"भाषा",city:"शहर चुनें",refresh:"रीफ़्रेश",ask:"स्रोतों के साथ पूछें",speak:"उत्तर सुनें",source:"आधिकारिक स्रोत",report:"समीक्षा के लिए भेजें",pending:"मानवीय समीक्षा बाकी",join:"शामिल हों",checkIn:"आज दर्ज करें",enableAlerts:"चेतावनी चालू करें",save:"सहेजें",check:"वायु गुणवत्ता जाँचें",aqiNotice:"मॉडल आधारित अमेरिकी AQI; आधिकारिक CPCB डेटा नहीं।",privacy:"नाम, पता या निजी जानकारी न दें।",unavailable:"डेटा उपलब्ध नहीं है।",threshold:"अमेरिकी AQI सीमा"},
  kn:{home:"ಗಾಳಿಯ ಮಾಹಿತಿ",assistant:"ಮೂಲಾಧಾರಿತ AI",community:"ವರದಿಗಳು",challenges:"ಸವಾಲುಗಳು",alerts:"ಎಚ್ಚರಿಕೆಗಳು",language:"ಭಾಷೆ",city:"ನಗರ ಆಯ್ಕೆ",refresh:"ನವೀಕರಿಸಿ",ask:"ಮೂಲಗಳೊಂದಿಗೆ ಕೇಳಿ",speak:"ಉತ್ತರ ಕೇಳಿ",source:"ಅಧಿಕೃತ ಮೂಲಗಳು",report:"ಪರಿಶೀಲನೆಗೆ ಕಳುಹಿಸಿ",pending:"ಮಾನವ ಪರಿಶೀಲನೆ ಬಾಕಿ",join:"ಸೇರಿ",checkIn:"ಇಂದು ದಾಖಲಿಸಿ",enableAlerts:"ಎಚ್ಚರಿಕೆಗಳನ್ನು ಆನ್ ಮಾಡಿ",save:"ಉಳಿಸಿ",check:"ಗಾಳಿಯ ಗುಣಮಟ್ಟ ಪರಿಶೀಲಿಸಿ",aqiNotice:"ಮಾದರಿ ಆಧಾರಿತ US AQI; ಅಧಿಕೃತ CPCB ಮಾಹಿತಿ ಅಲ್ಲ.",privacy:"ಹೆಸರು, ವಿಳಾಸ ಅಥವಾ ಖಾಸಗಿ ವಿವರಗಳನ್ನು ನೀಡಬೇಡಿ.",unavailable:"ಮಾಹಿತಿ ಲಭ್ಯವಿಲ್ಲ.",threshold:"US AQI ಮಿತಿ"},
  te:{home:"గాలి పరిస్థితి",assistant:"ఆధారాలతో AI",community:"నివేదికలు",challenges:"సవాళ్లు",alerts:"హెచ్చరికలు",language:"భాష",city:"నగరం ఎంచుకోండి",refresh:"నవీకరించు",ask:"ఆధారాలతో అడగండి",speak:"సమాధానం వినండి",source:"అధికారిక ఆధారాలు",report:"సమీక్షకు పంపండి",pending:"మానవ సమీక్ష కోసం వేచి ఉంది",join:"చేరండి",checkIn:"ఈ రోజు నమోదు",enableAlerts:"హెచ్చరికలు ప్రారంభించండి",save:"సేవ్ చేయండి",check:"ప్రస్తుత AQI చూడండి",aqiNotice:"ఇది నమూనా ఆధారిత US AQI; అధికారిక CPCB సమాచారం కాదు.",privacy:"పేర్లు, చిరునామాలు లేదా వ్యక్తిగత సమాచారం ఇవ్వవద్దు.",unavailable:"డేటా అందుబాటులో లేదు.",threshold:"US AQI పరిమితి"},
  ta:{home:"காற்றுத் தரம்",assistant:"ஆதார AI",community:"அறிக்கைகள்",challenges:"சவால்கள்",alerts:"எச்சரிக்கைகள்",language:"மொழி",city:"நகரத்தைத் தேர்ந்தெடு",refresh:"புதுப்பி",ask:"ஆதாரங்களுடன் கேள்",speak:"பதிலைக் கேள்",source:"அதிகாரப்பூர்வ ஆதாரங்கள்",report:"ஆய்வுக்கு அனுப்பு",pending:"மனித ஆய்வு நிலுவையில்",join:"சேர்",checkIn:"இன்று பதிவு செய்",enableAlerts:"எச்சரிக்கைகளை இயக்கு",save:"சேமி",check:"தற்போதைய AQI சரிபார்",aqiNotice:"மாதிரி அடிப்படையிலான US AQI; அதிகாரப்பூர்வ CPCB தரவு அல்ல.",privacy:"பெயர், முகவரி அல்லது தனிப்பட்ட தகவலைத் தர வேண்டாம்.",unavailable:"தரவு கிடைக்கவில்லை.",threshold:"US AQI வரம்பு"},
  bn:{home:"বায়ুর অবস্থা",assistant:"উৎসভিত্তিক AI",community:"প্রতিবেদন",challenges:"চ্যালেঞ্জ",alerts:"সতর্কতা",language:"ভাষা",city:"শহর বাছুন",refresh:"রিফ্রেশ",ask:"উৎসসহ জিজ্ঞাসা করুন",speak:"উত্তর শুনুন",source:"সরকারি উৎস",report:"পর্যালোচনার জন্য পাঠান",pending:"মানব পর্যালোচনা বাকি",join:"যোগ দিন",checkIn:"আজ নথিভুক্ত করুন",enableAlerts:"সতর্কতা চালু করুন",save:"সংরক্ষণ",check:"বর্তমান AQI দেখুন",aqiNotice:"মডেল-ভিত্তিক US AQI, সরকারি CPCB তথ্য নয়।",privacy:"নাম, ঠিকানা বা ব্যক্তিগত তথ্য দেবেন না।",unavailable:"তথ্য পাওয়া যায়নি।",threshold:"US AQI সীমা"},
  mr:{home:"हवेची गुणवत्ता",assistant:"स्रोताधारित AI",community:"अहवाल",challenges:"आव्हाने",alerts:"इशारे",language:"भाषा",city:"शहर निवडा",refresh:"पुन्हा तपासा",ask:"स्रोतांसह विचारा",speak:"उत्तर ऐका",source:"अधिकृत स्रोत",report:"तपासणीसाठी पाठवा",pending:"मानवी तपासणी प्रलंबित",join:"सामील व्हा",checkIn:"आज नोंदवा",enableAlerts:"इशारे सुरू करा",save:"जतन करा",check:"सध्याचा AQI तपासा",aqiNotice:"हा मॉडेलवर आधारित US AQI आहे; अधिकृत CPCB माहिती नाही.",privacy:"नाव, पत्ता किंवा वैयक्तिक माहिती देऊ नका.",unavailable:"माहिती उपलब्ध नाही.",threshold:"US AQI मर्यादा"},
};
export function chooseLocale(code?:string|null):Locale {
  const first=(code||"en").split("-")[0];
  return Object.hasOwn(LANGUAGES,first)?first as Locale:"en";
}
export function translate(locale:Locale,key:Key):string{
  return dictionaries[locale]?.[key]||english[key];
}
