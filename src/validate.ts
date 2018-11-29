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

export const validate = (config: { smtpd?: any, queued?: any, smtpd_app?: any, queued_app?: any, httprd?: any, rated?: any, dlpd?: any, dlpd_app?: any }) => 
{
    let ajv = new AJV();

    if (config.smtpd) {
        let smtpd = ajv.compile(JSON.parse(fs.readFileSync(path.join(...findJSONSchemasRoot(), "smtpd.schema.json")).toString()));
        if (!smtpd(config.smtpd)) throw { source: 'smtpd', errors: smtpd.errors };
    }

    if (config.queued) {
        let queued = ajv.compile(JSON.parse(fs.readFileSync(path.join(...findJSONSchemasRoot(), "queued.schema.json")).toString()));
        if (!queued(config.queued)) throw { source: 'queued', errors: queued.errors };
    }

    if (config.smtpd_app) {
        let smtpd_app = ajv.compile(JSON.parse(fs.readFileSync(path.join(...findJSONSchemasRoot(), "smtpd-app.schema.json")).toString()));
        if (!smtpd_app(config.smtpd_app)) throw { source: 'smtpd-app', errors: smtpd_app.errors };
    }

    if (config.queued_app) {
        let queued_app = ajv.compile(JSON.parse(fs.readFileSync(path.join(...findJSONSchemasRoot(), "queued-app.schema.json")).toString()));
        if (!queued_app(config.queued_app)) throw { source: 'queued-app', errors: queued_app.errors };
    }

    if (config.httprd) {
        let httprd = ajv.compile(JSON.parse(fs.readFileSync(path.join(...findJSONSchemasRoot(), "httprd.schema.json")).toString()));
        if (!httprd(config.httprd)) throw { source: 'httprd', errors: httprd.errors };
    }

    if (config.rated) {
        let rated = ajv.compile(JSON.parse(fs.readFileSync(path.join(...findJSONSchemasRoot(), "rated.schema.json")).toString()));
        if (!rated(config.rated)) throw { source: 'rated', errors: rated.errors };
    }

    if (config.dlpd) {
        let dlpd = ajv.compile(JSON.parse(fs.readFileSync(path.join(...findJSONSchemasRoot(), "dlpd.schema.json")).toString()));
        if (!dlpd(config.dlpd)) throw { source: 'dlpd', errors: dlpd.errors };
    }

    if (config.dlpd_app) {
        let dlpd_app = ajv.compile(JSON.parse(fs.readFileSync(path.join(...findJSONSchemasRoot(), "dlpd-app.schema.json")).toString()));
        if (!dlpd_app(config.dlpd_app)) throw { source: 'dlpd-app', errors: dlpd_app.errors };
    }
}