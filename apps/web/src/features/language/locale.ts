export type Locale = "en" | "hi" | "kn" | "te" | "ta" | "bn" | "mr";
export const LANGUAGES: Record<Locale,{native:string;tag:string}> = {
  en:{native:"English",tag:"en-IN"},
  hi:{native:"हिन्दी",tag:"hi-IN"},
  kn:{native:"ಕನ್ನಡ",tag:"kn-IN"},
  te:{native:"తెలుగు",tag:"te-IN"},
  ta:{native:"தமிழ்",tag:"ta-IN"},
  bn:{native:"বাংলা",tag:"bn-IN"},
  mr:{native:"मराठी",tag:"mr-IN"},
};
type Dictionary={dashboard:string;community:string;challenges:string;alerts:string;assistant:string;
  question:string;ask:string;listen:string;speak:string;language:string;
  dataNotice:string;more:string;source:string};
const TRANSLATIONS:Record<Locale,Dictionary>={
  en:{
    dashboard:"Daily dashboard",community:"Community",challenges:"Challenges",alerts:"Air alerts",
    assistant:"Evidence assistant",question:"Ask a question",ask:"Ask with sources",
    listen:"Speak question",speak:"Read answer",language:"Language",
    dataNotice:"Modelled US AQI, not official CPCB data.",more:"Learn more",source:"Official sources",
  },
  hi:{
    dashboard:"दैनिक डैशबोर्ड",community:"समुदाय",challenges:"चुनौतियाँ",alerts:"वायु चेतावनी",
    assistant:"स्रोत-आधारित सहायक",question:"प्रश्न पूछें",ask:"स्रोतों के साथ पूछें",
    listen:"बोलकर प्रश्न पूछें",speak:"उत्तर सुनें",language:"भाषा",
    dataNotice:"यह अनुमानित अमेरिकी AQI है, आधिकारिक CPCB डेटा नहीं।",more:"और जानें",source:"आधिकारिक स्रोत",
  },
  kn:{
    dashboard:"ದೈನಂದಿನ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್",community:"ಸಮುದಾಯ",challenges:"ಸವಾಲುಗಳು",alerts:"ಗಾಳಿಯ ಎಚ್ಚರಿಕೆಗಳು",
    assistant:"ಮೂಲಾಧಾರಿತ ಸಹಾಯಕ",question:"ಪ್ರಶ್ನೆ ಕೇಳಿ",ask:"ಮೂಲಗಳೊಂದಿಗೆ ಕೇಳಿ",
    listen:"ಮಾತಿನ ಮೂಲಕ ಪ್ರಶ್ನೆ",speak:"ಉತ್ತರ ಆಲಿಸಿ",language:"ಭಾಷೆ",
    dataNotice:"ಇದು ಮಾದರಿ ಆಧಾರಿತ US AQI; ಅಧಿಕೃತ CPCB ಮಾಹಿತಿ ಅಲ್ಲ.",more:"ಇನ್ನಷ್ಟು ತಿಳಿಯಿರಿ",source:"ಅಧಿಕೃತ ಮೂಲಗಳು",
  },
  te:{
    dashboard:"రోజువారీ డ్యాష్‌బోర్డ్",community:"సమాజం",challenges:"సవాళ్లు",alerts:"గాలి హెచ్చరికలు",
    assistant:"ఆధారాలతో సహాయకుడు",question:"ప్రశ్న అడగండి",ask:"ఆధారాలతో అడగండి",
    listen:"మాట్లాడి ప్రశ్నించండి",speak:"సమాధానం వినండి",language:"భాష",
    dataNotice:"ఇది నమూనా ఆధారిత US AQI; అధికారిక CPCB సమాచారం కాదు.",more:"మరింత తెలుసుకోండి",source:"అధికారిక ఆధారాలు",
  },
  ta:{
    dashboard:"தினசரி தகவல் பலகை",community:"சமூகம்",challenges:"சவால்கள்",alerts:"காற்றுத் தர எச்சரிக்கைகள்",
    assistant:"ஆதார உதவியாளர்",question:"கேள்வி கேளுங்கள்",ask:"ஆதாரங்களுடன் கேளுங்கள்",
    listen:"குரலில் கேளுங்கள்",speak:"பதிலைக் கேளுங்கள்",language:"மொழி",
    dataNotice:"இது மாதிரி அடிப்படையிலான US AQI; அதிகாரப்பூர்வ CPCB தரவு அல்ல.",more:"மேலும் அறிக",source:"அதிகாரப்பூர்வ ஆதாரங்கள்",
  },
  bn:{
    dashboard:"দৈনিক ড্যাশবোর্ড",community:"সম্প্রদায়",challenges:"চ্যালেঞ্জ",alerts:"বায়ুর সতর্কতা",
    assistant:"উৎসভিত্তিক সহকারী",question:"প্রশ্ন করুন",ask:"উৎসসহ জিজ্ঞাসা করুন",
    listen:"কথা বলে প্রশ্ন করুন",speak:"উত্তর শুনুন",language:"ভাষা",
    dataNotice:"এটি মডেল-ভিত্তিক US AQI, সরকারি CPCB তথ্য নয়।",more:"আরও জানুন",source:"সরকারি উৎস",
  },
  mr:{
    dashboard:"दैनिक डॅशबोर्ड",community:"समुदाय",challenges:"आव्हाने",alerts:"हवेचे इशारे",
    assistant:"स्रोताधारित सहाय्यक",question:"प्रश्न विचारा",ask:"स्रोतांसह विचारा",
    listen:"बोलून प्रश्न विचारा",speak:"उत्तर ऐका",language:"भाषा",
    dataNotice:"हा मॉडेलवर आधारित US AQI आहे; अधिकृत CPCB माहिती नाही.",more:"अधिक जाणून घ्या",source:"अधिकृत स्रोत",
  },
};
export function t(locale:Locale,key:keyof Dictionary):string{
  return TRANSLATIONS[locale]?.[key]||TRANSLATIONS.en[key];
}
export function selectLocale(value:string):Locale{
  return value in LANGUAGES?value as Locale:"en";
}
