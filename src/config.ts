import * as fs from 'fs';

export const Config = (path: string) =>
{
    if (!fs.existsSync(path))
        return {};
    return JSON.parse(fs.readFileSync(path).toString());
}