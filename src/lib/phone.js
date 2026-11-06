const KENYA_DIAL_CODE = '254';

export function normalizePhone(phone, countryDialCode = KENYA_DIAL_CODE) {
  const digits = String(phone || '').replace(/\D/g, '');
  const dial = String(countryDialCode || KENYA_DIAL_CODE).replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('00')) return digits.slice(2);
  if (digits.startsWith(dial) && digits.length >= dial.length + 9) return digits;
  if (digits.startsWith('0')) return `${dial}${digits.slice(1)}`;
  if (digits.length === 9) return `${dial}${digits}`;
  return digits;
}

export function isValidMobile(digits, countryDialCode = KENYA_DIAL_CODE) {
  if (!digits) return false;
  const dial = String(countryDialCode || KENYA_DIAL_CODE).replace(/\D/g, '');
  if (dial === KENYA_DIAL_CODE) {
    return /^254(?:7\d{8}|1\d{8})$/.test(digits);
  }
  return /^\d{9,15}$/.test(digits) && digits.startsWith(dial);
}

export function formatPhoneForDisplay(digits) {
  if (!digits) return '';
  const local = digits.slice(KENYA_DIAL_CODE.length);
  if (digits.startsWith(KENYA_DIAL_CODE) && local.length === 9) {
    return `+${KENYA_DIAL_CODE} ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
  }
  return `+${digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}`;
}

export function phoneProblem(rawPhone, countryDialCode = KENYA_DIAL_CODE) {
  const digits = normalizePhone(rawPhone, countryDialCode);
  if (!digits) return 'Enter the debtor phone number so Talgo can message them.';
  if (isValidMobile(digits, countryDialCode)) return null;
  return `That is not a working mobile number. Kenya numbers look like 0746 021 668 or 0112 345 678.`;
}
