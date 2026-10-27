/* Campaign module: change this object, then run python3 site/design/build.py to
   refresh the no-JavaScript fallback. Live /api/public/config overrides these values.
   enabled:false or a passed expiresAt removes every public campaign promotion.
   There are no secrets or submissions stored in this configuration. */
window.FORCE_CAMPAIGN = Object.freeze({
  "enabled": true,
  "title": "F1 Sim Racing",
  "programme": "SUMSHODHINI ’26",
  "date": "31 October 2026",
  "venue": "Central Workshop",
  "fee": "₹99 per student",
  "registrationUrl": "https://docs.google.com/forms/d/e/1FAIpQLSdojQE57Sd9rPsMwwrRuy-RQVNfyL4LaRf8h7srZAYWspcVcw/viewform?usp=dialog",
  "artwork": "assets/images/formula-studio-1600.webp",
  "artworkMobile": "assets/images/formula-studio-800.webp",
  "artworkAlt": "A red Formula-style racing car against a dark studio background. Campaign concept artwork.",
  "poster": "assets/images/campaign-poster.webp",
  "posterOriginal": "assets/original/campaign-poster.png",
  "cta": "Explore & register",
  "description": "The Department of Mechanical Engineering presents F1 Sim Racing at SUMSHODHINI ’26.",
  "artworkLabel": "Campaign concept artwork",
  "expiresAt": null,
  "requiresGoogleSignIn": true,
  "contactName": "Md. Sohail",
  "contactPhone": "+918008391525",
  "submissionEndpoint": null
});
