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

afterAll(async () => {
  await browser.close();
});

async function loginAndGoToCreate() {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForSelector("input[placeholder='Username']");
  await page.type("input[placeholder='Username']", "puppeteeruser");
  await page.type("input[placeholder='Password']", "password123");
  await page.click("button");
  await page.waitForNavigation();
  await page.goto(`${BASE_URL}/create`);
  await page.waitForSelector("input[placeholder='Name...']");
}

//create success
test("can create a task successfully", async () => {
  await loginAndGoToCreate();
  await page.type("input[placeholder='Name...']", "PuppeteerTask");
  await page.type(
    "input[placeholder='Description...']",
    "This is a puppeteer test task",
  );
  await page.type("input[placeholder='Location...']", "Montreal");
  await page.type("input[placeholder='pay...']", "25");
  await page.type("input[placeholder='Time in mins...']", "60");
  await page.click("button[type='submit']");
  await page.waitForSelector("h2");
  const heading = await page.$eval("h2", (el) => el.textContent);
  expect(heading).toBe("Added Task");
});

// Create fail

test("shows alert when creating a task while not logged in", async () => {
  await page.goto(`${BASE_URL}/`);
  await page.waitForSelector("button");
  const buttons = await page.$$("button");
  for (const button of buttons) {
    const text = await button.evaluate((el) => el.textContent);
    if (text?.includes("Logout")) {
      await button.click();
      await page.waitForNavigation();
      break;
    }
  }
  await page.goto(`${BASE_URL}/create`);
});
