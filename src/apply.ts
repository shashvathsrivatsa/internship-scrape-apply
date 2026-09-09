import { chromium } from "playwright";
import { spawn } from "child_process";

async function startRemoteBrowser(): Promise<any> {
    console.log("Starting browser...");

    spawn("/Applications/Brave Browser.app/Contents/MacOS/Brave Browser", [
        "--remote-debugging-port=9222",
        "--user-data-dir=/tmp/brave-debug",
    ], { detached: true, stdio: "inherit" }).unref();

    let browser;
    while (true) {
        try {
            browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
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
    // await page.goto(url, { waitUntil: "load", timeout: 30000 }).catch(() => { blocked = true; });
}

apply("https://simplify.jobs/c/Peraton?utm_source=GHList&utm_medium=company");

