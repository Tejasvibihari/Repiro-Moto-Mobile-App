// utils/imageUtils.js

export const getImageUrl = (path) => {
    if (!path) return null;

    // If path is already an absolute URL, return as is
    if (path.startsWith('http')) return path;

    const baseUrl = process.env.EXPO_PUBLIC_API_URL;
    if (!baseUrl) {
        console.warn('EXPO_PUBLIC_API_URL is not defined');
        return null;
    }

    // Remove trailing slash from baseUrl and ensure path starts with a slash
    const cleanBase = baseUrl.replace(/\/$/, '');
    const cleanPath = path.startsWith('/') ? path : `/${path}`;

    return `${cleanBase}${cleanPath}`;
};