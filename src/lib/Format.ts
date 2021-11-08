import type { DurationSeconds } from "$lib/eve-data/EveMarkets";

let defaultLocale = "en-US";

const iskAmountOptions = {
    useGrouping: true,
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,

}

export const FormatIskAmount = new Intl.NumberFormat(defaultLocale, {
    ...iskAmountOptions
}).format

export const FormatIskChange = new Intl.NumberFormat(defaultLocale, {
    ...iskAmountOptions,
    signDisplay: 'always'
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

const percentageOptions = {
    style: 'percent',
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
}

export const FormatPercentage = new Intl.NumberFormat(defaultLocale, {
    ...percentageOptions
}).format

export const FormatPercentageChange = new Intl.NumberFormat(defaultLocale, {
    ...percentageOptions,
    signDisplay: 'always'

}).format

export const FormatModifier = (value: number):string=>FormatPercentageChange(value/100);