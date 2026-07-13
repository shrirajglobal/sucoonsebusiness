/**
 * Universal CSV & PDF Export Utilities
 */

// ==================== CSV Export ====================
export function exportCSV(filename: string, headers: string[], rows: (string | number | null | undefined)[][]) {
  const escape = (val: any) => {
    const s = String(val ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n');
  downloadFile(filename + '.csv', csv, 'text/csv;charset=utf-8;');
}

// ==================== PDF Export (HTML-based) ====================
export function exportPDF(title: string, headers: string[], rows: (string | number | null | undefined)[][]) {
  const tableRows = rows
    .map(
      (r) =>
        `<tr>${r.map((c) => `<td style="border:1px solid #ddd;padding:6px 10px;font-size:11px;">${c ?? ''}</td>`).join('')}</tr>`
    )
    .join('');

  const html = `<!DOCTYPE html><html><head><title>${title}</title>
<style>
  body{font-family:system-ui,sans-serif;margin:30px;color:#222}
  h1{font-size:18px;margin-bottom:4px}
  p{font-size:11px;color:#666;margin-bottom:16px}
  table{border-collapse:collapse;width:100%}
  th{border:1px solid #999;padding:6px 10px;font-size:11px;background:#f5f5f5;text-align:left}
  @media print{body{margin:10px}button{display:none}}
</style></head><body>
<h1>${title}</h1>
<p>Generated on ${new Date().toLocaleDateString('en-IN', { dateStyle: 'long' })} • ${rows.length} records</p>
<button onclick="window.print()" style="margin-bottom:12px;padding:6px 16px;cursor:pointer;border:1px solid #ccc;border-radius:4px;background:#fff;">🖨️ Print / Save PDF</button>
<table>
<thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
<tbody>${tableRows}</tbody>
</table></body></html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob(['\ufeff' + content], { type: mimeType });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

// ==================== Module-specific helpers ====================
export function exportTasksCSV(tasks: any[]) {
  exportCSV('tasks', ['Title', 'Status', 'Priority', 'Type', 'Due Date', 'Assigned To', 'Created'],
    tasks.map((t) => [t.title, t.status, t.priority, t.task_type, t.due_date, t.assigned_to || '', t.created_at?.split('T')[0]]));
}

export function exportLeadsCSV(leads: any[]) {
  exportCSV('leads', ['Name', 'Company', 'Phone', 'Email', 'Stage', 'Value', 'Source', 'City', 'Created'],
    leads.map((l) => [l.name, l.company, l.phone, l.email, l.stage, l.value, l.source, l.city, l.created_at?.split('T')[0]]));
}

export function exportCustomersCSV(customers: any[]) {
  exportCSV('customers', ['Name', 'Company', 'Phone', 'Email', 'Tier', 'Lifetime Value', 'Last Contact', 'Next Contact'],
    customers.map((c) => [c.name, c.company, c.phone, c.email, c.tier, c.lifetime_value, c.last_contact_date?.split('T')[0], c.next_contact_date]));
}

export function exportContactsCSV(contacts: any[]) {
  exportCSV('contacts', ['Name', 'Company', 'Designation', 'Phone', 'Email', 'Source', 'Created'],
    contacts.map((c) => [c.name, c.company, c.designation, c.phone, c.email, c.source, c.created_at?.split('T')[0]]));
}

export function exportAttendanceCSV(records: any[]) {
  exportCSV('attendance', ['Name', 'Date', 'Status', 'Punch In', 'Punch Out'],
    records.map((r) => [r.user_name, r.date, r.status, r.punch_in, r.punch_out]));
}

export function exportTransactionsCSV(txns: any[]) {
  exportCSV('transactions', ['Date', 'Type', 'Category', 'Amount', 'Description', 'Payment Method', 'Reference'],
    txns.map((t) => [t.date, t.type, t.category, t.amount, t.description, t.payment_method, t.reference_no]));
}

export function exportInventoryCSV(items: any[]) {
  exportCSV('inventory', ['Name', 'SKU', 'Category', 'Qty', 'Unit', 'Cost Price', 'Sell Price', 'Min Stock'],
    items.map((i) => [i.name, i.sku, i.category, i.quantity, i.unit, i.cost_price, i.sell_price, i.min_stock]));
}

export function exportVendorsCSV(vendors: any[]) {
  exportCSV('vendors', ['Name', 'Company', 'Phone', 'Email', 'GST', 'Address'],
    vendors.map((v) => [v.name, v.company, v.phone, v.email, v.gst_number, v.address]));
}

export function exportPartnerBillsCSV(bills: any[], partnerLabel: string) {
  exportCSV('bill_register',
    ['Client', partnerLabel, 'Bill Date', 'Due Date', 'LR Number', 'Payment Terms', 'Amount', 'Discount', 'Net Amount', 'Dispatch Status', 'Payment Status'],
    bills.map((b) => [
      b.client_name, b.vendor_name, b.order_date, b.due_date || '', b.lr_number || '', b.payment_terms || '',
      b.amount, b.discount_amount || 0, Number(b.amount) - Number(b.discount_amount || 0),
      b.dispatch_status, b.client_payment_status,
    ]));
}

export function exportPartnerBillsPDF(bills: any[], partnerLabel: string) {
  exportPDF('Bill Register', ['Client', partnerLabel, 'Bill Date', 'Due Date', 'LR Number', 'Amount', 'Discount', 'Net Amount'],
    bills.map((b) => [
      b.client_name, b.vendor_name, b.order_date, b.due_date || '—', b.lr_number || '—',
      `₹${Number(b.amount).toLocaleString('en-IN')}`,
      Number(b.discount_amount) > 0 ? `₹${Number(b.discount_amount).toLocaleString('en-IN')}` : '—',
      `₹${(Number(b.amount) - Number(b.discount_amount || 0)).toLocaleString('en-IN')}`,
    ]));
}

export function exportReceivablesCSV(txns: any[]) {
  exportCSV('commission_receivables',
    ['Client', 'Vendor', 'Bill Date', 'Bill Amount', 'Commission', 'Status', 'Receivable Since', 'Days Aging'],
    txns.map((t) => [
      t.client_name || '',
      t.vendor_name || '',
      t.order_date || '',
      t.order_amount || '',
      t.commission_amount,
      t.status,
      t.receivable_since?.split('T')[0] || '',
      t.aging_days ?? '',
    ]));
}

// PDF versions
export function exportTasksPDF(tasks: any[]) {
  exportPDF('Tasks Report', ['Title', 'Status', 'Priority', 'Type', 'Due Date'],
    tasks.map((t) => [t.title, t.status, t.priority, t.task_type, t.due_date]));
}

export function exportLeadsPDF(leads: any[]) {
  exportPDF('Leads Report', ['Name', 'Company', 'Stage', 'Value', 'Source'],
    leads.map((l) => [l.name, l.company, l.stage, l.value ? `₹${Number(l.value).toLocaleString('en-IN')}` : '', l.source]));
}

export function exportCustomersPDF(customers: any[]) {
  exportPDF('Customers Report', ['Name', 'Company', 'Tier', 'Lifetime Value', 'Last Contact'],
    customers.map((c) => [c.name, c.company, c.tier, c.lifetime_value ? `₹${Number(c.lifetime_value).toLocaleString('en-IN')}` : '', c.last_contact_date?.split('T')[0] || 'Never']));
}
