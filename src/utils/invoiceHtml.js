// ─────────────────────────────────────────────────────────────────────────────
// invoiceHtml.js — the ONE invoice layout used everywhere in Repairo Moto.
//
// This file is pure JavaScript (no React Native / DOM / Node imports), and the
// exact same file is copied into:
//   • Repiro-Moto-Mobile-App : src/utils/invoiceHtml.js
//   • Repairo-Moto-Console   : src/utils/invoiceHtml.js
//   • client (web dashboard) : src/utils/invoiceHtml.js
// Each project only adds a thin wrapper for its own platform (PDF / print / QR).
// If you change the layout, change it here and re-copy the file to the others.
//
// Layout: fixed-size pages. Every page repeats the header, the invoice /
// customer / vehicle / mechanic boxes and the footer (compact bank details +
// QR + signature). Only the item rows change from page to page; the totals
// block is printed once, on the last page.
// ─────────────────────────────────────────────────────────────────────────────

// ── Company / payment config (single source of truth) ───────────────────────
export const COMPANY = {
    name: 'Repairo Moto',
    legalName: 'Shantram Private Limited',
    addressLine1: '5C/12 Manna Singh Lane, Vivekanand Marg,',
    addressLine2: 'North S.K Puri, Boring Road, Patna - 13, India',
    phone: '+91 9229207021',
    email: 'contact@repairomoto.in',
    gst: '10AAXCS3327A1ZO',
};

export const UPI_ID = '9308389960@okbizaxis';

export const BANK_DETAILS = {
    accountName: 'Shantram Private Limited',
    accountNumber: '36021607833',
    ifsc: 'SBIN0001513',
    bankName: 'Bank of India',
    branch: 'PATLIPUTRA',
};

// ── Pagination ──────────────────────────────────────────────────────────────
// Rows are a fixed height, so every page has exactly the same layout.
//   ROWS_PER_PAGE      : item rows on a normal (non-last) page
//   ROWS_ON_LAST_PAGE  : item rows on the last page (it also holds the totals)
// A long item name that wraps onto 2 / 3 lines counts as 2 / 3 rows.
export const ROWS_PER_PAGE = 16;
export const ROWS_ON_LAST_PAGE = 8;
const ROW_HEIGHT_PX = 28;
// When an invoice spills onto another page, carry at least this many rows over
// so the last page is never a lonely single row.
const MIN_ROWS_CARRIED = 3;

// ── Helpers ─────────────────────────────────────────────────────────────────
export const safeNum = (v) => {
    if (v == null) return 0;
    if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
    if (typeof v === 'object') {
        const raw = v.$numberDecimal ?? v.$numberDouble ?? v.$numberInt ?? v.value;
        return raw != null ? parseFloat(raw) || 0 : 0;
    }
    return parseFloat(v) || 0;
};

// "Rs." (not the rupee glyph) because the default PDF font can drop "₹".
export const fmt = (n) =>
    `Rs.${safeNum(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const fmtDate = (d) => {
    if (!d) return '—';
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return '—';
    return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const esc = (v) =>
    String(v ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

// Indian numbering system number-to-words (for "Amount Chargeable in words")
export function numberToWordsIndian(num) {
    num = Math.round(safeNum(num));
    if (num === 0) return 'Zero';
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
        'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const two = (n) => (n < 20 ? ones[n] : tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : ''));
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

// Unit price actually charged for a line.
//  • Manual invoices store `effectivePrice` (and discountType 'percent'/'fixed').
//  • Order invoices store `discountPrice` as the already-discounted unit price.
export const effectivePrice = (item) => {
    if (item?.effectivePrice != null && safeNum(item.effectivePrice) > 0) return safeNum(item.effectivePrice);
    const price = safeNum(item?.price);
    const disc = safeNum(item?.discountPrice);
    // Manual invoices (web-created, no effectivePrice stored): discountPrice is a discount VALUE.
    if ((item?.discountType === 'percent' || item?.discountType === 'flat') && disc > 0) {
        return item.discountType === 'percent'
            ? price * (1 - disc / 100)
            : Math.max(price - disc, 0);
    }
    return disc > 0 && disc < price ? disc : price;
};

// How many table rows an item name needs (the description column fits ~46 chars/line).
const rowWeight = (name) => {
    const len = String(name ?? '').length;
    return len > 92 ? 3 : len > 46 ? 2 : 1;
};

/**
 * Splits items into pages. Non-last pages hold up to ROWS_PER_PAGE rows; the
 * last page holds up to ROWS_ON_LAST_PAGE rows (it also carries the totals).
 * Always returns at least one page.
 */
export function paginateItems(items) {
    const pages = [];
    let rest = items.map((it) => ({ it, w: rowWeight(it.name) }));
    const weightOf = (arr) => arr.reduce((a, x) => a + x.w, 0);

    while (weightOf(rest) > ROWS_ON_LAST_PAGE) {
        const page = [];
        let used = 0;
        // Keep a few rows back for the next page so it is never "totals only" / one orphan row.
        while (rest.length > 1 && used + rest[0].w <= ROWS_PER_PAGE
            && weightOf(rest) - rest[0].w >= MIN_ROWS_CARRIED) {
            used += rest[0].w;
            page.push(rest.shift());
        }
        if (!page.length) page.push(rest.shift()); // oversize single item safety
        pages.push(page);
    }
    pages.push(rest);
    return pages.map((p) => p.map((x) => x.it));
}

// ── Mechanic info (max 2 shown) ──────────────────────────────────────────────
// `order.mechanicIds` : [{ firstName, lastName, phone }]  (populated objects, preferred)
// `order.assignedMechanics` : ["Imtiyaz Ahmad"]            (names only, legacy fallback)
const MAX_MECHANICS_SHOWN = 2;

function getMechanic(order) {
    let name = '—';
    let phone = '—';
    const populated = (Array.isArray(order?.mechanicIds) ? order.mechanicIds : [])
        .filter((m) => m && typeof m === 'object')
        .slice(0, MAX_MECHANICS_SHOWN);

    if (populated.length > 0) {
        name = populated
            .map((m) => `${m.firstName ?? ''} ${m.lastName ?? ''}`.trim() || m.name || '')
            .filter(Boolean)
            .join(', ') || '—';
        phone = populated.map((m) => m.phone).filter(Boolean).join(', ') || '—';
    }
    if (name === '—' && Array.isArray(order?.assignedMechanics) && order.assignedMechanics.length > 0) {
        name = order.assignedMechanics
            .slice(0, MAX_MECHANICS_SHOWN)
            .map((n) => String(n).replace(/\s+/g, ' ').trim())
            .join(', ');
    }
    if (name === '—' && typeof order?.assignedMechanic === 'string' && order.assignedMechanic.trim()) {
        name = order.assignedMechanic.replace(/\s+/g, ' ').trim();
    }
    return { name, phone };
}

// ── Styles ───────────────────────────────────────────────────────────────────
function css(pageW, pageH, screenPreview) {
    return `
  * { box-sizing: border-box; }
  :root { --pw: ${pageW}; --ph: ${pageH}; }
  @page { size: ${pageW} ${pageH}; margin: 0; }
  html, body { margin: 0; padding: 0; background: #fff; }
  body { font-family: Helvetica, Arial, sans-serif; color: #1a1a1a; font-size: 12px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }

  .page {
    width: var(--pw);
    height: calc(var(--ph) - 1px);
    padding: 26px 32px 22px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    page-break-after: always;
    break-after: page;
    background: #fff;
  }
  .page:last-child { page-break-after: auto; break-after: auto; }
  .content { flex: 1; min-height: 0; }

  .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #1a1a1a; padding-bottom: 8px; margin-bottom: 8px; gap: 16px; }
  .company-name { font-size: 20px; font-weight: 800; color: #e2a731; letter-spacing: 0.5px; }
  .company-legal { font-size: 10.5px; color: #666; font-weight: 600; margin-top: 1px; letter-spacing: 0.3px; }
  .company-line { font-size: 10.5px; color: #444; margin-top: 2px; }
  .header-logo { width: 58px; height: 58px; object-fit: contain; flex-shrink: 0; }

  .title-row { display: flex; justify-content: space-between; align-items: center; margin: 4px 0 10px; }
  .title { flex: 1; text-align: center; font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; padding-left: 70px; }
  .pageno { width: 70px; text-align: right; font-size: 10px; color: #888; }

  .box-row { display: flex; gap: 10px; margin-bottom: 8px; }
  .box { flex: 1; border: 1px solid #ccc; border-radius: 6px; padding: 7px 10px; min-height: 78px; }
  .box h4 { margin: 0 0 4px; font-size: 9.5px; letter-spacing: 1px; color: #888; text-transform: uppercase; }
  .box p { margin: 1px 0; font-size: 11.5px; }

  table.items { width: 100%; border-collapse: collapse; table-layout: fixed; margin-top: 4px; }
  table.items th, table.items td { border: 1px solid #ccc; padding: 0 8px; font-size: 11.5px; line-height: 1.25; overflow: hidden; vertical-align: middle; }
  table.items th { background: #fff4e0; text-transform: uppercase; font-size: 9.5px; letter-spacing: 0.5px; color: #663c00; height: 26px; }
  table.items td.c, table.items th.c { text-align: center; }
  table.items td.r, table.items th.r { text-align: right; }
  table.items tr.fill td { border-top: none; border-bottom: none; }
  table.items tr.fill.last td { border-bottom: 1px solid #ccc; }
  table.items tfoot td { font-weight: 700; background: #f8f5ef; height: ${ROW_HEIGHT_PX}px; }

  .totals-row { display: flex; gap: 14px; align-items: flex-start; margin-top: 10px; }
  .words { flex: 1; font-size: 11.5px; padding-top: 4px; }
  .words b { display: block; margin-bottom: 2px; color: #888; font-size: 9.5px; letter-spacing: 1px; text-transform: uppercase; }
  table.summary { width: 290px; border-collapse: collapse; }
  table.summary td { border: none; padding: 3px 0; font-size: 11.5px; }
  table.summary td.r { text-align: right; }
  table.summary tr.final td { border-top: 2px solid #1a1a1a; padding-top: 6px; font-size: 14px; font-weight: 800; color: #2ECC9A; }
  table.summary tr.due td { color: #d9534f; }

  /* ── Footer: repeated on every page ── */
  .bottom { margin-top: 8px; }
  .pay-row { display: flex; gap: 10px; align-items: stretch; }
  .bank { flex: 1; border: 1px solid #ccc; border-radius: 6px; padding: 6px 10px; }
  .bank h4 { margin: 0 0 3px; font-size: 9.5px; letter-spacing: 1px; color: #888; text-transform: uppercase; }
  .bank-grid { display: flex; flex-wrap: wrap; }
  .bank-grid div { width: 50%; font-size: 10px; line-height: 1.55; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .bank-grid b { color: #555; }
  .qr-box { width: 92px; border: 1px solid #ccc; border-radius: 6px; padding: 4px; text-align: center; }
  .qr-box svg { width: 62px; height: 62px; }
  .qr-box p { margin: 1px 0 0; font-size: 8px; color: #888; }
  .qr-na { width: 62px; height: 62px; margin: 0 auto; border: 1px dashed #ccc; font-size: 8px; color: #999; display: flex; align-items: center; justify-content: center; }

  .sign-row { margin-top: 8px; display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; }
  .declaration { font-size: 9px; color: #999; flex: 1; }
  .sign { text-align: center; font-size: 10.5px; }
  .sign .line { margin-top: 24px; border-top: 1px solid #444; width: 160px; padding-top: 3px; }
  .disclaimer { font-size: 9px; color: #999; margin-top: 6px; text-align: center; }
${screenPreview ? `
  @media screen {
    body { background: #e5e7eb; padding: 12px 0; }
    .page { margin: 0 auto 14px; box-shadow: 0 1px 8px rgba(0,0,0,0.18); }
  }` : ''}
`;
}

// ── Main builder ─────────────────────────────────────────────────────────────
/**
 * @param {object} invoice  invoice data (order-invoice or manual-invoice shape)
 * @param {object} order    the order (for orderId + mechanics). For manual
 *                          invoices pass the invoice itself or {}.
 * @param {object} opts
 *   qrSvg        inline <svg> string for the UPI QR (optional)
 *   logoDataUri  base64 data-URI / URL of the logo (optional)
 *   pageWidth    CSS width of one page  (default '794px'  — A4 @96dpi)
 *   pageHeight   CSS height of one page (default '1123px')
 *                On the web pass '210mm' / '297mm'.
 *   screenPreview  web only — grey background + page shadows on screen (not in print)
 */
export function buildInvoiceHTML(invoice = {}, order = {}, opts = {}) {
    const { qrSvg = '', logoDataUri = '', pageWidth = '794px', pageHeight = '1123px', screenPreview = false } = opts;
    const t = invoice?.total ?? {};
    const pd = invoice?.paymentDetails ?? {};
    const cd = invoice?.customerDetails ?? {};
    const vd = invoice?.vehicleDetails ?? {};
    const biz = invoice?.businessDetails ?? order?.businessDetails ?? order?.gstInvoice?.businessDetails ?? null;
    const hasBiz = !!biz?.gstin;

    // ── Money ──────────────────────────────────────────────────────────────
    const items = [
        ...(invoice.serviceProvided || []).map((s) => ({
            name: s.serviceName, qty: safeNum(s.quantity) || 1, rate: effectivePrice(s),
        })),
        ...(invoice.partsUsed || []).map((p) => ({
            name: p.partName, qty: safeNum(p.quantity) || 1, rate: effectivePrice(p),
        })),
    ];
    const itemsTotal = items.reduce((a, it) => a + it.rate * it.qty, 0);
    const totalQty = items.reduce((a, it) => a + it.qty, 0);

    const subTotal = safeNum(t.subTotal || t.baseAmount) || itemsTotal;
    const billDiscount = safeNum(t.discount);
    // Manual invoices store the raw value + type 'percent'|'flat'; order invoices store the amount.
    const discountIsPercent = t.discountType === 'percent';
    const discountLabel = discountIsPercent ? `Discount (${billDiscount}%)` : 'Discount';
    const discountValue = discountIsPercent ? (subTotal * billDiscount) / 100 : billDiscount;
    const referralDiscount = safeNum(t.referralDiscount);
    const couponCode = t.couponCode || null;
    const couponDiscount = safeNum(t.couponDiscount);
    const walletUsed = safeNum(t.walletAmountUsed ?? pd.walletAmountUsed);
    const sgst = safeNum(t.sgst);
    const cgst = safeNum(t.cgst);
    const sgstRate = safeNum(t.sgstRate) || (sgst > 0 ? 9 : 0);
    const cgstRate = safeNum(t.cgstRate) || (cgst > 0 ? 9 : 0);
    const showTax = sgst > 0 || cgst > 0 || sgstRate > 0 || cgstRate > 0;

    const payable = safeNum(t.finalPayable ?? t.total);
    const settled = safeNum(t.totalAmountPaid ?? pd.totalSettled ?? pd.amountPaid);
    const isPaid = [invoice.status, invoice.paymentStatus, order?.paymentStatus, pd.status]
        .some((s) => String(s ?? '').toLowerCase() === 'paid');
    const amountDue = isPaid ? 0 : Math.max(payable - settled, 0);
    const grand = amountDue > 0 ? amountDue : (settled || payable);
    const grandLabel = amountDue > 0 ? 'Amount Due' : 'Total Paid';
    const amountWords = `INR ${numberToWordsIndian(grand)} Only`;

    // ── Mechanic ───────────────────────────────────────────────────────────
    const mech = getMechanic(order && Object.keys(order).length ? order : invoice);

    // ── Vehicle line ───────────────────────────────────────────────────────
    const vModel = String(vd.model ?? '').toLowerCase() === 'other' ? '' : vd.model;
    const vehicleTitle = [vd.brand, vModel, vd.modelName].filter(Boolean).join(' ') || '—';
    const vehicleSub = [vd.cc ? `${vd.cc} cc` : '', vd.bs || ''].filter(Boolean).join(' · ');

    // ── Pages ──────────────────────────────────────────────────────────────
    const pages = paginateItems(items);
    const totalPages = pages.length;
    let serial = 0;

    const header = `
  <div class="header">
    <div>
      <div class="company-name">${esc(COMPANY.name)}</div>
      <div class="company-legal">${esc(COMPANY.legalName)}</div>
      <div class="company-line">${esc(COMPANY.addressLine1)} ${esc(COMPANY.addressLine2)}</div>
      <div class="company-line">Phone: ${esc(COMPANY.phone)} &nbsp;|&nbsp; Email: ${esc(COMPANY.email)}</div>
      <div class="company-line">GSTIN: ${esc(COMPANY.gst)}</div>
    </div>
    ${logoDataUri ? `<img src="${logoDataUri}" class="header-logo" />` : ''}
  </div>`;

    const billTo = hasBiz
        ? `<p><b>${esc(biz.businessName || cd.name || '—')}</b></p>
      <p>GSTIN: ${esc(biz.gstin)}</p>
      <p>${esc([biz.businessAddress, biz.businessCity, biz.businessState, biz.businessPincode].filter(Boolean).join(', '))}</p>`
        : `<p><b>${esc(cd.name || '—')}</b></p>
      <p>${esc(cd.contactNo || '')}</p>
      <p>${esc(cd.email || '')}</p>
      <p>${esc([cd.address, cd.city].filter(Boolean).join(', '))}</p>`;

    const infoBoxes = `
  <div class="box-row">
    <div class="box">
      <h4>Invoice Details</h4>
      <p><b>Invoice No:</b> ${esc(invoice.invoiceNumber ?? '—')}</p>
      <p><b>Invoice Date:</b> ${fmtDate(invoice.invoiceDate)}</p>
      ${order?.orderId ? `<p><b>Order ID:</b> ${esc(order.orderId)}</p>` : ''}
      ${pd.paymentDate ? `<p><b>Paid On:</b> ${fmtDate(pd.paymentDate)} (${esc((pd.method || 'online').toUpperCase())})</p>` : ''}
      ${pd.razorpayPaymentId ? `<p><b>Txn ID:</b> ${esc(pd.razorpayPaymentId)}</p>` : ''}
    </div>
    <div class="box">
      <h4>Bill To / Ship To</h4>
      ${billTo}
    </div>
  </div>
  <div class="box-row">
    <div class="box">
      <h4>Vehicle Details</h4>
      <p><b>${esc(vehicleTitle)}</b></p>
      <p>${esc(vehicleSub)}</p>
      ${vd.regNumber ? `<p>Reg No: ${esc(vd.regNumber)}</p>` : ''}
    </div>
    <div class="box">
      <h4>Mechanic Assigned</h4>
      <p><b>${esc(mech.name)}</b></p>
      <p>Contact: ${esc(mech.phone)}</p>
    </div>
  </div>`;

    const footer = `
  <div class="bottom">
    <div class="pay-row">
      <div class="bank">
        <h4>Bank Details</h4>
        <div class="bank-grid">
          <div><b>A/c Name:</b> ${esc(BANK_DETAILS.accountName)}</div>
          <div><b>A/c No:</b> ${esc(BANK_DETAILS.accountNumber)}</div>
          <div><b>IFSC:</b> ${esc(BANK_DETAILS.ifsc)}</div>
          <div><b>Bank:</b> ${esc(BANK_DETAILS.bankName)}, ${esc(BANK_DETAILS.branch)}</div>
          <div><b>UPI ID:</b> ${esc(UPI_ID)}</div>
        </div>
      </div>
      <div class="qr-box">
        ${qrSvg || '<div class="qr-na">QR unavailable</div>'}
        <p>Scan to pay via UPI</p>
      </div>
    </div>
    <div class="sign-row">
      <div class="declaration">Declaration: This invoice shows the actual price of the service/parts provided and all particulars are true and correct.</div>
      <div class="sign">for ${esc(COMPANY.name)}<div class="line">Authorised Signatory</div></div>
    </div>
    <div class="disclaimer">This is a computer generated invoice and does not require a physical signature.</div>
  </div>`;

    const tableHead = `
    <colgroup><col style="width:8%"/><col style="width:50%"/><col style="width:8%"/><col style="width:17%"/><col style="width:17%"/></colgroup>
    <thead><tr>
      <th class="c">Sl No</th><th>Description of Service / Part</th><th class="c">Qty</th><th class="r">Rate</th><th class="r">Amount</th>
    </tr></thead>`;

    const pageHtml = pages.map((pageItems, pi) => {
        const isLast = pi === totalPages - 1;
        const capacity = isLast ? ROWS_ON_LAST_PAGE : ROWS_PER_PAGE;

        let used = 0;
        const rows = pageItems.map((it) => {
            serial += 1;
            const w = rowWeight(it.name);
            used += w;
            return `<tr style="height:${ROW_HEIGHT_PX * w}px">
        <td class="c">${serial}</td><td>${esc(it.name)}</td><td class="c">${it.qty}</td>
        <td class="r">${fmt(it.rate)}</td><td class="r">${fmt(it.rate * it.qty)}</td></tr>`;
        }).join('');

        // Blank rows keep every page the same height, so the footer never moves.
        const blanks = Math.max(capacity - used, 0);
        const fillRows = Array.from({ length: blanks }, (_, i) =>
            `<tr class="fill${i === blanks - 1 ? ' last' : ''}" style="height:${ROW_HEIGHT_PX}px"><td>&nbsp;</td><td></td><td></td><td></td><td></td></tr>`
        ).join('');

        const tfoot = isLast ? `
    <tfoot><tr>
      <td colspan="2" class="c">Total</td><td class="c">${totalQty}</td><td></td><td class="r">${fmt(itemsTotal)}</td>
    </tr></tfoot>` : '';

        const totalsBlock = isLast ? `
    <div class="totals-row">
      <div class="words"><b>Amount Chargeable (in words)</b>${esc(amountWords)}</div>
      <table class="summary">
        <tr><td>Subtotal</td><td class="r">${fmt(subTotal)}</td></tr>
        ${billDiscount > 0 ? `<tr><td>${esc(discountLabel)}</td><td class="r">-${fmt(discountValue)}</td></tr>` : ''}
        ${couponDiscount > 0 ? `<tr><td>Coupon${couponCode ? ` (${esc(couponCode)})` : ''}</td><td class="r">-${fmt(couponDiscount)}</td></tr>` : ''}
        ${referralDiscount > 0 ? `<tr><td>Referral Discount</td><td class="r">-${fmt(referralDiscount)}</td></tr>` : ''}
        ${showTax ? `<tr><td>CGST @ ${cgstRate}%</td><td class="r">${fmt(cgst)}</td></tr>
        <tr><td>SGST @ ${sgstRate}%</td><td class="r">${fmt(sgst)}</td></tr>` : ''}
        ${walletUsed > 0 ? `<tr><td>Wallet Used</td><td class="r">-${fmt(walletUsed)}</td></tr>` : ''}
        ${amountDue > 0 && settled > 0 ? `<tr><td>Paid</td><td class="r">${fmt(settled)}</td></tr>` : ''}
        <tr class="final${amountDue > 0 ? ' due' : ''}"><td>${grandLabel}</td><td class="r">${fmt(grand)}</td></tr>
      </table>
    </div>` : '';

        return `
<div class="page">
  ${header}
  <div class="title-row"><div class="title">Tax Invoice</div><div class="pageno">Page ${pi + 1} of ${totalPages}</div></div>
  ${infoBoxes}
  <div class="content">
    <table class="items">${tableHead}
      <tbody>${rows}${fillRows}</tbody>${tfoot}
    </table>
    ${totalsBlock}
  </div>
  ${footer}
</div>`;
    }).join('');

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Invoice ${esc(invoice.invoiceNumber ?? '')}</title>
<style>${css(pageWidth, pageHeight, screenPreview)}</style>
</head>
<body>${pageHtml}
</body>
</html>`;
}

// UPI deep-link used for the QR. Amount is only embedded when something is due.
export function buildUpiString(amountDue = 0) {
    const am = safeNum(amountDue);
    return `upi://pay?pa=${encodeURIComponent(UPI_ID)}&pn=${encodeURIComponent(COMPANY.name)}${am > 0 ? `&am=${am.toFixed(2)}` : ''}&cu=INR`;
}

// Amount still to be collected for an invoice (0 when paid). Used for the QR.
export function getAmountDue(invoice = {}, order = {}) {
    const t = invoice?.total ?? {};
    const pd = invoice?.paymentDetails ?? {};
    const isPaid = [invoice.status, invoice.paymentStatus, order?.paymentStatus, pd.status]
        .some((s) => String(s ?? '').toLowerCase() === 'paid');
    if (isPaid) return 0;
    const payable = safeNum(t.finalPayable ?? t.total);
    const settled = safeNum(t.totalAmountPaid ?? pd.totalSettled ?? pd.amountPaid);
    return Math.max(payable - settled, 0);
}

// Number of pages the invoice will take (used by the web preview to size its frame).
export function getPageCount(invoice = {}) {
    const items = [
        ...(invoice.serviceProvided || []).map((s) => ({ name: s.serviceName })),
        ...(invoice.partsUsed || []).map((p) => ({ name: p.partName })),
    ];
    return paginateItems(items).length;
}

/**
 * Turns a raw order document (as returned by the orders API) into the invoice
 * shape buildInvoiceHTML() expects. Invoices that already have the right shape
 * (mobile order-invoice, manual invoices) can be passed straight through.
 */
export function invoiceFromOrder(order) {
    if (!order) return null;
    const businessDetails = order.businessDetails || order.gstInvoice?.businessDetails;
    const idStr = typeof order._id === 'object' ? order._id?.$oid : order._id;
    return {
        ...order,
        invoiceNumber: order.invoiceNumber || order.invoiceNo || order.orderId || idStr,
        invoiceDate: order.invoiceDate || order.updatedAt || order.createdAt,
        status: order.paymentStatus === 'paid' ? 'paid' : String(order.status || 'draft').toLowerCase(),
        customerDetails: order.customerDetails || {
            name: order.name,
            email: order.email,
            contactNo: order.contactNo,
            address: order.address,
            city: order.city,
        },
        vehicleDetails: order.vehicleDetails || {
            brand: order.selectedBrand,
            model: order.selectedModel,
            modelName: order.modelName,
            cc: order.cc,
            bs: order.bs,
        },
        businessDetails,
        serviceProvided: order.serviceProvided || [],
        partsUsed: order.partsUsed || [],
        paymentDetails: order.paymentDetails || {
            method: order.paymentMethod,
            amountPaid: order.amountPaid,
        },
    };
}
