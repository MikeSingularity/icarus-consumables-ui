These are excellent constraints, and that Phase 3 "grow ratio" feature is a killer idea. Icarus farming can be a logistical headache, and telling a player exactly how many crop plots of squash and soybeans they need to maintain a specific 3-buff loadout will make your tool incredibly sticky.

Given these requirements—automated updates, complex relational data (items to buffs, and items to farm yields), a second-monitor primary use case, and a future mobile summary—**a responsive Client-Side Single Page Application (SPA) hosted on a free CDN is definitively your best path forward.** Options like Notion or Google Sheets will break down or become unmanageable when you try to automate complex updates or build a clean mobile summary. A Discord bot won't handle the visual density of a farming list well.

Here is how we can architect this for zero cost and maximum UX:

### 1. The Zero-Cost Automated Pipeline

Since you want extraction and updates to be automated, we need to decouple your data extraction from your frontend application.

* **The Extractor:** You can run your extraction script locally. Setting it up as a simple cron job on your Linux environment to run after typical Icarus patch days (Fridays) is a highly reliable, frictionless way to handle this. The script parses the game files, outputs a structured JSON file, and automatically commits and pushes it to a GitHub repository.
* **The CI/CD Trigger:** You set up GitHub Actions (which is free) on that repository. Whenever your Linux script pushes a new JSON file, GitHub Actions detects the change, rebuilds your static frontend with the new data, and pushes it to your host.
* **The Host:** Platforms like Cloudflare Pages, Vercel, or Netlify will host this static build for free. Your users always get the latest data with zero manual intervention from you.

### 2. Future-Proofing the Data Schema (For Phase 3)

To ensure Phase 3 doesn't require a total rewrite, your automated JSON extraction needs to build a relational graph from day one. You aren't just mapping `Item -> Buff`. You are mapping `Item -> Buffs`, `Item -> Recipe`, and `Recipe Ingredient -> Crop Yield / Growth Time`.

Even if your Phase 2 UI only displays the single item and its buffs, your underlying data structure should already know that a *Vegetable Pie* requires *Squash*, and *Squash* takes *X minutes* to grow yielding *Y units*. This makes the "grow ratio" calculator a purely frontend logic addition later, rather than a backend rewrite.

### 3. UX Design for the Second Monitor

For a second monitor, horizontal space is usually abundant, but the player's primary focus is still on the main screen.

* **High Contrast & Dark Mode:** Icarus is a visually intense game. A dark mode UI will prevent your tool from acting like a flashbang on their secondary screen.
* **Data Grids over Lists:** Use a responsive card grid. Let players sort by clicking column headers (Stamina, Health, Mining Yield) so they can visually scan icons and numbers at a glance without reading dense text.

### 4. Nailing the Mobile Summary (Phase 3)

By building this as an SPA, you are already halfway to a Progressive Web App (PWA).

* **Stateful URLs:** When a user builds their 3-item loadout on their second monitor, encode that state into the URL (e.g., `yourtool.com/loadout?items=veg_pie,prime_meat,wine`).
* **The Handoff:** They can simply copy that URL or scan a generated QR code on their screen with their phone. The mobile view of that same URL detects the viewport size and strips away the complex search grids, displaying only the "Summary Card" and the "Farming Checklist."

Would you like to drill down into the JSON data schema to structure the relationships between the consumables, buffs, and the agricultural yield logic, or would you prefer to discuss which frontend framework (React, Vue, etc.) would make building the visual grid easiest?
