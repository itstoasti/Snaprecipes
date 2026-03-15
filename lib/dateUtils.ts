/**
 * Lightweight date utilities to replace date-fns and avoid bundling issues.
 */

export function isSameDay(date1: Date, date2: Date): boolean {
    return (
        date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getDate() === date2.getDate()
    );
}

export function addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

export function startOfToday(): Date {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
}

export function format(date: Date, formatStr: string): string {
    const day = date.getDate();
    const month = date.getMonth();
    const year = date.getFullYear();
    const dayOfWeek = date.getDay();

    const shortDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const longDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const shortMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    // Basic format support for what we need
    if (formatStr === "yyyy-MM-dd") {
        return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
    if (formatStr === "EEE") {
        return shortDays[dayOfWeek];
    }
    if (formatStr === "d") {
        return day.toString();
    }
    if (formatStr === "EEEE, MMM d") {
        return `${longDays[dayOfWeek]}, ${shortMonths[month]} ${day}`;
    }

    // Default to ISO date
    return date.toISOString().split("T")[0];
}
