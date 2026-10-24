// src/constants/contact.js
//
// Single source of truth for the Repairo Moto customer-care number.
// Change it here and every "Call us" / contact button in the app updates.

export const SUPPORT_PHONE_DIGITS = '9229207021';              // used for dialing
export const SUPPORT_PHONE_E164 = '+91' + SUPPORT_PHONE_DIGITS; // tel: link
export const SUPPORT_PHONE_DISPLAY = '+91 92292 07021';         // shown on screen
export const SUPPORT_TEL_URL = `tel:${SUPPORT_PHONE_E164}`;
