export function formatCSVRow(values: (string | number | null)[]): string {
    return values
        .map((v) => {
            if (v === null || v === undefined) return '';
            const str = String(v);
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        })
        .join(',');
}

export function generateCSV(
    headers: string[],
    rows: (string | number | null)[][]
): string {
    const headerLine = formatCSVRow(headers);
    const dataLines = rows.map(formatCSVRow);
    return [headerLine, ...dataLines].join('\n');
}
