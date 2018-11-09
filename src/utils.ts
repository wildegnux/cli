import highlight from 'cli-highlight';

export const printTable = (data: any) =>
{
    var version = process.version.match(/^v(\d+\.\d+)/);
    if (!version || Number(version[1]) < 10)
        console.log(data);
    else
        console.table(data);
}

export const formattedOutput = (data: any, format: string) =>
{
    switch (format) {
        case 'json':
            console.log(highlight(JSON.stringify(data, null, 2)));
            break;
        case 'table':
            printTable(data);
            break;
        default:
            printTable(data);
            break;
    }
}