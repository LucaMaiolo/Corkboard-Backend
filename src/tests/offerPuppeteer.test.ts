import "dotenv/config";
import puppeteer, { type Browser, type BrowserContext, type ElementHandle, type Page } from "puppeteer";
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

// api helpers

/**
 * sends a json POST to the backend.
 * @param path - route path, e.g. "/users"
 * @param body - json-serializable payload
 * @param cookie - optional "name=value" session cookie
 */
const apiPost = async (path: string, body: unknown, cookie?: string): Promise<Response> => {
    return fetch(`${API_URL}${path}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(cookie !== undefined ? { Cookie: cookie } : {}),
        },
        body: JSON.stringify(body),
    });
}

/**
 * logs in via the api and returns just the "name=value" portion of the set-cookie header.
 * @param username - account username
 * @param password - account password
 */
const apiLogin = async (username: string, password: string): Promise<string> => {
    const response = await apiPost("/session/login", { username, password });
    // strip Path=/, HttpOnly, etc. so only the name=value pair is valid in a Cookie request header
    return (response.headers.get("set-cookie") ?? "").split(";")[0]!;
}

/**
 * creates a task via the api and returns its mongodb _id string.
 * @param cookie - lister's session cookie
 * @param name - task title
 * @param pay - maximum payout for the gig
 */
const apiCreateTask = async (cookie: string, name: string, pay: number): Promise<string> => {
    const response = await fetch(`${API_URL}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({ name, description: "automated test gig", location: "Montreal", pay, timeInMins: 60, status: "Available" }),
    });
    return ((await response.json()) as { _id: string })._id;
}

/**
 * submits an offer on a gig via the api.
 * @param cookie - offerer's session cookie
 * @param gigId - mongodb _id of the task to bid on
 * @param price - offered price
 * @param listerId - username of the task owner
 * @param submittedById - username of the offerer
 */
const apiCreateOffer = async (cookie: string, gigId: string, price: number, listerId: string, submittedById: string): Promise<void> => {
    await fetch(`${API_URL}/offers`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({ gigId, price, listerId, submittedById }),
    });
};

// browser helpers

/**
 * navigates to /login, fills the form, clicks submit, and waits for the reload that fires on success.
 * @param loginPage - puppeteer page to interact with
 * @param username - account username
 * @param password - account password
 */
const browserLogin = async (loginPage: Page, username: string, password: string): Promise<void> => {
    await loginPage.goto(`${BASE_URL}/login`);
    await loginPage.waitForSelector("input[placeholder='Username']");
    await loginPage.type("input[placeholder='Username']", username);
    await loginPage.type("input[placeholder='Password']", password);
    // successful login calls window.location.reload() which triggers a navigation event
    await Promise.all([
        loginPage.waitForNavigation({ waitUntil: "domcontentloaded" }),
        loginPage.click("button"),
    ]);
}

// lifecycle

beforeAll(async () => {
    browser = await puppeteer.launch({ headless: true });

    await apiPost("/users", lister);
    await apiPost("/users", offerer);

    const listerCookie = await apiLogin(lister.username, lister.password);
    const offererCookie = await apiLogin(offerer.username, offerer.password);

    taskIdMain       = await apiCreateTask(listerCookie, "Puppeteer Main Gig",      100);
    taskIdForAccept  = await apiCreateTask(listerCookie, "Puppeteer Accept Gig",    100);
    taskIdForDecline = await apiCreateTask(listerCookie, "Puppeteer Decline Gig",   100);

    // build a completed task (create, offer, accept) so status becomes Completed
    taskIdCompleted = await apiCreateTask(listerCookie, "Puppeteer Completed Gig", 100);
    await apiCreateOffer(offererCookie, taskIdCompleted, 50, lister.username, offerer.username);
    const offersOnCompleted = (await (await fetch(
        `${API_URL}/offers?gigId=${taskIdCompleted}`,
        { headers: { Cookie: listerCookie } },
    )).json()) as { id: string }[];
    if (offersOnCompleted[0] !== undefined) {
        await fetch(`${API_URL}/offers/${offersOnCompleted[0].id}/accept`, {
            method: "PUT",
            headers: { Cookie: listerCookie },
        });
    }

    // pre-seed an offer on taskIdMain so read tests have data without depending on create tests
    await apiCreateOffer(offererCookie, taskIdMain, 50, lister.username, offerer.username);
});

afterAll(async () => {
    await browser.close();
});

// each test gets its own incognito context so cookies never cross between tests
beforeEach(async () => {
    context = await browser.createBrowserContext();
    page = await context.newPage();
});

afterEach(async () => {
    await context.close();
});

// offer create tests

test("offer create success: logged-in non-owner can submit a valid offer", async () => {
    await browserLogin(page, offerer.username, offerer.password);
    await page.goto(`${BASE_URL}/tasks/${taskIdMain}`);
    await page.waitForFunction(
        () => [...document.querySelectorAll("button")].some((button) => button.textContent?.includes("Make an Offer")),
        { timeout: 10000 },
    );
    await page.evaluate(() => {
        const button = [...document.querySelectorAll("button")].find((button) => button.textContent?.includes("Make an Offer"));
        (button as HTMLButtonElement).click();
    });
    await page.waitForSelector("input[placeholder='Price']");
    await page.click("input[placeholder='Price']", { count: 3 });
    await page.type("input[placeholder='Price']", "40");
    await page.evaluate(() => {
        const button = [...document.querySelectorAll("button")].find((button) => button.textContent?.includes("Submit Offer"));
        (button as HTMLButtonElement).click();
    });
    // onAdded() sets showOfferForm to false, so "Make an Offer" reappears on success
    await page.waitForFunction(
        () => [...document.querySelectorAll("button")].some((button) => button.textContent?.includes("Make an Offer")),
        { timeout: 10000 },
    );
    const buttons = await page.$$("button");
    const texts = await Promise.all(buttons.map((buttonHandle: ElementHandle<Element>) => buttonHandle.evaluate((element: Element) => element.textContent ?? "")));
    expect(texts.some((text: string) => text.includes("Make an Offer"))).toBe(true);
});

test("offer create fail: unauthenticated user sees no Make an Offer button", async () => {
    await page.goto(`${BASE_URL}/tasks/${taskIdMain}`);
    await page.waitForFunction(
        () => document.querySelector("h1") !== null && document.querySelector(".task-detail-actions") !== null,
        { timeout: 10000 },
    );
    const buttons = await page.$$("button");
    const texts = await Promise.all(buttons.map((buttonHandle: ElementHandle<Element>) => buttonHandle.evaluate((element: Element) => element.textContent ?? "")));
    expect(texts.some((text: string) => text.includes("Make an Offer"))).toBe(false);
});

test("offer create fail: task owner sees no Make an Offer button on their own gig", async () => {
    await browserLogin(page, lister.username, lister.password);
    await page.goto(`${BASE_URL}/tasks/${taskIdMain}`);
    await page.waitForFunction(
        () => document.querySelector("h1") !== null && document.querySelector(".task-detail-actions") !== null,
        { timeout: 10000 },
    );
    const buttons = await page.$$("button");
    const texts = await Promise.all(buttons.map((buttonHandle: ElementHandle<Element>) => buttonHandle.evaluate((element: Element) => element.textContent ?? "")));
    expect(texts.some((text: string) => text.includes("Make an Offer"))).toBe(false);
});

test("offer create fail: completed gig has no Make an Offer button", async () => {
    await browserLogin(page, offerer.username, offerer.password);
    await page.goto(`${BASE_URL}/tasks/${taskIdCompleted}`);
    await page.waitForFunction(
        () => document.querySelector("h1") !== null && document.querySelector(".task-detail-actions") !== null,
        { timeout: 10000 },
    );
    const buttons = await page.$$("button");
    const texts = await Promise.all(buttons.map((buttonHandle: ElementHandle<Element>) => buttonHandle.evaluate((element: Element) => element.textContent ?? "")));
    expect(texts.some((text: string) => text.includes("Make an Offer"))).toBe(false);
});

test("offer create fail: empty price field blocks submission via html5 required validation", async () => {
    await browserLogin(page, offerer.username, offerer.password);
    await page.goto(`${BASE_URL}/tasks/${taskIdMain}`);
    await page.waitForFunction(
        () => [...document.querySelectorAll("button")].some((button) => button.textContent?.includes("Make an Offer")),
        { timeout: 10000 },
    );
    await page.evaluate(() => {
        const button = [...document.querySelectorAll("button")].find((button) => button.textContent?.includes("Make an Offer"));
        (button as HTMLButtonElement).click();
    });
    await page.waitForSelector("input[placeholder='Price']");
    // clear any draft-restored value so the field is genuinely empty
    await page.$eval("input[placeholder='Price']", (element: Element) => { (element as HTMLInputElement).value = ""; });
    await page.evaluate(() => {
        const button = [...document.querySelectorAll("button")].find((button) => button.textContent?.includes("Submit Offer"));
        (button as HTMLButtonElement).click();
    });
    // required validation keeps the form open; Submit Offer should still be visible
    await new Promise<void>((resolve) => setTimeout(resolve, 500));
    const submitVisible = await page.evaluate(
        () => [...document.querySelectorAll("button")].some((button) => button.textContent?.includes("Submit Offer")),
    );
    expect(submitVisible).toBe(true);
});

test("offer create fail: price over gig budget shows an error toast", async () => {
    await browserLogin(page, offerer.username, offerer.password);
    await page.goto(`${BASE_URL}/tasks/${taskIdMain}`);
    await page.waitForFunction(
        () => [...document.querySelectorAll("button")].some((button) => button.textContent?.includes("Make an Offer")),
        { timeout: 10000 },
    );
    await page.evaluate(() => {
        const button = [...document.querySelectorAll("button")].find((button) => button.textContent?.includes("Make an Offer"));
        (button as HTMLButtonElement).click();
    });
    await page.waitForSelector("input[placeholder='Price']");
    await page.type("input[placeholder='Price']", "999");
    await page.evaluate(() => {
        const button = [...document.querySelectorAll("button")].find((button) => button.textContent?.includes("Submit Offer"));
        (button as HTMLButtonElement).click();
    });
    // backend returns "Offer price cannot exceed the gig budget of X" which toast.error displays
    await page.waitForFunction(
        () => document.body.innerText.includes("budget"),
        { timeout: 10000 },
    );
    const bodyText = await page.evaluate(() => document.body.innerText);
    expect(bodyText).toContain("budget");
});

// offer read tests

test("offer read success: lister sees offer cards on the offers page", async () => {
    await browserLogin(page, lister.username, lister.password);
    await page.goto(`${BASE_URL}/offers/${taskIdMain}`);
    await page.waitForSelector(".card", { timeout: 10000 });
    const cards = await page.$$(".card");
    expect(cards.length).toBeGreaterThan(0);
});

test("offer read success: offerer sees their submitted offers on my-offers", async () => {
    await browserLogin(page, offerer.username, offerer.password);
    await page.goto(`${BASE_URL}/my-offers`);
    await page.waitForSelector(".card", { timeout: 10000 });
    const cards = await page.$$(".card");
    expect(cards.length).toBeGreaterThan(0);
});

// offer accept / decline tests

test("offer accept success: lister accepts offer and status updates to accepted", async () => {
    const offererCookie = await apiLogin(offerer.username, offerer.password);
    await apiCreateOffer(offererCookie, taskIdForAccept, 50, lister.username, offerer.username);

    await browserLogin(page, lister.username, lister.password);
    await page.goto(`${BASE_URL}/offers/${taskIdForAccept}`);
    await page.waitForSelector(".card", { timeout: 10000 });
    await page.evaluate(() => {
        const button = [...document.querySelectorAll("button")].find((button) => button.textContent?.trim() === "Accept");
        (button as HTMLButtonElement).click();
    });
    await page.waitForFunction(
        () => [...document.querySelectorAll(".card-status")].some((element) => element.textContent === "accepted"),
        { timeout: 10000 },
    );
    const statusText = await page.$eval(".card-status", (element) => element.textContent ?? "");
    expect(statusText).toBe("accepted");
});

test("offer decline success: lister declines offer and status updates to declined", async () => {
    const offererCookie = await apiLogin(offerer.username, offerer.password);
    await apiCreateOffer(offererCookie, taskIdForDecline, 50, lister.username, offerer.username);

    await browserLogin(page, lister.username, lister.password);
    await page.goto(`${BASE_URL}/offers/${taskIdForDecline}`);
    await page.waitForSelector(".card", { timeout: 10000 });
    await page.evaluate(() => {
        const button = [...document.querySelectorAll("button")].find((button) => button.textContent?.trim() === "Decline");
        (button as HTMLButtonElement).click();
    });
    await page.waitForFunction(
        () => [...document.querySelectorAll(".card-status")].some((element) => element.textContent === "declined"),
        { timeout: 10000 },
    );
    const statusText = await page.$eval(".card-status", (element) => element.textContent ?? "");
    expect(statusText).toBe("declined");
});
