const formatTime = (minutes) => {
    const hour24 = Math.floor(minutes / 60);
    const minute = minutes % 60;
    const modifier = hour24 >= 12 ? 'PM' : 'AM';
    const hour12 = hour24 % 12 || 12;
    return `${String(hour12).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${modifier}`;
};

export const BOOKING_TIME_SLOTS = Array.from({ length: 24 }, (_, index) => {
    const minutes = (8 * 60) + (index * 30);
    const value = formatTime(minutes);
    return { label: value, value, h: Math.floor(minutes / 60), m: minutes % 60 };
});