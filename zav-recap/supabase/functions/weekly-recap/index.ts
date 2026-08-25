import { createClient } from 'npm:@supabase/supabase-js@2';

type BusinessRow = {
  id: string;
  name: string;
  recap_email: string;
};

type SaleRow = {
  id: string;
  total_amount: number | string;
  sold_at: string;
};

type SaleItemRow = {
  sale_id: string;
  menu_id: string;
  quantity: number | string;
  unit_price: number | string;
};

const JAKARTA_TIME_ZONE = 'Asia/Jakarta';
const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;

function requireEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Secret ${name} belum diatur.`);
  return value;
}

function getAdminKey() {
  const currentKeys = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (currentKeys) {
    const parsed = JSON.parse(currentKeys) as Record<string, string>;
    if (parsed.default) return parsed.default;
  }

  return requireEnv('SUPABASE_SERVICE_ROLE_KEY');
}

function jakartaParts(date: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: JAKARTA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
  };
}

function dateKeyFromStamp(localDateStamp: number) {
  const date = new Date(localDateStamp);
  return [
    String(date.getUTCFullYear()).padStart(4, '0'),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

function jakartaDateKey(date: Date) {
  const parts = jakartaParts(date);
  return [
    String(parts.year).padStart(4, '0'),
    String(parts.month).padStart(2, '0'),
    String(parts.day).padStart(2, '0'),
  ].join('-');
}

function getWeeklyPeriod(now: Date) {
  const local = jakartaParts(now);
  const localTodayStamp = Date.UTC(local.year, local.month - 1, local.day);
  const weekday = new Date(localTodayStamp).getUTCDay();
  const daysSinceSaturday = (weekday + 1) % 7;
  const startLocalStamp = localTodayStamp - daysSinceSaturday * 86_400_000;
  const startUtc = new Date(startLocalStamp - JAKARTA_OFFSET_MS);

  return {
    startUtc,
    endUtc: now,
    startLocalStamp,
    endLocalStamp: localTodayStamp,
    periodKey: dateKeyFromStamp(startLocalStamp),
  };
}

function formatRupiah(value: number) {
  return 'Rp' + new Intl.NumberFormat('id-ID').format(Math.round(value));
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: JAKARTA_TIME_ZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: JAKARTA_TIME_ZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function resultLabel(value: number) {
  return `${value < 0 ? '- ' : '+ '}${formatRupiah(Math.abs(value))}`;
}

function emailTemplate(input: {
  businessName: string;
  periodLabel: string;
  generatedAt: string;
  capital: number;
  weeklyRevenue: number;
  cumulativeRevenue: number;
  cumulativeResult: number;
  totalOrders: number;
  totalItems: number;
  peakHour: number | null;
  products: Array<{ name: string; quantity: number; revenue: number }>;
  dailyRows: Array<{ label: string; orders: number; items: number; revenue: number }>;
}) {
  const productRows = input.products.length
    ? input.products
        .map(
          (product) => `
            <tr>
              <td style="padding:10px 8px;border-bottom:1px solid #30263d;color:#ede7f5">${escapeHtml(product.name)}</td>
              <td style="padding:10px 8px;border-bottom:1px solid #30263d;text-align:center;color:#c4b5d4">${product.quantity}</td>
              <td style="padding:10px 8px;border-bottom:1px solid #30263d;text-align:right;color:#ede7f5">${formatRupiah(product.revenue)}</td>
            </tr>`
        )
        .join('')
    : '<tr><td colspan="3" style="padding:18px 8px;text-align:center;color:#8f849b">Belum ada produk terjual.</td></tr>';

  const dailyRows = input.dailyRows
    .map(
      (day) => `
        <tr>
          <td style="padding:9px 8px;border-bottom:1px solid #30263d;color:#c4b5d4">${escapeHtml(day.label)}</td>
          <td style="padding:9px 8px;border-bottom:1px solid #30263d;text-align:center;color:#a99fb4">${day.orders}</td>
          <td style="padding:9px 8px;border-bottom:1px solid #30263d;text-align:center;color:#a99fb4">${day.items}</td>
          <td style="padding:9px 8px;border-bottom:1px solid #30263d;text-align:right;color:#ede7f5">${formatRupiah(day.revenue)}</td>
        </tr>`
    )
    .join('');

  return `<!doctype html>
  <html lang="id">
    <body style="margin:0;background:#09070f;font-family:Arial,sans-serif;color:#ffffff">
      <div style="max-width:680px;margin:0 auto;padding:28px 16px">
        <div style="background:#15111d;border:1px solid #30263d;border-radius:20px;overflow:hidden">
          <div style="background:linear-gradient(135deg,#6d28d9,#7c3aed);padding:28px">
            <div style="font-size:12px;font-weight:700;letter-spacing:1px;color:#e6d8ff">ZAV RECAP</div>
            <h1 style="margin:10px 0 5px;font-size:26px">Recap mingguan ${escapeHtml(input.businessName)}</h1>
            <div style="color:#e6d8ff;font-size:13px">${escapeHtml(input.periodLabel)}</div>
          </div>

          <div style="padding:22px">
            <table role="presentation" width="100%" cellspacing="8" style="table-layout:fixed">
              <tr>
                <td style="background:#21172e;border-radius:14px;padding:16px;vertical-align:top">
                  <div style="color:#9f93aa;font-size:10px;font-weight:700">OMZET MINGGU INI</div>
                  <div style="margin-top:8px;font-size:22px;font-weight:800">${formatRupiah(input.weeklyRevenue)}</div>
                </td>
                <td style="background:#21172e;border-radius:14px;padding:16px;vertical-align:top">
                  <div style="color:#9f93aa;font-size:10px;font-weight:700">TOTAL MODAL TERCATAT</div>
                  <div style="margin-top:8px;font-size:22px;font-weight:800">${formatRupiah(input.capital)}</div>
                </td>
              </tr>
              <tr>
                <td style="background:#21172e;border-radius:14px;padding:16px;vertical-align:top">
                  <div style="color:#9f93aa;font-size:10px;font-weight:700">ORDER / PRODUK</div>
                  <div style="margin-top:8px;font-size:18px;font-weight:800">${input.totalOrders} order · ${input.totalItems} produk</div>
                </td>
                <td style="background:#21172e;border-radius:14px;padding:16px;vertical-align:top">
                  <div style="color:#9f93aa;font-size:10px;font-weight:700">JAM TERAMAI</div>
                  <div style="margin-top:8px;font-size:18px;font-weight:800">${input.peakHour === null ? '—' : String(input.peakHour).padStart(2, '0') + '.00 WIB'}</div>
                </td>
              </tr>
            </table>

            <div style="margin:14px 4px 22px;background:#100d16;border:1px solid #30263d;border-radius:14px;padding:17px">
              <div style="color:#9f93aa;font-size:10px;font-weight:700">HASIL USAHA SEMENTARA</div>
              <div style="margin-top:8px;font-size:23px;font-weight:800;color:${input.cumulativeResult < 0 ? '#f59e9e' : '#71d6a6'}">${resultLabel(input.cumulativeResult)}</div>
              <div style="margin-top:5px;color:#766d80;font-size:11px">Total omzet sepanjang waktu (${formatRupiah(input.cumulativeRevenue)}) dikurangi total modal tercatat.</div>
            </div>

            <h2 style="font-size:17px;margin:0 4px 10px">Produk terjual</h2>
            <table width="100%" cellspacing="0" style="border-collapse:collapse;background:#100d16;border-radius:12px;overflow:hidden;font-size:12px">
              <thead><tr>
                <th style="padding:10px 8px;text-align:left;color:#9f93aa">Produk</th>
                <th style="padding:10px 8px;text-align:center;color:#9f93aa">Jumlah</th>
                <th style="padding:10px 8px;text-align:right;color:#9f93aa">Omzet</th>
              </tr></thead>
              <tbody>${productRows}</tbody>
            </table>

            <h2 style="font-size:17px;margin:24px 4px 10px">Penjualan per hari</h2>
            <table width="100%" cellspacing="0" style="border-collapse:collapse;background:#100d16;border-radius:12px;overflow:hidden;font-size:12px">
              <thead><tr>
                <th style="padding:10px 8px;text-align:left;color:#9f93aa">Hari</th>
                <th style="padding:10px 8px;text-align:center;color:#9f93aa">Order</th>
                <th style="padding:10px 8px;text-align:center;color:#9f93aa">Produk</th>
                <th style="padding:10px 8px;text-align:right;color:#9f93aa">Omzet</th>
              </tr></thead>
              <tbody>${dailyRows}</tbody>
            </table>

            <div style="margin:24px 4px 2px;color:#766d80;font-size:11px;line-height:17px">
              Dibuat otomatis ${escapeHtml(input.generatedAt)}. Transaksi yang dibatalkan tidak masuk dalam recap.
            </div>
          </div>
        </div>
      </div>
    </body>
  </html>`;
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const cronSecret = requireEnv('CRON_SECRET');
    if (request.headers.get('x-cron-secret') !== cronSecret) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await request.json().catch(() => ({}));
    const testMode = payload?.test === true;
    const selectedBusinessId =
      typeof payload?.business_id === 'string' ? payload.business_id : null;

    const supabase = createClient(requireEnv('SUPABASE_URL'), getAdminKey(), {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let businessQuery = supabase
      .from('businesses')
      .select('id, name, recap_email')
      .not('recap_email', 'is', null);

    if (selectedBusinessId) {
      businessQuery = businessQuery.eq('id', selectedBusinessId);
    }

    const { data: businesses, error: businessError } = await businessQuery;
    if (businessError) throw businessError;

    const now = new Date();
    const period = getWeeklyPeriod(now);
    const senderEmail = Deno.env.get('BREVO_SENDER_EMAIL') ?? 'ssby3950@gmail.com';
    const senderName = Deno.env.get('BREVO_SENDER_NAME') ?? 'Zav Recap';
    const replyTo = Deno.env.get('BREVO_REPLY_TO') ?? senderEmail;
    const brevoApiKey = requireEnv('BREVO_API_KEY');
    const results: Array<Record<string, unknown>> = [];

    for (const business of (businesses ?? []) as BusinessRow[]) {
      try {
        if (!testMode) {
          const { data: existing, error: existingError } = await supabase
            .from('weekly_recap_deliveries')
            .select('status')
            .eq('business_id', business.id)
            .eq('period_start', period.periodKey)
            .maybeSingle();

          if (existingError) throw existingError;
          if (existing?.status === 'sent') {
            results.push({ business_id: business.id, status: 'skipped_already_sent' });
            continue;
          }
        }

        const [capitalResult, allSalesResult, weeklySalesResult] = await Promise.all([
          supabase.from('capital_entries').select('amount').eq('business_id', business.id),
          supabase.from('sales').select('total_amount').eq('business_id', business.id),
          supabase
            .from('sales')
            .select('id, total_amount, sold_at')
            .eq('business_id', business.id)
            .gte('sold_at', period.startUtc.toISOString())
            .lte('sold_at', period.endUtc.toISOString())
            .order('sold_at', { ascending: true }),
        ]);

        if (capitalResult.error) throw capitalResult.error;
        if (allSalesResult.error) throw allSalesResult.error;
        if (weeklySalesResult.error) throw weeklySalesResult.error;

        const weeklySales = (weeklySalesResult.data ?? []) as SaleRow[];
        const saleIds = weeklySales.map((sale) => sale.id);
        let saleItems: SaleItemRow[] = [];

        if (saleIds.length) {
          const { data, error } = await supabase
            .from('sale_items')
            .select('sale_id, menu_id, quantity, unit_price')
            .in('sale_id', saleIds);
          if (error) throw error;
          saleItems = (data ?? []) as SaleItemRow[];
        }

        const menuIds = [...new Set(saleItems.map((item) => item.menu_id))];
        const menuNames = new Map<string, string>();
        if (menuIds.length) {
          const { data, error } = await supabase
            .from('menus')
            .select('id, name')
            .in('id', menuIds);
          if (error) throw error;
          (data ?? []).forEach((menu) => menuNames.set(menu.id, menu.name));
        }

        const itemCountBySale = new Map<string, number>();
        const products = new Map<string, { name: string; quantity: number; revenue: number }>();
        saleItems.forEach((item) => {
          const quantity = Number(item.quantity);
          const revenue = quantity * Number(item.unit_price);
          itemCountBySale.set(item.sale_id, (itemCountBySale.get(item.sale_id) ?? 0) + quantity);
          const current = products.get(item.menu_id) ?? {
            name: menuNames.get(item.menu_id) ?? 'Menu dihapus',
            quantity: 0,
            revenue: 0,
          };
          current.quantity += quantity;
          current.revenue += revenue;
          products.set(item.menu_id, current);
        });

        const daily = new Map<string, { orders: number; items: number; revenue: number }>();
        for (
          let stamp = period.startLocalStamp;
          stamp <= period.endLocalStamp;
          stamp += 86_400_000
        ) {
          daily.set(dateKeyFromStamp(stamp), { orders: 0, items: 0, revenue: 0 });
        }

        const hourlyRevenue = new Map<number, number>();
        weeklySales.forEach((sale) => {
          const date = new Date(sale.sold_at);
          const dateKey = jakartaDateKey(date);
          const day = daily.get(dateKey) ?? { orders: 0, items: 0, revenue: 0 };
          day.orders += 1;
          day.items += itemCountBySale.get(sale.id) ?? 0;
          day.revenue += Number(sale.total_amount);
          daily.set(dateKey, day);

          const hour = jakartaParts(date).hour;
          hourlyRevenue.set(hour, (hourlyRevenue.get(hour) ?? 0) + Number(sale.total_amount));
        });

        const peakEntry = [...hourlyRevenue.entries()].sort((a, b) => b[1] - a[1])[0];
        const capital = (capitalResult.data ?? []).reduce(
          (sum, entry) => sum + Number(entry.amount),
          0
        );
        const cumulativeRevenue = (allSalesResult.data ?? []).reduce(
          (sum, sale) => sum + Number(sale.total_amount),
          0
        );
        const weeklyRevenue = weeklySales.reduce(
          (sum, sale) => sum + Number(sale.total_amount),
          0
        );
        const totalItems = saleItems.reduce(
          (sum, item) => sum + Number(item.quantity),
          0
        );

        const dailyRows = [...daily.entries()].map(([dateKey, value]) => {
          const [year, month, day] = dateKey.split('-').map(Number);
          const localMiddayUtc = new Date(Date.UTC(year, month - 1, day, 5));
          return {
            label: new Intl.DateTimeFormat('id-ID', {
              timeZone: JAKARTA_TIME_ZONE,
              weekday: 'short',
              day: '2-digit',
              month: 'short',
            }).format(localMiddayUtc),
            ...value,
          };
        });

        const periodLabel = `${formatDate(period.startUtc)} – ${formatDateTime(period.endUtc)} WIB`;
        const htmlContent = emailTemplate({
          businessName: business.name,
          periodLabel,
          generatedAt: `${formatDateTime(now)} WIB`,
          capital,
          weeklyRevenue,
          cumulativeRevenue,
          cumulativeResult: cumulativeRevenue - capital,
          totalOrders: weeklySales.length,
          totalItems,
          peakHour: peakEntry?.[0] ?? null,
          products: [...products.values()].sort((a, b) => b.quantity - a.quantity),
          dailyRows,
        });

        if (!testMode) {
          const { error } = await supabase.from('weekly_recap_deliveries').upsert(
            {
              business_id: business.id,
              period_start: period.periodKey,
              period_end: period.endUtc.toISOString(),
              recipient: business.recap_email,
              status: 'processing',
              error_message: null,
            },
            { onConflict: 'business_id,period_start' }
          );
          if (error) throw error;
        }

        const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            accept: 'application/json',
            'api-key': brevoApiKey,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            sender: { email: senderEmail, name: senderName },
            to: [{ email: business.recap_email, name: business.name }],
            replyTo: { email: replyTo, name: senderName },
            subject: `${testMode ? '[TEST] ' : ''}Recap Mingguan ${business.name} · ${periodLabel}`,
            htmlContent,
            tags: ['zav-recap', testMode ? 'test' : 'weekly-recap'],
          }),
        });

        const brevoText = await brevoResponse.text();
        const brevoData = brevoText ? JSON.parse(brevoText) : {};
        if (!brevoResponse.ok) {
          throw new Error(brevoData?.message ?? `Brevo gagal (${brevoResponse.status}).`);
        }

        if (!testMode) {
          const { error } = await supabase
            .from('weekly_recap_deliveries')
            .update({
              status: 'sent',
              provider_message_id: brevoData?.messageId ?? null,
              sent_at: new Date().toISOString(),
              error_message: null,
            })
            .eq('business_id', business.id)
            .eq('period_start', period.periodKey);
          if (error) throw error;
        }

        results.push({
          business_id: business.id,
          recipient: business.recap_email,
          status: testMode ? 'test_sent' : 'sent',
          message_id: brevoData?.messageId ?? null,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        if (!testMode) {
          await supabase.from('weekly_recap_deliveries').upsert(
            {
              business_id: business.id,
              period_start: period.periodKey,
              period_end: period.endUtc.toISOString(),
              recipient: business.recap_email,
              status: 'failed',
              error_message: message.slice(0, 1000),
            },
            { onConflict: 'business_id,period_start' }
          );
        }

        results.push({ business_id: business.id, status: 'failed', error: message });
      }
    }

    return Response.json({
      ok: results.every((result) => result.status !== 'failed'),
      test: testMode,
      period_start: period.startUtc.toISOString(),
      period_end: period.endUtc.toISOString(),
      results,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('weekly-recap gagal:', error);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
});
