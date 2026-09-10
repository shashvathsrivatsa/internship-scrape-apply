import dotenv from "dotenv";
import { google } from "googleapis";

dotenv.config({ path: "/Users/shashvathsrivatsa/Code/typescript/ai-reply/.env", quiet: true });

function getClient(email: string) {
    const refreshToken = process.env.GMAIL_REFRESH_TOKEN_WORK;
    if (!refreshToken) throw new Error(`No token for ${email}`);

    const client = new google.auth.OAuth2(
        process.env["CLIENT_ID"],
        process.env["CLIENT_SECRET"],
        "http://localhost"
    );
    client.setCredentials({ refresh_token: refreshToken });
    return client;
}

function decodeBody(data?: string | null): string {
    if (!data) return "";
    return Buffer.from(data, "base64url").toString("utf-8");
}

function extractPlainText(payload: any): string {
    if (!payload) return "";
    if (payload.mimeType === "text/plain" && payload.body?.data) {
        const full = decodeBody(payload.body.data);
        // strip quoted reply lines and everything after "On ... wrote:"
        const lines = full.split("\n");
        const out: string[] = [];
        for (const line of lines) {
            if (/^>/.test(line)) continue;
            if (/^On .+ wrote:/.test(line)) break;
            out.push(line);
        }
        return out.join("\n").trim();
    }
    if (payload.parts) {
        for (const part of payload.parts) {
            const text = extractPlainText(part);
            if (text) return text;
        }
    }
    return "";
}

export async function getVerificationLink(startTime: number): Promise<string> {
    const gmail = google.gmail({ version: "v1", auth: getClient("work") });
    const after = Math.floor(startTime / 1000);

    while (true) {
        const res = await gmail.users.messages.list({
            userId: "me",
            q: `from:workday after:${after}`,
            maxResults: 1,
        });

        const id = res.data.messages?.[0]?.id;
        if (id) {
            const msg = await gmail.users.messages.get({ userId: "me", id });
            const body = extractPlainText(msg.data.payload);
            const match = body.match(/\b\d{6}\b/);
            if (match) return match[0];
        }

        await new Promise(r => setTimeout(r, 3000));
    }
}

