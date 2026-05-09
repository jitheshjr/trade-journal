// All rates are as of 2025. Sources: zerodha.com/charges, firstock.in/support/charges

const BROKER_CONFIGS = {
  zerodha: {
    name: 'Zerodha Kite',
    intraday: {
      brokerageRate: 0.0003,       // 0.03%
      flatFee: 20,                 // ₹20 per order (whichever is lower)
    },
    delivery: {
      brokerageRate: 0,
      flatFee: 0,
    },
    charges: {
      stt_intraday_sell: 0.00025,  // 0.025% on sell side only
      stt_delivery: 0.001,         // 0.1% on both sides
      exchange_fee_nse: 0.0000345, // NSE transaction charge
      sebi: 0.000001,              // 0.0001%
      stamp_duty_intraday: 0.00003, // 0.003% on buy side
      stamp_duty_delivery: 0.00015, // 0.015% on buy side
      gst: 0.18,
    }
  },
  firstock: {
    name: 'Firstock',
    intraday: {
      brokerageRate: 0.0003,
      flatFee: 20,
    },
    delivery: {
      brokerageRate: 0,
      flatFee: 0,
    },
    charges: {
      stt_intraday_sell: 0.00025,
      stt_delivery: 0.001,
      exchange_fee_nse: 0.0000297, // Firstock NSE rate (slightly lower)
      sebi: 0.000001,
      stamp_duty_intraday: 0.00003,
      stamp_duty_delivery: 0.00015,
      gst: 0.18,
    }
  }
};

/**
 * Calculate all charges for a trade
 * @param {object} trade - { brokerKey, tradeType, direction, quantity, entryPrice, exitPrice }
 * @returns {object} - { grossPnl, brokerage, stt, exchangeFee, sebi, stampDuty, gst, totalCharges, netPnl, breakdown }
 */
export function calculateCharges(trade) {
  const { brokerKey, tradeType, direction, quantity, entryPrice, exitPrice } = trade;

  if (!exitPrice || !entryPrice) return null;

  const config = BROKER_CONFIGS[brokerKey];
  if (!config) throw new Error(`Unknown broker: ${brokerKey}`);

  const isIntraday = tradeType === 'INTRADAY';
  const rateConfig = isIntraday ? config.intraday : config.delivery;
  const c = config.charges;

  const buyValue = entryPrice * quantity;
  const sellValue = exitPrice * quantity;
  const turnover = buyValue + sellValue;

  // Gross P&L
  const grossPnl = direction === 'LONG'
    ? (exitPrice - entryPrice) * quantity
    : (entryPrice - exitPrice) * quantity;

  // Brokerage: flat fee or rate, whichever is lower, per order (buy + sell = 2 orders)
  let brokeragePerOrder = rateConfig.flatFee === 0
    ? 0
    : Math.min(rateConfig.flatFee, turnover / 2 * rateConfig.brokerageRate);
  const brokerage = brokeragePerOrder * 2; // buy order + sell order

  // STT
  let stt = 0;
  if (isIntraday) {
    stt = sellValue * c.stt_intraday_sell; // sell side only
  } else {
    stt = (buyValue + sellValue) * c.stt_delivery; // both sides
  }

  // Exchange transaction charges (NSE)
  const exchangeFee = turnover * c.exchange_fee_nse;

  // SEBI charges
  const sebi = turnover * c.sebi;

  // Stamp duty (buy side only)
  const stampDuty = isIntraday
    ? buyValue * c.stamp_duty_intraday
    : buyValue * c.stamp_duty_delivery;

  // GST on (brokerage + exchange fee + sebi)
  const gst = (brokerage + exchangeFee + sebi) * c.gst;

  const totalCharges = brokerage + stt + exchangeFee + sebi + stampDuty + gst;
  const netPnl = grossPnl - totalCharges;

  return {
    grossPnl: +grossPnl.toFixed(2),
    brokerage: +brokerage.toFixed(2),
    stt: +stt.toFixed(2),
    exchangeFee: +exchangeFee.toFixed(2),
    sebi: +sebi.toFixed(2),
    stampDuty: +stampDuty.toFixed(2),
    gst: +gst.toFixed(2),
    totalCharges: +totalCharges.toFixed(2),
    netPnl: +netPnl.toFixed(2),
    // Store full breakdown in DB as jsonb
    breakdown: {
      brokerage, stt, exchangeFee, sebi, stampDuty, gst, totalCharges
    }
  };
}

export { BROKER_CONFIGS };