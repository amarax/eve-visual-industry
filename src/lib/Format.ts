let defaultLocale = "en-US";

export const FormatIskAmount = new Intl.NumberFormat(defaultLocale, {
    useGrouping: true,
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
}).format