export const GST_PERCENT = 18;

export function withGstRupees(baseRupees: number) {
  const basePaise = Number.isFinite(baseRupees) && baseRupees > 0 ? Math.round(baseRupees * 100) : 0;
  const gstPaise = Math.round(basePaise * (GST_PERCENT / 100));
  const totalPaise = basePaise + gstPaise;
  return {
    base: basePaise / 100,
    gst: gstPaise / 100,
    total: totalPaise / 100,
    gstPercent: GST_PERCENT,
  };
}

export function formatINR(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount);
}
