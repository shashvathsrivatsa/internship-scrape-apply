import "dotenv/config";
import express, { type Request, type Response } from "express";
import { Octokit } from "@octokit/rest";

const app = express();
app.use(express.json());

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN || undefined });

const OWNER = "SimplifyJobs";
const REPO = "Summer2027-Internships";
const TARGET_FILE = "README.md";


// ——— . ———————————————————————————————————————————————————————————————————————————————————————————

async function getReadmeDiff(before: string, after: string): Promise<string | null> {
    try {
        const { data } = await octokit.repos.compareCommits({
            owner: OWNER,
            repo: REPO,
            base: before,
            head: after,
        });

        const readmeFile = data.files?.find((f) => f.filename === TARGET_FILE);
        return readmeFile?.patch ?? null;
    } catch (err) {
        console.error("Failed to fetch diff:", err);
        return null;
    }
}

app.post("/webhook", async (req: Request, res: Response) => {
    if (req.headers["x-github-event"] !== "push") { res.send(); return; }

    const payload: {
        repository?: { full_name?: string };
        before?: string;
        after?: string;
        ref?: string;
        commits?: { id: string; message: string }[];
    } = req.body;

    const repoFullName = payload.repository?.full_name;
    const before = payload.before;
    const after = payload.after;

    console.log(`\n${"=".repeat(60)}`);
    console.log(`Push to ${repoFullName} (${payload.ref})`);
    console.log(`Commits: ${payload.commits?.length ?? 0}`);
    payload.commits?.forEach((c) => console.log(`  ${c.id.slice(0, 7)} ${c.message}`));

    const diff = await getReadmeDiff(before ?? "", after ?? "");

    if (diff === null) {
        console.log(`${TARGET_FILE} was not changed in this push.`);
    } else {
        console.log(`\n--- ${TARGET_FILE} diff ---`);
        console.log(diff);
        console.log("--- end diff ---");
    }

    res.status(200).send("OK");
});

app.get("/ping", (_req, res) => res.send("pong"));

app.listen(4321, () => {
    console.log(
        `GitHub token:   ${process.env.GITHUB_TOKEN ? "configured" : "NOT SET (unauthenticated, rate-limited)"}`
    );
    console.log(`scan-apply-bot listening on port ${4321}`);
});
