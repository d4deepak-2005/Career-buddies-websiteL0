export const GST_PERCENT = 18;

export function withGstPaise(basePaise: number) {
  const safe = Number.isFinite(basePaise) && basePaise > 0 ? Math.round(basePaise) : 0;
  const gstPaise = Math.round(safe * (GST_PERCENT / 100));
  return { basePaise: safe, gstPaise, totalPaise: safe + gstPaise, gstPercent: GST_PERCENT };
}
