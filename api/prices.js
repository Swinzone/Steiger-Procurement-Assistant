// api/prices.js
// Fetches live prices from Newegg for Steiger BOM components using ScraperAPI.
// ScraperAPI bypasses bot detection. Free tier: 5,000 credits to start,
// 1,000/month ongoing. Each Newegg request costs 1 credit.

const SCRAPER_KEY = process.env.SCRAPER_API_KEY;

// Direct Newegg product URLs for each Steiger component.
// Key = component id matching COMPS array in index.html
const NEWEGG_URLS = {
  rtx5090:  'https://www.newegg.com/msi-rtx-5090-32g-gaming-trio-oc-geforce-rtx-5090-32gb-graphics-card/p/N82E16814137919',
  rtx5080:  'https://www.newegg.com/msi-rtx-5080-16g-gaming-trio-oc-geforce-rtx-5080-16gb-graphics-card/p/N82E16814137910',
  rtx5070ti:'https://www.newegg.com/asus-tuf-gaming-tuf-rtx5070ti-o16g-gaming-geforce-rtx-5070-ti-16gb-graphics-card-triple-fans/p/N82E16814126754',
  rtx5070:  'https://www.newegg.com/p/pl?d=RTX+5070+12GB+graphics+card',
  rtx5060ti:'https://www.newegg.com/p/pl?d=RTX+5060+Ti+16GB+graphics+card',
  r9x3d:    'https://www.newegg.com/amd-ryzen-9-9000-series-ryzen-9-9950x3d-granite-ridge-socket-am5-desktop-cpu-processor/p/N82E16819113884',
  r7x3d:    'https://www.newegg.com/amd-ryzen-7-9000-series-ryzen-7-9800x3d-granite-ridge-zen-5-socket-am5-desktop-cpu-processor/p/N82E16819113877',
  r5:       'https://www.newegg.com/p/pl?d=Ryzen+5+9600X+processor',
  i9:       'https://www.newegg.com/p/pl?d=Intel+Core+Ultra+9+285K',
  mb1:      'https://www.newegg.com/p/pl?d=ASUS+ROG+STRIX+B650E-F',
  mb2:      'https://www.newegg.com/asus-proart-z890-creator-wifi-atx-motherboard-intel-z890-lga-1851/p/N82E16813119699',
  mb3:      'https://www.newegg.com/p/pl?d=ASRock+TRX50+WS',
  ram1:     'https://www.newegg.com/p/pl?d=G.Skill+Trident+Z5+32GB+DDR5+6000',
  ram2:     'https://www.newegg.com/p/pl?d=G.Skill+Trident+Z5+64GB+DDR5+6000',
  ram3:     'https://www.newegg.com/p/pl?d=Kingston+Fury+Beast+64GB+DDR5+6000',
  ssd1:     'https://www.newegg.com/samsung-2tb-990-pro/p/N82E16820147861',
  ssd2:     'https://www.newegg.com/p/pl?d=WD+Black+SN850X+2TB',
  cool1:    'https://www.newegg.com/p/2VH-02M9-00004',
  cool2:    'https://www.newegg.com/p/pl?d=Arctic+Liquid+Freezer+III+240',
  cool3:    'https://www.newegg.com/p/pl?d=Scythe+Mugen+6+ARGB',
  psu1:     'https://www.newegg.com/corsair-rmx-series-atx-3-1-compatible-850-w-cybenetics-gold-power-supply-black-rm850x/p/N82E16817139333',
  psu2:     'https://www.newegg.com/p/pl?d=Corsair+HX1200+Platinum',
  case1:    'https://www.newegg.com/p/pl?d=Fractal+Design+Define+7+ATX',
  case2:    'https://www.newegg.com/phanteks-atx-mid-tower-eclipse-p600s-steel-tempered-glass-computer-case-matte-white-ph-ec600pstg-dmw01/p/N82E16811854111',
  os1:      'https://www.newegg.com/p/pl?d=Windows+11+Pro+OEM',
};

// Parse the price out of Newegg HTML.
// Newegg puts the main price in a <li class="price-current"> element.
// The dollars are in <strong> and cents in <sup>.
function parseNeweggPrice(html) {
  try {
    // Match pattern like: <strong>1,999</strong><sup>.<span>99</span></sup>
    const strongMatch = html.match(/class="price-current"[^>]*>[\s\S]*?<strong>([\d,]+)<\/strong><sup>\.<span>(\d+)<\/span>/);
    if (strongMatch) {
      const dollars = strongMatch[1].replace(/,/g, '');
      const cents = strongMatch[2];
      return parseFloat(`${dollars}.${cents}`);
    }
    // Fallback: schema.org price meta
    const altMatch = html.match(/itemprop="price"\s+content="([\d.]+)"/);
    if (altMatch) return parseFloat(altMatch[1]);

    return null;
  } catch {
    return null;
  }
}

// Fetch one URL through ScraperAPI and return the price
async function fetchPrice(compId, url) {
  try {
    const scraperUrl = `http://api.scraperapi.com?api_key=${SCRAPER_KEY}&url=${encodeURIComponent(url)}&render=false`;
    const res = await fetch(scraperUrl, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return { id: compId, price: null, error: `HTTP ${res.status}` };
    const html = await res.text();
    const price = parseNeweggPrice(html);
    return { id: compId, price, source: 'newegg' };
  } catch (err) {
    return { id: compId, price: null, error: String(err).slice(0, 100) };
  }
}

export default async function handler(req, res) {
  // Allow specific component IDs via query param, or fetch all
  // GET /api/prices?ids=rtx5090,rtx5080,r7x3d
  // GET /api/prices  (fetches all)

  if (!SCRAPER_KEY) {
    return res.status(500).json({ error: 'SCRAPER_API_KEY not configured in Vercel environment variables.' });
  }

  const requestedIds = req.query.ids
    ? req.query.ids.split(',').filter(id => NEWEGG_URLS[id])
    : Object.keys(NEWEGG_URLS);

  // Fetch all requested components in parallel
  const results = await Promise.all(
    requestedIds.map(id => fetchPrice(id, NEWEGG_URLS[id]))
  );

  // Return as a map: { rtx5090: 1999.99, rtx5080: 1199.00, ... }
  const prices = {};
  const errors = {};
  results.forEach(r => {
    if (r.price !== null) prices[r.id] = r.price;
    else if (r.error) errors[r.id] = r.error;
  });

  return res.status(200).json({
    prices,
    errors,
    fetchedAt: new Date().toISOString(),
    count: Object.keys(prices).length,
  });
}
