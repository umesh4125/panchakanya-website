# Panchakanya Oil Stores

Official website for **Panchakanya Oil Stores**, Thansing, Nuwakot, Nepal.

- Premium petrol, diesel & quality lubricants  
- Transparent pricing: **Kathmandu NOC rate + Rs 1.50**  
- Owner: Purushottam Pathak · Phone: 9841517156  

## Live site

After GitHub Pages is enabled, the site will be available at:

**https://umesh4125.github.io/panchakanya-website/**

## Automatic fuel prices

Petrol and diesel on the website update when **Nepal Oil Corporation (NOC)** revises Kathmandu rates.

**Formula:**

```text
Our price = Kathmandu NOC price + Rs 1.50
```

### How it works

1. **In the browser (primary)**  
   The page loads Kathmandu petrol/diesel from the official NOC retail price page  
   (`https://noc.org.np/retailprice`), then adds Rs 1.50 for both fuels.  
   Results are cached in the visitor’s browser for a few hours.

2. **`prices.json` (fallback + daily backup)**  
   A GitHub Action (`.github/workflows/update-fuel-prices.yml`) runs twice daily,  
   scrapes NOC, and commits updated `prices.json` if prices changed.  
   The website uses this file if the live fetch fails.

3. **Hardcoded defaults**  
   Only used if both live NOC and `prices.json` are unavailable.

Status text under **Live Fuel Prices** shows whether rates are live, cached, or fallback.

### Manual price refresh (GitHub)

On GitHub → **Actions** → **Update NOC Fuel Prices** → **Run workflow**.

### Local preview

Open `index.html` in a browser, or from this folder:

```bash
# Python
python -m http.server 8080

# Then open http://localhost:8080
```

> Live NOC fetch needs a network connection. Opening the file as `file://` may block some requests; prefer a local server.

## Files

| File | Purpose |
|------|---------|
| `index.html` | Full website + auto price logic |
| `prices.json` | Cached NOC Kathmandu rates (+ our margin) |
| `images/pump_photo.jpg` | Station photo |
| `.github/workflows/update-fuel-prices.yml` | Daily NOC sync |
