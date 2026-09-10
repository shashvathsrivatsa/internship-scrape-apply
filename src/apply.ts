import { chromium } from "playwright";
import { spawn } from "child_process";

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


async function apply(url: string) {
    let page = await startRemoteBrowser();

    await page.goto(url, { waitUntil: "load", timeout: 30000 }).catch((err: Error) => {
        return console.error(`Navigation failed: ${err}`)
    });

    // Click on apply button
    await page.getByRole("button", { name: /apply/i }).first().click();

    // Handle popup (workday)
    await page.getByRole("button", { name: /apply manually/i }).first().click();

    // 
}

apply("https://dimensional.wd5.myworkdayjobs.com/dfa_careers/job/Austin/Internship-in-Technology---Software-Engineer_2026-9022");

