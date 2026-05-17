import "dotenv/config";
import puppeteer, { type Browser, type BrowserContext, type Page } from "puppeteer";
import { test, expect, beforeAll, afterAll, beforeEach, afterEach } from "vitest";

const BASE_URL = "http://localhost:5173";
const API_URL = "http://localhost:1339";

let browser: Browser;
let context: BrowserContext;
let page: Page;

// ids set in beforeAll; tests that mutate state get their own task
let taskIdMain: string;
let taskIdForAccept: string;
let taskIdForDecline: string;
let taskIdCompleted: string;

// timestamp suffix prevents duplicate username errors across test runs
const run = Date.now();
const lister = { username: `lister${run}`, password: "password123", email: `lister${run}@ptest.com`, birthday: "2000-01-01" };
const offerer = { username: `offerer${run}`, password: "password123", email: `offerer${run}@ptest.com`, birthday: "2000-01-01" };
