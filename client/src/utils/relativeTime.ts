const UNITS: [string, number][] = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
    ['second', 1],
];

export function timeAgo(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const elapsed = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (elapsed < 5) return 'just now';

    for (const [unit, seconds] of UNITS) {
        const count = Math.floor(elapsed / seconds);
        if (count >= 1) {
            return `${count} ${unit}${count > 1 ? 's' : ''} ago`;
        }
    }
    return 'just now';
}
