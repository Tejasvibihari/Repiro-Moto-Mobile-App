import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as Asset from 'expo-asset';
import { Platform, Alert } from 'react-native';
import qrcodegen from 'qrcode-generator';
import { buildInvoiceHTML, buildUpiString, getAmountDue } from './invoiceHtml';

// The invoice layout lives in ./invoiceHtml.js (shared with the Console app and the web dashboard).
export { buildInvoiceHTML };

// Page size handed to expo-print. expo-print lays HTML out at 72 PPI, so these are
// CSS pixels — 794 x 1123 is A4 at 96 dpi, the size the invoice pages are designed for.
const PAGE_WIDTH = 794;
const PAGE_HEIGHT = 1123;

// If a step (QR generation, PDF render) hangs instead of failing, this stops
// it from blocking the UI forever. Tune as needed.
const PDF_TIMEOUT_MS = 20000;

function withTimeout(promise, ms, label) {
    return Promise.race([
        promise,
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`${label} timed out`)), ms)
        ),
    ]);
}

/**
 * Generates the UPI QR as an inline <svg> string — no canvas, no Buffer, no
 * network call, so it can never break/hang inside a React Native runtime
 * (unlike the `qrcode` npm package, which targets Node/browser and commonly
 * throws "Buffer is not defined" / "document is not defined" on RN).
 */
function generateQrSvg(text) {
    try {
        const qr = qrcodegen(0, 'M'); // 0 = auto type number, M = error correction level
        qr.addData(text);
        qr.make();
        return qr.createSvgTag({ cellSize: 4, margin: 4 });
    } catch (e) {
        console.warn('QR generation failed:', e?.message);
        return '';
    }
}

/**
 * Loads the app's local logo image and returns it as a base64 data URI so it
 * can be embedded directly in the invoice HTML. expo-print's HTML renderer
 * can't resolve bundler/require() asset paths — it needs an actual base64
 * data URI or a remote URL.
 *
 * Path assumes this file lives at `utils/invoiceUtils.js` and the logo lives
 * at `assets/adaptive-icon.png` — i.e. they're siblings under the project
 * root. Update the require() path below if your folder structure differs.
 */
let _cachedLogoDataUri = null; // cache across calls in the same app session
async function getLogoDataUri() {
    if (_cachedLogoDataUri) return _cachedLogoDataUri;
    try {
        const asset = Asset.Asset.fromModule(require('../assets/logo/logo300.png'));
        await asset.downloadAsync();
        const base64 = await FileSystem.readAsStringAsync(asset.localUri, {
            encoding: FileSystem.EncodingType.Base64,
        });
        _cachedLogoDataUri = `data:image/png;base64,${base64}`;
        return _cachedLogoDataUri;
    } catch (e) {
        console.warn('Logo load failed:', e?.message);
        return '';
    }
}

/** Strips characters that break Android SAF / filesystem filenames (e.g. "/" in invoice numbers like RT/2026/08/01). */
function sanitizeFileName(name) {
    return String(name ?? '').replace(/[\\/:*?"<>|]/g, '-');
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF generate / share / download
// ─────────────────────────────────────────────────────────────────────────────

/** Generates the invoice PDF and returns its local file uri. Throws on failure/timeout. */
export async function generateInvoicePdf(invoice, order) {
    // Generate the UPI QR locally as inline SVG — synchronous, no network, no
    // canvas/Buffer, so this step can never be the thing that hangs or crashes.
    // The amount is only embedded when something is still due.
    const qrSvg = generateQrSvg(buildUpiString(getAmountDue(invoice, order)));

    // Load the logo as a base64 data URI (cached after first load).
    const logoDataUri = await getLogoDataUri();

    const html = buildInvoiceHTML(invoice, order, { qrSvg, logoDataUri });

    try {
        const { uri } = await withTimeout(
            Print.printToFileAsync({ html, base64: false, width: PAGE_WIDTH, height: PAGE_HEIGHT }),
            PDF_TIMEOUT_MS,
            'PDF generation'
        );
        return uri;
    } catch (err) {
        console.error('generateInvoicePdf failed:', err); // check Metro/logcat for the real cause
        throw err;
    }
}

/** Opens the native share sheet with the invoice PDF (works on iOS + Android). */
export async function shareInvoicePdf(invoice, order) {
    try {
        const uri = await generateInvoicePdf(invoice, order);
        const fileName = `Invoice-${sanitizeFileName(invoice.invoiceNumber ?? Date.now())}.pdf`;
        const newUri = FileSystem.cacheDirectory + fileName;
        await FileSystem.copyAsync({ from: uri, to: newUri });

        const canShare = await Sharing.isAvailableAsync();
        if (!canShare) {
            Alert.alert('Sharing not available', 'Sharing isn\u2019t supported on this device.');
            return;
        }
        await Sharing.shareAsync(newUri, {
            mimeType: 'application/pdf',
            dialogTitle: 'Share Invoice',
            UTI: 'com.adobe.pdf',
        });
    } catch (err) {
        console.error('shareInvoicePdf failed:', err); // check Metro/logcat for the real cause
        Alert.alert('Error', __DEV__
            ? `Could not share invoice.\n\n${err?.message || err}`   // shows real reason while developing
            : 'Could not share invoice. Please try again.');
        throw err; // re-thrown so the caller's `finally` still runs and the UI knows it failed
    }
}

/**
 * "Downloads" the invoice:
 *  - Android: lets the user pick a folder (Storage Access Framework) and saves the PDF there.
 *  - iOS: iOS has no direct filesystem download, so this opens the share sheet
 *    (user can pick "Save to Files").
 */
export async function downloadInvoicePdf(invoice, order) {
    try {
        const uri = await generateInvoicePdf(invoice, order);
        const fileName = `Invoice-${sanitizeFileName(invoice.invoiceNumber ?? Date.now())}.pdf`;

        if (Platform.OS === 'android') {
            const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
            if (!permissions.granted) {
                // fall back to share sheet if user denies folder access
                await shareInvoicePdf(invoice, order);
                return;
            }
            const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
            const destUri = await FileSystem.StorageAccessFramework.createFileAsync(
                permissions.directoryUri,
                fileName,
                'application/pdf'
            );
            await FileSystem.writeAsStringAsync(destUri, base64, { encoding: FileSystem.EncodingType.Base64 });
            Alert.alert('Downloaded', 'Invoice saved successfully.');
        } else {
            // iOS: no public "Downloads" folder — share sheet lets user "Save to Files"
            await shareInvoicePdf(invoice, order);
        }
    } catch (err) {
        console.error('downloadInvoicePdf failed:', err); // check Metro/logcat for the real cause
        Alert.alert('Error', __DEV__
            ? `Could not download invoice.\n\n${err?.message || err}`   // shows real reason while developing
            : 'Could not download invoice. Please try again.');
        throw err; // re-thrown so the caller's `finally` still runs and the UI knows it failed
    }
}