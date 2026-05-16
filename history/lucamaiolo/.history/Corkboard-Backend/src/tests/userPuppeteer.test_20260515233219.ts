import "dotenv/config";
import puppeteer, { type Browser, type Page } from "puppeteer";
import {test, expect, beforeAll, afterAll, beforeEach } from "vitest";

let browser: Browser;
let page: Page;

const BASE_URL = "http://localhost:5173";

beforeAll(async () => {
    browser = await puppeteer.launch();
    page = await browser.newPage();
});

afterAll(async () => {
    await browser.close();
});

async function FillRegisterForm(username:string, password: string, email: string, birthday: string) {
    
    await page.goto(`${BASE_URL}/register`);
    await page.waitForSelector("input[placeholder='Username']");
    await page.type("input[placeholder='Username']", username);
    await page.type("input[placeholder='Password (min. 8 characters)']", password);
    await page.type("input[placeholder='Email']", email);
    await page.type("input[type='date']", birthday);
    await page.click("button");
}

test("shows error for short password", async () => {
    await FillRegisterForm("validuser", "short", "valid@example.com", "2000-01-01");
    await page.waitForSelector("p[style*='color: red']");
    const error = await page.$eval("p[style*='color: red']", (el) => el.textContent);
    expect(error).toBeTruthy();
});