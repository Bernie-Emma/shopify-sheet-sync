# Shopify to Google Sheets Sync

This script pulls all live products from your Shopify store, extracts important fields (including custom metafields), and writes them to a Google Sheet.

## Setup Instructions

1. Fill in the `.env` file with your credentials:
   - Shopify domain and API token
   - Google Sheet ID
   - Google Service Account email and private key

2. Install dependencies:
```
npm install
```

3. Run the sync script:
```
npm start
```

You can deploy this to Render or run it as a cron job to auto-sync your store every X hours.
