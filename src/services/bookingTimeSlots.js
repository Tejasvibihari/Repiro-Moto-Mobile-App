import axiosClient from './axiosClient';

const formatTime = (minutes) => {
    const hour24 = Math.floor(minutes / 60);
    const minute = minutes % 60;
    const modifier = hour24 >= 12 ? 'PM' : 'AM';
    const hour12 = hour24 % 12 || 12;
    return `${String(hour12).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${modifier}`;
};

// Legacy fixed list (08:00 AM - 07:30 PM, every 30 min).
// Time slots are now managed by the admin (Console -> Booking Slots) and loaded from the
// server. This list is only a FALLBACK for when the admin has not created any slot yet,
// which is the same moment the server stops enforcing slots.
export const BOOKING_TIME_SLOTS = Array.from({ length: 24 }, (_, index) => {
    const minutes = (8 * 60) + (index * 30);
    const value = formatTime(minutes);
    return { label: value, value, h: Math.floor(minutes / 60), m: minutes % 60 };
});

// Errors the server raises when the chosen slot cannot be booked.
export const SLOT_ERROR_CODES = ['SLOT_NOT_AVAILABLE', 'SLOT_PAST', 'SLOT_FULL'];

export const isSlotError = (error) =>
    SLOT_ERROR_CODES.includes(error?.response?.data?.code);

export const getSlotErrorMessage = (error) =>
    error?.response?.data?.message || 'That time slot is no longer available. Please choose another one.';

/** "14:30" -> "02:30 PM" (same zero-padded format the server stores as preferredTime) */
export const to12h = (hhmm) => {
    const match = String(hhmm || '').match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
    if (!match) return '';
    return formatTime(Number(match[1]) * 60 + Number(match[2]));
};

const localYmd = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** GET /api/booking-slots?date=YYYY-MM-DD  (public, no auth needed) */
export const fetchBookingSlots = async (date) => {
    const response = await axiosClient.get('/api/booking-slots', { params: { date } });
    return response.data;
};

/**
 * Turns the API response into the list the picker renders.
 *
 *  { value }       what is sent back to the server as `preferredTime` ("08:00 AM")
 *  { title }       "08:00 AM – 09:00 AM"  (or just "08:00 AM" when the slot has no end time)
 *  { subtitle }    the admin's optional label ("Morning")
 *  { available }   false when full / the date is closed
 *  { remaining }   seats left for that slot on that date (null = unlimited)
 *
 * Slots whose start time has already passed today are dropped (nothing to pick there).
 */
export const normalizeSlotResponse = (data, ymd, now = new Date()) => {
    if (data?.enforced === false) {
        const isToday = ymd === localYmd(now);
        const nowMinutes = now.getHours() * 60 + now.getMinutes();
        const slots = BOOKING_TIME_SLOTS
            .filter((s) => !isToday || (s.h * 60 + s.m) > nowMinutes)
            .map((s) => ({
                key: s.value, value: s.value, title: s.label, subtitle: '',
                available: true, unavailableReason: null, remaining: null,
            }));
        return { enforced: false, slots, dateAvailability: null };
    }

    const slots = (data?.slots || [])
        .filter((s) => s.unavailableReason !== 'SLOT_PAST')
        .map((s) => ({
            key: String(s._id || s.value),
            value: s.value,
            title: s.endTime ? `${s.value} – ${to12h(s.endTime)}` : s.value,
            subtitle: s.label || '',
            available: !!s.available,
            unavailableReason: s.unavailableReason || null,
            remaining: s.remaining ?? null,
        }));
    return { enforced: true, slots, dateAvailability: data?.dateAvailability || null };
};
