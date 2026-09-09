import "dotenv/config";
import { Octokit } from "@octokit/rest";
import fs from "fs";

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN || undefined });

const POLL_INTERVAL_MS = 5_000;

// ——— . ———————————————————————————————————————————————————————————————————————————————————————————

async function getLatestCommit(owner: string, repo: string): Promise<string | null> {
    try {
        const { data } = await octokit.repos.listCommits({ owner, repo, per_page: 1 });
        return data[0]?.sha.slice(0, 7) ?? null;
    } catch (err) {
        // console.error("Failed to fetch latest commit:", err);    // rate limit
        return null;
    }
}

async function getFileDiff(owner: string, repo: string, file: string, before: string, after: string): Promise<string | null> {
    try {
        const { data } = await octokit.repos.compareCommits({ owner, repo, base: before, head: after });
        return data.files?.find((f) => f.filename === file)?.patch ?? null;
    } catch (err) {
        console.error("Failed to fetch diff:", err);
        return null;
    }
}

function parseUrls(diff: string): string[] {
    let urls = [...diff.matchAll(/href="([^"]+)"/g)].map(m => m[1]);
    urls = urls
        .filter(url => !url.includes("github"))
        .filter(url => !url.includes("simplify"))
        .map(url => url.replace(/[?&](utm_source|ref)=Simplify/g, "").replace(/\?&/, "?"));
    return urls;
}

function addToFile(urls: string[]) {
    let toApply = fs.readFileSync("./to-apply.txt", "utf-8").split("\n").map(row => row.split(",")[0]).filter(l => l.trim());
    let applied = fs.readFileSync("./applied.csv", "utf-8").split("\n").filter(l => l.trim());
    let count = 0;

    for (const url of urls) {
        if (!toApply.includes(url) && !applied.includes(url)) {
            fs.appendFileSync("./to-apply.txt", url + "\n");
            count += 1;
        }
    }

    if (count) { console.log(`Added ${count} urls.`); }
}

async function watch(owner: string, repo: string, file: string) {
    console.log(`Watching https://github.com/${owner}/${repo}`);

    // let lastCommit = await getLatestCommit(owner, repo) ?? "";
    let lastCommit = "2739a28";
    console.log(`Starting from: ${lastCommit} \n`);

    while (true) {
        let latestCommit = await getLatestCommit(owner, repo) ?? lastCommit;

        if (!(lastCommit == latestCommit)) {
            let diff = await getFileDiff(owner, repo, file, lastCommit, latestCommit) ?? "";
            let urls = parseUrls(diff);
            addToFile(urls);
            lastCommit = latestCommit;
            console.log(`On: ${lastCommit}\n`);
        }

        await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
    }
}

watch("SimplifyJobs", "Summer2027-Internships", "README.md");

