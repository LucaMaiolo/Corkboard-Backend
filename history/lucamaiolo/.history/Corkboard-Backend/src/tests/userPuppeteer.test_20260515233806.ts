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
    await page.evaluate((date) => {
        const input = document.querySelector("input[type='date']") as HTMLInputElement;
        if (input) {
          input.value = date;
          input.dispatchEvent(new Event("input", { bubbles: true }));
          input.dispatchEvent(new Event("change", { bubbles: true }));
        }
      }, birthday);    await page.click("button");
}

async function getErrorText(): Promise<string | null> {
    return page.evaluate(() => {
      const all = document.querySelectorAll("p");
      for (const p of all) {
        if (p.style.color === "red") return p.textContent;
      }
      return null;
    });
  }
  
  test("shows error for short password", async () => {
    await FillRegisterForm("validuser", "short", "valid@example.com", "2000-01-01");
    await page.waitForFunction(() => {
      const all = document.querySelectorAll("p");
      for (const p of all) {
        if (p.style.color === "red") return true;
      }
      return false;
    });
    const error = await getErrorText();
    expect(error).toBeTruthy();
  });
  
  test("shows error for invalid email", async () => {
    await FillRegisterForm("validuser", "validpassword", "not-an-email", "2000-01-01");
    await page.waitForFunction(() => {
      const all = document.querySelectorAll("p");
      for (const p of all) {
        if (p.style.color === "red") return true;
      }
      return false;
    });
    const error = await getErrorText();
    expect(error).toBeTruthy();
  });
  
  test("shows error for underage birthday", async () => {
    await FillRegisterForm("validuser", "password123", "valid@example.com", "2015-01-01");
    await page.waitForFunction(() => {
      const all = document.querySelectorAll("p");
      for (const p of all) {
        if (p.style.color === "red") return true;
      }
      return false;
    });
    const error = await getErrorText();
    expect(error).toBeTruthy();
  });