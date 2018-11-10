import * as fs from 'fs';
import * as path from 'path';
import yaml from 'yaml';

export const run = (base: string | null = '.', force: boolean = false) =>
{
	if (base === null) {
		base = '.';
	}

	if (!force && fs.existsSync(path.join(base, "src")))
	{
		throw '"src" folder already exists in current working directory';
	}

	if (!fs.existsSync(path.join(base, ".vscode")))
		fs.mkdirSync(path.join(base, ".vscode"));
	let settings: any = {};
	if (fs.existsSync(path.join(base, '.vscode', 'settings.json')))
		settings = JSON.parse(fs.readFileSync(path.join(base, '.vscode', 'settings.json'), 'utf-8'));
	if (!settings)
		settings = {};
	settings["yaml.format.enable"] = true;
	settings["yaml.schemas"] = {};
	if (!settings["yaml.schemas"])
		settings["yaml.schemas"] = {};
	var schemas: string;
	if (fs.existsSync(path.join(__dirname, "..", "node_modules", "@halon", "json-schemas"))) {
		schemas = "file://" + path.join(__dirname, "..", "node_modules", "@halon", "json-schemas");
	} else {
		schemas = "file://" + path.join(__dirname, "..", "..", "json-schemas");
	}
	settings["yaml.schemas"][path.join(schemas, "smtpd.schema.json")] = "smtpd.yaml";
	settings["yaml.schemas"][path.join(schemas, "smtpd-app.schema.json")] = "smtpd-app.yaml";
	settings["yaml.schemas"][path.join(schemas, "queued.schema.json")] = "queued.yaml";
	settings["yaml.schemas"][path.join(schemas, "queued-app.schema.json")] = "queued-app.yaml";
	settings["yaml.schemas"][path.join(schemas, "dlpd.schema.json")] = "dlpd.yaml";
	settings["yaml.schemas"][path.join(schemas, "dlpd-app.schema.json")] = "dlpd-app.yaml";
	settings["yaml.schemas"][path.join(schemas, "httprd.schema.json")] = "httprd.yaml";
	settings["yaml.schemas"][path.join(schemas, "rated.schema.json")] = "rated.yaml";
	settings["yaml.schemas"][path.join(schemas, "rated-app.schema.json")] = "rated-app.yaml";
	fs.writeFileSync(path.join(base, ".vscode", "settings.json"), JSON.stringify(settings, null, 4));

	if (!fs.existsSync(path.join(base, "dist")))
		fs.mkdirSync(path.join(base, "dist"));
	fs.writeFileSync(path.join(base, "settings.json"), JSON.stringify(
		{
			smtpd: {
				build: { excludes: [] }
			},
			queued: {
				build: { excludes: [] }
			},
			ssh2: {
				host: "192.168.0.1",
				port: 22,
				username: "admin",
				password: "admin"
			},
			livestage: {
				id: "abcd",
				conditions: {
				}
			}
		}, null, 4));

	if (!fs.existsSync(path.join(base, "src")))
		fs.mkdirSync(path.join(base, "src"));
	if (!fs.existsSync(path.join(base, "src", "hooks")))
		fs.mkdirSync(path.join(base, "src", "hooks"));
	if (!fs.existsSync(path.join(base, "src", "files")))
		fs.mkdirSync(path.join(base, "src", "files"));
	if (!fs.existsSync(path.join(base, "src", "hooks", "connect")))
		fs.mkdirSync(path.join(base, "src", "hooks", "connect"));
	if (!fs.existsSync(path.join(base, "src", "hooks", "helo")))
		fs.mkdirSync(path.join(base, "src", "hooks", "helo"));
	if (!fs.existsSync(path.join(base, "src", "hooks", "auth")))
		fs.mkdirSync(path.join(base, "src", "hooks", "auth"));
	if (!fs.existsSync(path.join(base, "src", "hooks", "mailfrom")))
		fs.mkdirSync(path.join(base, "src", "hooks", "mailfrom"));
	if (!fs.existsSync(path.join(base, "src", "hooks", "rcptto")))
		fs.mkdirSync(path.join(base, "src", "hooks", "rcptto"));
	if (!fs.existsSync(path.join(base, "src", "hooks", "eod")))
		fs.mkdirSync(path.join(base, "src", "hooks", "eod"));
	if (!fs.existsSync(path.join(base, "src", "hooks", "eod", "rcpt")))
		fs.mkdirSync(path.join(base, "src", "hooks", "eod", "rcpt"));
	if (!fs.existsSync(path.join(base, "src", "config")))
		fs.mkdirSync(path.join(base, "src", "config"));
	if (!fs.existsSync(path.join(base, "src", "hooks", "queue")))
		fs.mkdirSync(path.join(base, "src", "hooks", "queue"));

	var smtpd = {
		servers: [
			{
				id: 'inbound',
				listeners: [
					{ port: 25 }
				],
				threads: {
					event: 4,
					script: 32
				},
			}
		]
	};
	fs.writeFileSync(path.join(base, "src", "config", "smtpd.yaml"), yaml.stringify(smtpd));
	var smtpd_app = {
		servers: [
			{
				id: 'inbound',
				transport: 'inbound',
				phases: {
					connect: {
						hook: 'inbound'
					}
				}
			}
		]
	};
	fs.writeFileSync(path.join(base, "src", "config", "smtpd-app.yaml"), yaml.stringify(smtpd_app));
	var queued_app = {
		transports: [
			{
				id: 'inbound',
				connection: {
					server: '192.168.0.25'
				},
				retry: {
					intervals: [
						{ interval: 0 }
					],
					count: 0
				}
			}
		]
	};
	fs.writeFileSync(path.join(base, "src", "config", "queued.yaml"), "");
	fs.writeFileSync(path.join(base, "src", "config", "queued-app.yaml"), yaml.stringify(queued_app));
	fs.writeFileSync(path.join(base, "src", "hooks", "connect", "inbound.hsl"), 'echo "Hello World";');
	fs.writeFileSync(path.join(base, "src", "hooks", "queue", "predelivery.hsl"), 'echo "Do";');
	fs.writeFileSync(path.join(base, "src", "hooks", "queue", "postdelivery.hsl"), 'echo "Done";');
}
