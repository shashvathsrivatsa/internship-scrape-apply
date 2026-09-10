import { chromium } from "playwright";
import { spawn } from "child_process";
import { getVerificationLink } from "./emailVerification.js";

// ——— UTILS ——————————————————————————————————————————————————————————————————————————————————————————————————————————

async function startRemoteBrowser(): Promise<any> {
    console.log("Starting browser...");

    const braveProcess = spawn("/Applications/Brave Browser.app/Contents/MacOS/Brave Browser", [
        "--remote-debugging-port=9222",
        "--user-data-dir=/tmp/brave-debug",
    ], { detached: true, stdio: "inherit" });

    let browser: Awaited<ReturnType<typeof chromium.connectOverCDP>>;
    while (true) {
        try {
            browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
            process.on("SIGINT", async () => { await browser.close(); braveProcess.kill(); process.exit(); });
            break;
        } catch(err) {
            await new Promise(r => setTimeout(r, 500));
        }
    }

    const context = browser.contexts()[0] ?? await browser.newContext();

    for (const p of context.pages()) {
        const s = await context.newCDPSession(p);
        await s.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "dark" }] });
    }

    const page = context.pages()[0] ?? await context.newPage();
    console.log(`Using tab: ${page.url()}`);
    return page;
}


// ——— APPLICATION SITES ——————————————————————————————————————————————————————————————————————————————————————————————

async function classicWorkday(url: string) {

    // Start
    let page = await startRemoteBrowser();
    await page.goto(url, { waitUntil: "load", timeout: 30000 }).catch(() => {});

    // Click on apply button
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /apply/i }).first().click({ timeout: 500 }).catch(async (err: Error) => {
        // console.error("Error in apply: ", err);
        await page.getByRole("button", { name: /continue/i }).first().click();
    });
    await page.getByRole("button", { name: /apply manually/i }).first().click({ timeout: 500 }).catch(() => {});

    // Login
    await new Promise(r => setTimeout(r, 1000)); await page.waitForLoadState("networkidle");
    const hasLogin = await page.getByText(/password/i).first().isVisible().catch(() => false);

    if (hasLogin) {
        await page.getByLabel(/email/i).fill("shashvathsrivatsa@gmail.com");
        await page.locator('input[type="password"]').first().fill("P@55word!");
        await page.getByLabel(/verify new password/i).fill("P@55word!");

        let verificationTime = Date.now();
        await page.getByRole("button", { name: /create account/i }).waitFor({ state: "visible" });
        await new Promise(r => setTimeout(r, 1000));
        await page.getByRole("button", { name: /create account/i }).click();

        // (optional) Check consent
        const hasConsentError = await page.getByText(/error/i).first().isVisible().catch(() => false);
        console.log("Has consent box: ", hasConsentError);
        if (hasConsentError) {
            for (const checkbox of await page.getByRole("checkbox").all()) await checkbox.check();
            await page.getByRole("button", { name: /create account/i }).click();
        }

        // (optional) Email verification
        const hasEmailVerification = await page.getByText(/sign in/i).first().isVisible().catch(() => false);
        console.log("Has sign in: ", hasEmailVerification);
        if (hasEmailVerification) {
            // console.log("Reloading page");
            // await page.goto(url, { waitUntil: "load", timeout: 30000 }).catch(() => {});
            // await page.getByRole("button", { name: /apply/i }).first().click();
            // await page.getByRole("button", { name: /apply manually/i }).first().click();
            // await page.waitForLoadState("networkidle");
            // let verificationLink = await getVerificationLink(verificationTime);
            // console.log(verificationLink);
            
            // Login with email 
            await new Promise(r => setTimeout(r, 1000)); await page.waitForLoadState("networkidle");
            await page.getByLabel(/email/i).waitFor({ state: "visible" });
            await page.getByLabel(/email/i).fill("shashvathsrivatsa@gmail.com");
            await page.locator('input[type="password"]').first().fill("P@55word!");
            await page.getByRole("button", { name: /sign in/i }).click();
        }
    }

    // Page 1 - my information
    console.log("Waiting for page 1 to idle...");
    await page.waitForLoadState("networkidle");
    console.log("Filling");

    await page.getByLabel(/how did you hear about us/i).click().catch(() => {});
    await page.getByRole("option", { name: "LinkedIn", exact: true }).click({ timeout: 3000 }).catch(async () => {
        await page.getByRole("option", { name: /Internet Job board/i }).first().click().catch(() => {});
        await page.getByRole("option", { name: /Other/i }).first().click().catch(() => {});
    });

    const noOption = page.getByLabel("No", { exact: true }).first();
    if (await noOption.isVisible().catch(() => false)) await noOption.click();

    await page.getByLabel(/first name/i).fill("Shashvath");
    await page.getByLabel(/last name/i).fill("Srivatsa");

    await page.getByLabel(/address line 1/i).fill("754 Feller Ave");
    await page.getByLabel(/city/i).fill("San Jose");
    await page.locator("#address--countryRegion").click().catch(() => {});
    await page.getByRole("option", { name: "California", exact: true }).click({ timeout: 3000 }).catch(() => {});
    await page.getByLabel(/postal code/i).fill("95127");

    await page.getByLabel(/phone device type/i).click();
    await page.getByRole("option", { name: "Mobile", exact: true }).click();
    await page.getByLabel(/phone number/i).fill("4086570906");

    await Promise.all([
        await page.getByRole("button", { name: /continue/i }).click(),
        await page.getByRole("heading", { name: /my experience/i }).waitFor({state: "visible" }),
    ]);

    // Page 2 - my experience
    console.log("Waiting for page 2 to idle...");
    await page.waitForLoadState("networkidle");
    console.log("Filling");

    await page.getByRole("button", { name: "Add", exact: true}).first().click();
    await page.getByLabel(/job title/i).fill("Software Engineering Intern");
    await page.getByLabel(/company/i).fill("Frizzle");
    await page.locator('[data-automation-id="dateSectionMonth-input"]').first().fill("05");
    await page.locator('[data-automation-id="dateSectionYear-input"]').first().fill("2026");
    await page.locator('[data-automation-id="dateSectionMonth-input"]').nth(1).fill("08");
    await page.locator('[data-automation-id="dateSectionYear-input"]').nth(1).fill("2026");
    await page.getByLabel(/role description/i).fill(
        `- Built a 4-stage lead generation pipeline processing 624,349+ unique contact records across all 51 U.S. jurisdictions, filtered and enriched to 6,600+ targeted K-12 staff contacts in Connecticut
- Automated staff directory discovery by parsing school homepages and identifying directory links via anchor text heuristics
- Engineered an AI-powered extraction layer using OpenAI to parse arbitrary HTML staff directory layouts into structured JSON (name, title, email, phone) without per-site parsers
- Built a contact data enrichment pipeline using Playwright over Chrome DevTools Protocol to find missing emails via Mailmeteor, with staged retry backoff and checkpoint-based resumption
- Developed a generalized lead enrichment module to auto-discover company domains via Bing and enrich arbitrary CSV contact lists, eliminating dependence on third-party data vendors`
    );
}

classicWorkday("https://mmc.wd1.myworkdayjobs.com/mmc/job/Newcastle---Bank/Oliver-Wyman---Data---Analytics-Summer-Internship-2027---Newcastle_R_364984-1");
// classicWorkday("https://dimensional.wd5.myworkdayjobs.com/dfa_careers/job/Austin/Internship-in-Technology---Software-Engineer_2026-9022");

