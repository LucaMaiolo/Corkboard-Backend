import "dotenv/config";
import puppeteer, { type Browser, type Page } from "puppeteer";
import {test, expect, beforeAll, afterAll } from "vitest";

const BASE_URL = "http://localhost:5173";

let browser: Browser;
let page: Page;