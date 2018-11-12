import path from "path";
import fs from "fs";
import AJV from 'ajv';

const findJSONSchemasRoot = () : string[] =>
{
	if (fs.existsSync(path.join(__dirname, "..", "node_modules", "@halon", "json-schemas"))) {
		return [__dirname, "..", "node_modules", "@halon", "json-schemas"];
	} else {
		return [__dirname, "..", "..", "json-schemas"];
	}
}

export const validate = (config: any) => 
{
    var ajv = new AJV();

    var smtpd = ajv.compile(JSON.parse(fs.readFileSync(path.join(...findJSONSchemasRoot(), "smtpd-app.schema.json")).toString()));
    if (!smtpd(config.smtpd)) throw { source: 'smtpd-app', errors: smtpd.errors };

    var queued = ajv.compile(JSON.parse(fs.readFileSync(path.join(...findJSONSchemasRoot(), "queued-app.schema.json")).toString()));
    if (!queued(config.queued)) throw { source: 'queued-app', errors: queued.errors };
}