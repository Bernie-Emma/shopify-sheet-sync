import fetch from 'node-fetch';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import dotenv from 'dotenv';
dotenv.config();

const SHOPIFY_DOMAIN = process.env.SHOPIFY_DOMAIN;
const SHOPIFY_TOKEN = process.env.SHOPIFY_TOKEN;
const SHEET_ID = process.env.SHEET_ID;
const CLIENT_EMAIL = process.env.CLIENT_EMAIL;
const PRIVATE_KEY = process.env.PRIVATE_KEY.replace(/\\n/g, '\n');

async function exportProducts() {
  const doc = new GoogleSpreadsheet(SHEET_ID);
  await doc.useServiceAccountAuth({ client_email: CLIENT_EMAIL, private_key: PRIVATE_KEY });
  await doc.loadInfo();
  const sheet = doc.sheetsByIndex[0];
  await sheet.clear();
  await sheet.setHeaderRow(['SKU', 'Image', 'Title', 'Price', 'MAP', 'MSRP', 'Description']);

  let url = `https://${SHOPIFY_DOMAIN}/admin/api/2023-10/products.json?limit=250&published_status=published&status=active`;

  while (url) {
    const res = await fetch(url, {
      headers: {
        'X-Shopify-Access-Token': SHOPIFY_TOKEN,
        'Content-Type': 'application/json'
      }
    });

    const data = await res.json();
    const products = data.products || [];

    for (const product of products) {
      const image = product.images.length > 0 ? product.images[0].src : '';
      const description = product.body_html.replace(/<[^>]*>?/gm, '');
      let msrp = '';

      try {
        const metaRes = await fetch(`https://${SHOPIFY_DOMAIN}/admin/api/2023-10/products/${product.id}/metafields.json`, {
          headers: {
            'X-Shopify-Access-Token': SHOPIFY_TOKEN,
            'Content-Type': 'application/json'
          }
        });
        const metafields = await metaRes.json();
        const match = metafields.metafields.find(mf => mf.namespace === 'custom' && mf.key === 'msrp');
        msrp = match?.value || '';
      } catch (e) {
        console.warn(`Metafield error for ${product.id}: ${e.message}`);
      }

      for (const variant of product.variants) {
        await sheet.addRow({
          SKU: variant.sku || '',
          Image: image,
          Title: product.title,
          Price: variant.price,
          MAP: variant.compare_at_price || '',
          MSRP: msrp,
          Description: description
        });
      }
    }

    const linkHeader = res.headers.get('link');
    const match = linkHeader?.match(/<([^>]+)>; rel="next"/);
    url = match ? match[1] : null;
  }

  console.log('✅ Export completed');
}

exportProducts();
