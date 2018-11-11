import * as fs from 'fs';

export const Config = () =>
{
    if (!fs.existsSync("settings.json"))
        return {};
    return JSON.parse(fs.readFileSync("settings.json").toString());
}