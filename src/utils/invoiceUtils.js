
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as Asset from 'expo-asset';
import { Platform, Alert } from 'react-native';
import qrcodegen from 'qrcode-generator';

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
// COMPANY / PAYMENT CONFIG — fill in real values, rest of file doesn't change
// ─────────────────────────────────────────────────────────────────────────────
const COMPANY = {
    name: 'Repairo Moto', // display / brand name — big header text
    legalName: 'Shantram Private Limited', // registered name — shown just below, smaller
    addressLine1: '5C/12 Manna Singh Lane, Vivekanand Marg,',
    addressLine2: 'North S.K Puri, Boring Road, Patna - 13, India',
    phone: '+91 9229207021',
    email: 'contact@repairomoto.in',
    gst: '10AAXCS3327A1ZO',
};

// TODO: Replace with your actual UPI ID (e.g. repairomoto@okaxis)
const UPI_ID = '9308389960@okbizaxis';

// TODO: Replace with actual bank account details
const BANK_DETAILS = {
    accountName: 'Shantram Private Limited',
    accountNumber: '36021607833',
    ifsc: 'SBIN0001513',
    bankName: 'Bank of India',
    branch: 'PATLIPUTRA',
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const safeNum = (v) => {
    if (v == null) return 0;
    if (typeof v === 'number') return v;
    if (typeof v === 'object') {
        const raw = v.$numberDecimal ?? v.$numberDouble ?? v.$numberInt ?? v.value;
        return raw != null ? parseFloat(raw) : 0;
    }
    return parseFloat(v) || 0;
};

const fmt = (n) =>
    `Rs.${safeNum(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (d) => {
    if (!d) return '—';
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return '—';
    return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

// Indian numbering system number-to-words (for "Amount Chargeable in words")
function numberToWordsIndian(num) {
    num = Math.round(safeNum(num));
    if (num === 0) return 'Zero';
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
        'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const two = (n) => {
        if (n < 20) return ones[n];
        return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    };
    const three = (n) => {
        if (n >= 100) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + two(n % 100) : '');
        return two(n);
    };

    let str = '';
    const crore = Math.floor(num / 10000000); num %= 10000000;
    const lakh = Math.floor(num / 100000); num %= 100000;
    const thousand = Math.floor(num / 1000); num %= 1000;
    const rest = num;

    if (crore) str += three(crore) + ' Crore ';
    if (lakh) str += three(lakh) + ' Lakh ';
    if (thousand) str += three(thousand) + ' Thousand ';
    if (rest) str += three(rest);

    return str.trim();
}

const hasItemDiscount = (item) => safeNum(item.discountPrice) > 0 && safeNum(item.discountPrice) < safeNum(item.price);
const effectivePrice = (item) => (hasItemDiscount(item) ? safeNum(item.discountPrice) : safeNum(item.price));

// ─────────────────────────────────────────────────────────────────────────────
// HTML Template
// ─────────────────────────────────────────────────────────────────────────────
export function buildInvoiceHTML(invoice, order = {}) {
    const t = invoice?.total ?? {};
    const pd = invoice?.paymentDetails ?? {};

    const subTotal = safeNum(t.subTotal || t.baseAmount);
    const billDiscount = safeNum(t.discount);
    const referralDiscount = safeNum(t.referralDiscount);
    const walletUsed = safeNum(t.walletAmountUsed ?? pd.walletAmountUsed);
    const sgst = safeNum(t.sgst);
    const cgst = safeNum(t.cgst);
    const sgstRate = safeNum(t.sgstRate) || 9;
    const cgstRate = safeNum(t.cgstRate) || 9;
    const totalSettled = safeNum(t.totalAmountPaid ?? pd.totalSettled ?? pd.amountPaid ?? t.finalPayable);

    const items = [
        ...(invoice.serviceProvided || []).map((s) => ({
            name: s.serviceName,
            qty: safeNum(s.quantity) || 1,
            rate: effectivePrice(s),
        })),
        ...(invoice.partsUsed || []).map((p) => ({
            name: p.partName,
            qty: safeNum(p.quantity) || 1,
            rate: effectivePrice(p),
        })),
    ];

    const itemRows = items.map((it, i) => {
        const amount = it.rate * it.qty;
        return `
      <tr>
        <td class="c">${i + 1}</td>
        <td>${it.name}</td>
        <td class="c">${it.qty}</td>
        <td class="r">${fmt(it.rate)}</td>
        <td class="r">${fmt(amount)}</td>
      </tr>`;
    }).join('');

    const totalQty = items.reduce((a, it) => a + it.qty, 0);
    const amountWords = `INR ${numberToWordsIndian(totalSettled)} Only`;

    // ── Mechanic details ────────────────────────────────────────────────────
    // Order stores these as ARRAYS:
    //   mechanicIds: [{ _id, firstName, lastName, phone, profileImage }]  (full objects, preferred)
    //   assignedMechanics: ["Imtiyaz  Ahmad"]                              (name-only, legacy fallback)
    // Show at most 2 mechanics — names comma-separated, phones comma-separated. No ID shown.
    const MAX_MECHANICS_SHOWN = 2;

    const mechanicList = Array.isArray(order?.mechanicIds)
        ? order.mechanicIds.slice(0, MAX_MECHANICS_SHOWN)
        : [];

    let mechanicName = '—';
    let mechanicPhone = '—';

    if (mechanicList.length > 0) {
        mechanicName = mechanicList
            .map((m) => `${m.firstName ?? ''} ${m.lastName ?? ''}`.trim())
            .filter(Boolean)
            .join(', ') || '—';
        mechanicPhone = mechanicList
            .map((m) => m.phone)
            .filter(Boolean)
            .join(', ') || '—';
    } else if (Array.isArray(order?.assignedMechanics) && order.assignedMechanics.length > 0) {
        // legacy fallback — names only, no phone available
        mechanicName = order.assignedMechanics.slice(0, MAX_MECHANICS_SHOWN).join(', ');
    }

    // ── Logo + QR (both inline data, generated/loaded before this function runs) ─
    const qrSvg = invoice._qrSvg || '';
    const logoDataUri = invoice._logoDataUri || '';

    return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  body { font-family: Helvetica, Arial, sans-serif; color: #1a1a1a; padding: 24px; font-size: 12px; }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 2px solid #1a1a1a;
    padding-bottom: 10px;
    margin-bottom: 14px;
    gap: 16px;
  }
  .header-text { text-align: left; }
  .company-name { font-size: 20px; font-weight: 800; color: #e2a731; letter-spacing: 0.5px; }
  .company-legal { font-size: 10.5px; color: #666; font-weight: 600; margin-top: 1px; letter-spacing: 0.3px; }
  .company-line { font-size: 11px; color: #444; margin-top: 2px; }
  .header-logo { width: 64px; height: 64px; object-fit: contain; flex-shrink: 0; }

  .title { text-align: center; font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; margin: 10px 0 16px; }

  .box-row { display: flex; gap: 12px; margin-bottom: 14px; }
  .box { flex: 1; border: 1px solid #ccc; border-radius: 6px; padding: 10px; }
  .box h4 { margin: 0 0 6px; font-size: 10px; letter-spacing: 1px; color: #888; text-transform: uppercase; }
  .box p { margin: 2px 0; font-size: 12px; }

  table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
  th, td { border: 1px solid #ccc; padding: 7px 8px; font-size: 11.5px; }
  th { background: #fff4e0; text-transform: uppercase; font-size: 9.5px; letter-spacing: 0.5px; color: #663c00; }
  td.c, th.c { text-align: center; }
  td.r, th.r { text-align: right; }
  tfoot td { font-weight: 700; background: #f8f5ef; }

  .summary { width: 300px; margin-left: auto; margin-bottom: 14px; }
  .summary td { border: none; padding: 4px 0; font-size: 12px; }
  .summary .final td { border-top: 2px solid #1a1a1a; padding-top: 8px; font-size: 15px; font-weight: 800; color: #2ECC9A; }

  .words { font-size: 12px; margin-bottom: 14px; }
  .words b { display: block; margin-bottom: 2px; color: #888; font-size: 9.5px; letter-spacing: 1px; text-transform: uppercase; }

  .pay-row { display: flex; gap: 12px; margin-top: 10px; }
  .pay-box { flex: 1; border: 1px solid #ccc; border-radius: 6px; padding: 12px; }
  .pay-box h4 { margin: 0 0 8px; font-size: 10px; letter-spacing: 1px; color: #888; text-transform: uppercase; }
  .qr-box { width: 160px; text-align: center; border: 1px solid #ccc; border-radius: 6px; padding: 10px; }
  .qr-box svg { width: 130px; height: 130px; }
  .qr-box p { font-size: 9px; color: #888; margin-top: 6px; }

  .footer { margin-top: 26px; display: flex; justify-content: space-between; align-items: flex-end; }
  .sign { text-align: center; font-size: 11px; }
  .sign .line { margin-top: 36px; border-top: 1px solid #444; width: 160px; padding-top: 4px; }
  .disclaimer { font-size: 9.5px; color: #999; margin-top: 20px; text-align: center; }
</style>
</head>
<body>

  <div class="header">
    <div class="header-text">
      <div class="company-name">${COMPANY.name}</div>
      <div class="company-legal">${COMPANY.legalName}</div>
      <div class="company-line">${COMPANY.addressLine1} ${COMPANY.addressLine2}</div>
      <div class="company-line">Phone: ${COMPANY.phone} &nbsp;|&nbsp; Email: ${COMPANY.email}</div>
      <div class="company-line">GSTIN: ${COMPANY.gst}</div>
    </div>
    ${logoDataUri ? `<img src="${logoDataUri}" class="header-logo" />` : ''}
  </div>

  <div class="title">Tax Invoice</div>

  <div class="box-row">
    <div class="box">
      <h4>Invoice Details</h4>
      <p><b>Invoice No:</b> ${invoice.invoiceNumber ?? '—'}</p>
      <p><b>Invoice Date:</b> ${fmtDate(invoice.invoiceDate)}</p>
      <p><b>Order ID:</b> ${order.orderId ?? '—'}</p>
      ${pd.paymentDate ? `<p><b>Paid On:</b> ${fmtDate(pd.paymentDate)} (${(pd.method || 'online').toUpperCase()})</p>` : ''}
      ${pd.razorpayPaymentId ? `<p><b>Txn ID:</b> ${pd.razorpayPaymentId}</p>` : ''}
    </div>
    <div class="box">
      <h4>Bill To / Ship To</h4>
      <p><b>${invoice.customerDetails?.name ?? '—'}</b></p>
      <p>${invoice.customerDetails?.contactNo ?? ''}</p>
      <p>${invoice.customerDetails?.email ?? ''}</p>
      <p>${invoice.customerDetails?.city ?? ''}</p>
    </div>
  </div>

  <div class="box-row">
    <div class="box">
      <h4>Vehicle Details</h4>
      <p><b>${invoice.vehicleDetails?.brand ?? ''} ${invoice.vehicleDetails?.model ?? ''} ${invoice.vehicleDetails?.modelName ?? ''}</b></p>
      <p>${invoice.vehicleDetails?.cc ? invoice.vehicleDetails.cc + ' cc' : ''} ${invoice.vehicleDetails?.bs ? '· ' + invoice.vehicleDetails.bs : ''}</p>
      ${invoice.vehicleDetails?.regNumber ? `<p>Reg No: ${invoice.vehicleDetails.regNumber}</p>` : ''}
    </div>
    <div class="box">
      <h4>Mechanic Assigned</h4>
      <p><b>${mechanicName}</b></p>
      <p>Contact: ${mechanicPhone}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th class="c">Sl No</th>
        <th>Description of Service / Part</th>
        <th class="c">Qty</th>
        <th class="r">Rate</th>
        <th class="r">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="2" class="c">Total</td>
        <td class="c">${totalQty}</td>
        <td></td>
        <td class="r">${fmt(subTotal || items.reduce((a, it) => a + it.rate * it.qty, 0))}</td>
      </tr>
    </tfoot>
  </table>

  <table class="summary">
    <tr><td>Subtotal</td><td class="r">${fmt(subTotal)}</td></tr>
    ${billDiscount > 0 ? `<tr><td>Discount</td><td class="r">-${fmt(billDiscount)}</td></tr>` : ''}
    ${referralDiscount > 0 ? `<tr><td>Referral Discount</td><td class="r">-${fmt(referralDiscount)}</td></tr>` : ''}
    <tr><td>CGST @ ${cgstRate}%</td><td class="r">${fmt(cgst)}</td></tr>
    <tr><td>SGST @ ${sgstRate}%</td><td class="r">${fmt(sgst)}</td></tr>
    ${walletUsed > 0 ? `<tr><td>Wallet Used</td><td class="r">-${fmt(walletUsed)}</td></tr>` : ''}
    <tr class="final"><td>Total Paid</td><td class="r">${fmt(totalSettled)}</td></tr>
  </table>

  <div class="words">
    <b>Amount Chargeable (in words)</b>
    ${amountWords}
  </div>

  <div class="pay-row">
    <div class="pay-box">
      <h4>Bank Details</h4>
      <p><b>Account Name:</b> ${BANK_DETAILS.accountName}</p>
      <p><b>Account No:</b> ${BANK_DETAILS.accountNumber}</p>
      <p><b>IFSC:</b> ${BANK_DETAILS.ifsc}</p>
      <p><b>Bank:</b> ${BANK_DETAILS.bankName}</p>
      <p><b>Branch:</b> ${BANK_DETAILS.branch}</p>
      <p><b>UPI ID:</b> ${UPI_ID}</p>
    </div>
    <div class="qr-box">
      ${qrSvg
            ? qrSvg
            : `<div style="width:130px;height:130px;display:flex;align-items:center;justify-content:center;border:1px dashed #ccc;font-size:9px;color:#999;">QR unavailable</div>`}
      <p>Scan to pay via UPI</p>
    </div>
  </div>

  <div class="footer">
    <div style="font-size:10px;color:#999;">Declaration: This invoice shows the actual price of the service/parts provided and all particulars are true and correct.</div>
    <div class="sign">
      for ${COMPANY.name}
      <div class="line">Authorised Signatory</div>
    </div>
  </div>

  <div class="disclaimer">This is a computer generated invoice and does not require a physical signature.</div>

</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF generate / share / download
// ─────────────────────────────────────────────────────────────────────────────

/** Generates the invoice PDF and returns its local file uri. Throws on failure/timeout. */
export async function generateInvoicePdf(invoice, order) {
    // Generate the UPI QR locally as inline SVG — synchronous, no network, no
    // canvas/Buffer, so this step can never be the thing that hangs or crashes.
    const totalSettled = safeNum(
        invoice?.total?.totalAmountPaid ?? invoice?.paymentDetails?.totalSettled ?? invoice?.total?.finalPayable
    );
    const upiString = `upi://pay?pa=${encodeURIComponent(UPI_ID)}&pn=${encodeURIComponent(COMPANY.name)}&am=${totalSettled.toFixed(2)}&cu=INR`;
    const qrSvg = generateQrSvg(upiString);

    // Load the logo as a base64 data URI (cached after first load).
    const logoDataUri = await getLogoDataUri();

    const html = buildInvoiceHTML({ ...invoice, _qrSvg: qrSvg, _logoDataUri: logoDataUri }, order);

    try {
        const { uri } = await withTimeout(
            Print.printToFileAsync({ html, base64: false }),
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