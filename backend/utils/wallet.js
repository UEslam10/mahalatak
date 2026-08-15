const db = require('../db/database');

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function getRate(key, fallback) {
  const row = db.prepare('SELECT value FROM platform_settings WHERE key = ?').get(key);
  const rate = row ? parseFloat(row.value) : fallback;
  return Number.isFinite(rate) ? rate : fallback;
}

function setRate(key, rate) {
  db.prepare(`
    INSERT INTO platform_settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(key, String(rate));
}

// عمولة المنصة من قيمة المنتجات (نصيب المحل)
const getCommissionRate = () => getRate('commission_rate', 0.1);
const setCommissionRate = (rate) => setRate('commission_rate', rate);

// عمولة المنصة من رسوم التوصيل (نصيب المندوب)
const getCourierCommissionRate = () => getRate('courier_commission_rate', 0.1);
const setCourierCommissionRate = (rate) => setRate('courier_commission_rate', rate);

// يضيف حركة على محفظة مستخدم (تاجر أو مندوب) ويحدّث رصيده
function creditWallet(userId, orderId, type, amount, description) {
  const user = db.prepare('SELECT wallet_balance FROM users WHERE id = ?').get(userId);
  if (!user) return null;
  const newBalance = round2((user.wallet_balance || 0) + amount);
  db.prepare('UPDATE users SET wallet_balance = ? WHERE id = ?').run(newBalance, userId);
  db.prepare(`
    INSERT INTO wallet_transactions (user_id, order_id, type, amount, balance_after, description)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(userId, orderId || null, type, amount, newBalance, description || null);
  return newBalance;
}

/**
 * تسوية الحسابات عند تسليم الطلب فعليًا.
 *
 * في حالة الدفع "عند الاستلام" (COD): المندوب بيحصّل كاش من العميل = إجمالي الطلب بالكامل،
 * ولازم يسلّم المنصة **إجمالي الطلب كامل**، والمنصة هي اللي بتحاسبه بعدين على صافي أجرته.
 *
 * في حالة الدفع الإلكتروني المؤكد (تحويل فودافون كاش/إنستاباي اتأكد استلامه): العميل يكون
 * دفع فلوس الطلب مقدّمًا للمنصة مباشرة، فمفيش كاش في إيد المندوب أصلًا، ومفيش حاجة عليه يسلّمها.
 *
 *   عمولة المنصة من المحل   = قيمة المنتجات × نسبة عمولة المحل
 *   نصيب التاجر             = قيمة المنتجات − عمولة المحل        (مستحق له من المنصة)
 *
 *   عمولة المنصة من التوصيل = رسوم التوصيل × نسبة عمولة التوصيل
 *   صافي أجرة المندوب       = رسوم التوصيل − عمولة التوصيل        (مستحق له من المنصة)
 *
 *   لو الدفع كاش: + المندوب عليه خصم بإجمالي الطلب كامل (كاش استلمه بالنيابة عن المنصة)
 *   لو الدفع إلكتروني ومؤكد: مفيش خصم على المندوب، بياخد صافي أجرته وخلاص
 */
function settleOrderWallets(order) {
  const commissionRate = getCommissionRate();
  const courierRate = getCourierCommissionRate();
  const isPaidElectronically = order.payment_method === 'e_wallet' && order.payment_confirmed === 1;

  const commission = round2(order.items_total * commissionRate);
  const vendorAmount = round2(order.items_total - commission);

  const courierCommission = order.courier_id ? round2(order.delivery_fee * courierRate) : 0;
  const courierAmount = order.courier_id ? round2(order.delivery_fee - courierCommission) : 0;

  db.prepare(`
    UPDATE orders
    SET platform_commission = ?, vendor_amount = ?, courier_amount = ?, courier_commission = ?, delivered_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(commission, vendorAmount, courierAmount, courierCommission, order.id);

  if (order.store_owner_id) {
    creditWallet(order.store_owner_id, order.id, 'order_earning', vendorAmount, `صافي ربح الطلب #${order.id} (بعد خصم عمولة ${Math.round(commissionRate * 100)}%)`);
  }
  if (order.courier_id) {
    creditWallet(order.courier_id, order.id, 'order_earning', courierAmount, `صافي أجرة توصيل الطلب #${order.id} (بعد خصم عمولة ${Math.round(courierRate * 100)}% من رسوم التوصيل)`);
    if (!isPaidElectronically) {
      creditWallet(order.courier_id, order.id, 'cash_collected', -order.total, `كاش محصّل من العميل للطلب #${order.id} (إجمالي الطلب بالكامل، مستحق تسليمه للمنصة)`);
    }
  }

  return { commission, vendorAmount, courierCommission, courierAmount };
}

module.exports = {
  getCommissionRate, setCommissionRate,
  getCourierCommissionRate, setCourierCommissionRate,
  creditWallet, settleOrderWallets, round2,
};
