import { chromium } from "playwright";
import { pathToFileURL } from "url";
import { resolve } from "path";

const root = process.cwd();
const svgPath = resolve(root, "public/og-image.svg");
const outputPath = resolve(root, "public/og-image.png");
const svgUrl = pathToFileURL(svgPath).href;

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1200, height: 630 },
  deviceScaleFactor: 1,
});

await page.setContent(
  `<!DOCTYPE html>
  <html>
    <head>
      <style>
        html, body {
          margin: 0;
          width: 1200px;
          height: 630px;
          overflow: hidden;
          background: #1a1a1d;
        }
        img {
          display: block;
          width: 1200px;
          height: 630px;
        }
      </style>
    </head>
    <body>
      <img src="${svgUrl}" alt="OG image" />
    </body>
  </html>`
);

await page.screenshot({
  path: outputPath,
  type: "png",
});

await browser.close();
