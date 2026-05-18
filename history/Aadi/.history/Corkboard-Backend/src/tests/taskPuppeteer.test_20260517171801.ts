import "dotenv/config";
import puppeteer, { type Browser, type Page } from "puppeteer";
import { test, expect, beforeAll, afterAll } from "vitest";

const BASE_URL = "http://localhost:5173";

let browser: Browser;
let page: Page;

beforeAll(async () => {
  browser = await puppeteer.launch();
  page = await browser.newPage();

  await page.goto(`${BASE_URL}/register`);
  await page.waitForSelector("input[placeholder='Username']");
  await page.type("input[placeholder='Username']", "puppeteeruser");
  await page.type(
    "input[placeholder='Password (min. 8 characters']",
    "password123",
  );
  await page.type("input[placeholder='Email']", "puppet@test.com");
  await page.type("input[type='date']", "2000-01-01");
  await page.click("button");
  await page.waitForNavigation();
});
