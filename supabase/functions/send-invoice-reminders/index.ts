// Edge function: send-invoice-reminders
// Kjøres automatisk kl 08:00 hver dag via pg_cron (se migration_v9.sql)
// Deploy: supabase functions deploy send-invoice-reminders
// Secrets:
//   supabase secrets set RESEND_API_KEY=re_xxxxxxxx
//   supabase secrets set SUPABASE_URL=https://xxx.supabase.co
//   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJxxx
//   supabase secrets set APP_URL=https://efero.app

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/** Dager til/fra forfallsdato. Negativt = forfalt. */
function daysDiff(dueDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate + 'T00:00:00');
  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}

function fmtDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('nb-NO', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

function fmtAmount(amount: number): string {
  return new Intl.NumberFormat('nb-NO', { minimumFractionDigits: 0 }).format(amount) + ' kr';
}

// ── E-postmaler ──────────────────────────────────────────────────────────────

const baseStyle = `
  body{font-family:Arial,sans-serif;color:#1F2937;background:#F5F7FA;padding:0;margin:0}
  .wrap{max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)}
  .body{padding:32px}
  .p{font-size:15px;line-height:1.6;margin:0 0 16px}
  .box{border-radius:12px;padding:20px;text-align:center;margin:24px 0}
  .box-lbl{font-size:12px;margin-bottom:4px}
  .box-val{font-size:30px;font-weight:700}
  .btn{display:block;color:#fff;text-align:center;padding:15px 24px;border-radius:10px;font-size:15px;font-weight:600;text-decoration:none;margin:24px 0}
  .ftr{background:#F8FAFC;padding:16px 32px;text-align:center;font-size:12px;color:#94A3B8;border-top:1px solid #E2E8F0}
`;

function wrapEmail(hdrBg: string, companyName: string, body: string, invoiceNumber: string): string {
  return `<!DOCTYPE html><html lang="no"><head><meta charset="utf-8"/>
<style>${baseStyle}</style></head><body>
<div class="wrap">
  <div style="background:${hdrBg};padding:28px 32px">
    <h1 style="color:#fff;font-size:20px;margin:0">${companyName}</h1>
  </div>
  <div class="body">${body}</div>
  <div class="ftr">Generert av Efero &middot; ${invoiceNumber}</div>
</div></body></html>`;
}

function reminderEmail(inv: any, company: any): string {
  const body = `
    <p class="p">Hei ${inv.customer_name},</p>
    <p class="p">Dette er en vennlig påminnelse om at faktura <strong>${inv.invoice_number}</strong>
    fra <strong>${company.name}</strong> forfaller <strong>${fmtDate(inv.due_date)}</strong>.</p>
    <div class="box" style="background:#EEF4FF">
      <div class="box-lbl" style="color:#3B4D6B">Beløp inkl. MVA</div>
      <div class="box-val" style="color:#2563FF">${fmtAmount(Number(inv.total))}</div>
    </div>
    ${company.account_number ? `<p class="p" style="font-size:13px;color:#64748B">Kontonummer: <strong>${company.account_number}</strong></p>` : ''}
    <a href="${inv._appUrl}" class="btn" style="background:#2563FF">Se faktura →</a>`;
  return wrapEmail('#0A1B33', company.name, body, inv.invoice_number);
}

function dueTodayEmail(inv: any, company: any): string {
  const body = `
    <p class="p">Hei ${inv.customer_name},</p>
    <p class="p">Faktura <strong>${inv.invoice_number}</strong> på
    <strong>${fmtAmount(Number(inv.total))}</strong> forfaller <strong>i dag</strong>.</p>
    <div class="box" style="background:#FEF3C7">
      <div class="box-lbl" style="color:#92400E">Totalt inkl. MVA</div>
      <div class="box-val" style="color:#C2410C">${fmtAmount(Number(inv.total))}</div>
    </div>
    ${company.account_number ? `<p class="p" style="font-size:13px;color:#64748B">Kontonummer: <strong>${company.account_number}</strong></p>` : ''}
    <a href="${inv._appUrl}" class="btn" style="background:#2563FF">Betal nå →</a>`;
  return wrapEmail('#0A1B33', company.name, body, inv.invoice_number);
}

// MERK: De automatiske kunde-e-postene ved FORFALT (overdue_1day/overdue_7days) er
// fjernet — purringer er nå manuelle (se send-payment-reminder). Når en faktura blir
// forfalt varsler vi i stedet håndverkeren in-app ('purring_needed'), som selv
// sender betalingspåminnelse. De før-forfall-automatiske (reminder_3days/due_today)
// beholdes uendret.

// ── Hoved-handler ────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  const appUrl = Deno.env.get('APP_URL') ?? 'https://efero.app';
  const resendKey = Deno.env.get('RESEND_API_KEY')!;

  const results: { sent: number; skipped: number; errors: string[] } = {
    sent: 0, skipped: 0, errors: [],
  };

  try {
    const { data: invoices, error: invErr } = await supabase
      .from('invoices')
      .select('*, company:companies(*)')
      .in('status', ['sent', 'overdue']);

    if (invErr) throw new Error(`Faktura-feil: ${invErr.message}`);
    if (!invoices?.length) {
      return new Response(JSON.stringify({ ok: true, ...results }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    for (const invoice of invoices) {
      const company = invoice.company;
      if (!company) { results.skipped++; continue; }

      const days = daysDiff(invoice.due_date);

      // ── FØR forfall: automatiske kunde-påminnelser (uendret) ────────────────
      if (days === 3 || days === 0) {
        const notifType: 'reminder_3days' | 'due_today' = days === 3 ? 'reminder_3days' : 'due_today';
        const settingCol = days === 3 ? 'notify_reminder_3days' : 'notify_due_today';
        if (company[settingCol] === false) { results.skipped++; continue; }

        const { data: existing } = await supabase
          .from('invoice_notifications')
          .select('id').eq('invoice_id', invoice.id).eq('type', notifType).maybeSingle();
        if (existing) { results.skipped++; continue; }

        const customerEmail: string | null = invoice.customer_email ?? null;
        if (!customerEmail) { results.skipped++; continue; }

        invoice._appUrl = `${appUrl}/faktura/${invoice.id}`;
        const html = days === 3 ? reminderEmail(invoice, company) : dueTodayEmail(invoice, company);
        const subject = days === 3
          ? `Påminnelse: Faktura ${invoice.invoice_number} forfaller om 3 dager`
          : `Faktura ${invoice.invoice_number} forfaller i dag`;

        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${resendKey}` },
          body: JSON.stringify({
            from: `${company.name} via Efero <faktura@efero.no>`,
            to: [customerEmail],
            subject,
            html,
          }),
        });
        if (!emailRes.ok) {
          results.errors.push(`${invoice.invoice_number}: ${await emailRes.text()}`);
          continue;
        }
        await supabase.from('invoice_notifications').insert({
          invoice_id: invoice.id, company_id: invoice.company_id,
          type: notifType, email_sent_to: customerEmail,
        });
        results.sent++;
        continue;
      }

      // ── FORFALT: ingen automatisk kunde-e-post. Varsle håndverkeren i appen ──
      //    om at en MANUELL purring kan sendes (send-payment-reminder).
      if (days === -1 || days === -7) {
        if (invoice.status === 'paid') { results.skipped++; continue; }

        // 1 dag forfalt → marker status som 'overdue' (beholdt fra før)
        if (days === -1 && invoice.status !== 'overdue') {
          await supabase.from('invoices').update({ status: 'overdue' }).eq('id', invoice.id);
        }

        // 7-dagers oppfølging kun hvis ingen manuell purring er sendt ennå
        if (days === -7 && (invoice.reminder_count ?? 0) > 0) { results.skipped++; continue; }

        const dedupeType = days === -1 ? 'purring_needed_1day' : 'purring_needed_7days';
        const { data: existing } = await supabase
          .from('invoice_notifications')
          .select('id').eq('invoice_id', invoice.id).eq('type', dedupeType).maybeSingle();
        if (existing) { results.skipped++; continue; }

        const message = days === -1
          ? `Faktura ${invoice.invoice_number} til ${invoice.customer_name} er forfalt — send purring?`
          : `Faktura ${invoice.invoice_number} til ${invoice.customer_name} er 7 dager forfalt — send purring?`;

        await supabase.from('app_notifications').insert({
          company_id: invoice.company_id,
          invoice_id: invoice.id,
          type:       'purring_needed',
          message,
        });
        // Dedupe-logg så admin-varselet kun opprettes én gang
        await supabase.from('invoice_notifications').insert({
          invoice_id: invoice.id, company_id: invoice.company_id, type: dedupeType,
        });
        results.sent++;
        continue;
      }

      results.skipped++;
    }

    return new Response(JSON.stringify({ ok: true, ...results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message, ...results }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
