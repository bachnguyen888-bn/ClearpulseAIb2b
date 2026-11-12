// Every business value on the site lives here. Edit a line, run `npm run build`, redeploy.
export default {
  brandName: "ClearPulse",
  brandShortName: "CPLS",                  // the only allowed short form (favicon); never "CP"
  ownerName: "Bach Nguyen",
  ownerAge: 18,
  city: "Buena Park, CA",
  serviceArea: "Orange County & Los Angeles",
  serviceAreaShort: "Orange County & LA",  // used in the hero eyebrow and meta description
  instagramHandle: "getclearpulse",        // no @; DM and profile links derive from it
  email: "bachhuunguyen200824@gmail.com",
  phoneDisplay: "(714) 487-9882",
  phoneE164: "+17144879882",
  bookingUrl: "https://cal.com/bach-nguyen-powxyv/15min", // free Cal.com or Calendly link; if empty, booking buttons open the Instagram DM link instead
  priceMonthly: 300,                       // standard monthly price, shown as the regular price
  foundingPriceMonthly: 200,               // founding-spa monthly price, the headline offer
  foundingSpots: 10,                       // must be true: change it here and every mention updates
  liveDemoEnabled: false,                  // true only after the demo account really replies with med spa copy
  photoPath: "assets/bach.jpg",
  siteUrl: "",                             // e.g. "https://clearpulse.vercel.app" — makes the link-preview image URL absolute
};
