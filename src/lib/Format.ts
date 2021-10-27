import type { DurationSeconds } from "./EveMarkets";

let defaultLocale = "en-US";

export const FormatIskAmount = new Intl.NumberFormat(defaultLocale, {
    useGrouping: true,
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
}).format


let formatDurationPart = new Intl.NumberFormat(defaultLocale, {minimumIntegerDigits:2}).format;
export function FormatDuration(duration: DurationSeconds) {
    let seconds = Math.ceil( duration % 60 );
    let minutes = Math.floor( (duration % (60*60)) / 60);
    let hours = Math.floor( (duration % (24*60*60)) / (60*60));
    let days = Math.floor( duration / (24*60*60));

    let formatted = `${formatDurationPart(hours)}:${formatDurationPart(minutes)}:${formatDurationPart(seconds)}`;
    if(days>0) formatted = `${days}d ` + formatted;
    return formatted;
}