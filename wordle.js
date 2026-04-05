import https from 'node:https';
const urlbase = `https://www.nytimes.com/svc/wordle/v2`;

function formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

function fetchWordle(datestring) {
    return new Promise((resolve, reject) => {
        const url = `${urlbase}/${datestring}.json`;

        https
            .get(url, (res) => {
                let raw = "";
                res.on('data', (chunk) => (raw += chunk));
                res.on('end', () => {
                    if (res.statusCode !== 200) {
                        reject(new Error(`http ${res.statusCode} for ${datestring}`));
                        return;
                    }

                    try {
                        const data = JSON.parse(raw);
                        resolve({
                            date: datestring,
                            id: data.id,
                            solution: data.solution?.toUpperCase() ?? null,
                            editor: data.editor ?? null,
                            print_date: data.print_date ?? datestring,
                        });
                    } catch { reject(new Error(`failed to parse json for ${datestring}`)); }
                });
            }).on('error', reject);
    });
}

function printResult({ date, id, solution, editor }) {
    const num = id != null ? ` (#${id})` : "";
    const ed = editor ? ` [editor: ${editor}]` : "";
    console.log(`${date}${num}: ${solution ?? "(not available)"}${ed}`);
}

async function main() {
    const arg = process.argv[2];

    if (!arg) {
        const today = formatDate(new Date());
        try {
            printResult(await fetchWordle(today));
        } catch (e) { console.error('err:', e.message); }

        return;
    }

    const n = parseInt(arg, 10);
    if (!isNaN(n) && (String(n) === arg || arg === `+${n}`)) {
        const results = [];
        const count = Math.abs(n);

        for (let i = count - 1 ; i >= 0 ; i--) {
            const d = new Date();
            const sign = (n < 0 ? -1 : 1);
            d.setDate(d.getDate() + sign * (count - 1 - i));
            results.push(fetchWordle(formatDate(d)));
        }

        const settled = await Promise.allSettled(results);
        for (const r of settled) {
            if (r.status === "fulfilled") printResult(r.value);
            else console.error('err:', r.reason.message);
        }
        return;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(arg)) {
        try {
            printResult(await fetchWordle(arg));
        } catch (e) { console.error('err:', e.message); }

        return;
    }

    console.error(
        "Usage:\n" +
        "    node wordle.js               → today\n" +
        "    node wordle.js 2026-03-17    → specific date\n" +
        "    node wordle.js 7             → last 7 days"
    );

    process.exit(1);
}

main();