import * as fs from 'fs';
import * as path from 'path';
import yaml from 'yaml';
import * as validate from './validate'

export const syntax = (file: string) =>
{
	var fileparse = path.parse(file);
	const filepath = fileparse.dir.split(path.sep);
	var result = {
		phase: "",
		data: "",
		files: <any>[]
	};
	var filespath = "";
	if (filepath.length > 2 && filepath.slice(-2, -1)[0] == "hooks")
	{
		if (filepath.slice(-1)[0] == 'queue')
			result.phase = fileparse.name;
		else
			result.phase = filepath.slice(-1)[0];
		filespath = path.join(fileparse.root, ...filepath.slice(0, -2), 'files');
	}
	else if (filepath.length > 3 && filepath.slice(-3, -2)[0] == "hooks")
	{
		if (filepath.slice(-2)[0] == 'eod' && filepath.slice(-1)[0] == 'rcpt')
			result.phase = 'eodrcpt';
		else
			throw Error('Unknown hooks directory in path');
		filespath = path.join(fileparse.root, ...filepath.slice(0, -3), 'files');
	}
	else
	{
		var index = filepath.findIndex((element, index, array) => {
			if (element == "src" && array[index + 1] == "files")
				return true;
			return false;
		});
		if (index == -1)
			throw Error('Could not find a src/files directory in path');
		filespath = path.join(fileparse.root, ...filepath.slice(0, index + 2));
	}
	result.data = fs.readFileSync(file).toString();

	for (let i of readdirSyncRecursive(filespath))
	{
		if (file == i)
			continue;
		result.files.push({
			id: path.relative(filespath, i),
			data: fs.readFileSync(i).toString()
		});
	}

	return result;
}

const readdirSyncRecursive = (dir: string) => {
	var results : string[] = [];
	var list = fs.readdirSync(dir);
	list.forEach((file) => {
		file = dir + path.sep + file;
		var stat = fs.statSync(file);
		if (stat && stat.isDirectory())
			results = results.concat(readdirSyncRecursive(file));
		else
			results.push(file);
	});
	return results;
}

const addFile = (config: any, script: any) =>
{
	if (!config.scripting)
		config.scripting = {};
	if (!config.scripting.files)
		config.scripting.files = [];
	config.scripting.files.push(script);
}

const addHook = (config: any, type: any, script: any) =>
{
	if (!config.scripting)
		config.scripting = {};
	if (!config.scripting.hooks)
		config.scripting.hooks = {};
	if (!config.scripting.hooks[type])
		config.scripting.hooks[type] = [];
	config.scripting.hooks[type].push(script);
}

const extractHooks = (config: any) =>
{
	var hooks: any = {
		'connect': [],
		'helo': [],
		'auth': [],
		'mailfrom': [],
		'rcptto': [],
		'eod': [],
		'eodrcpt': [],
	};
	if (config.servers) {
		for (let server of config.servers) {
			if (server.phases)
			{
				if (server.phases.connect && server.phases.connect.hook)
					hooks.connect.push(server.phases.connect.hook);
				if (server.phases.helo && server.phases.helo.hook)
					hooks.helo.push(server.phases.helo.hook);
				if (server.phases.auth && server.phases.auth.hook)
					hooks.auth.push(server.phases.auth.hook);
				if (server.phases.mailfrom  && server.phases.mailfrom.hook)
					hooks.mailfrom.push(server.phases.mailfrom.hook);
				if (server.phases.rcptto && server.phases.rcptto.hook)
				{
					var hook = server.phases.rcptto.hook;
					if (typeof hook == "string")
						hooks.rcptto.push(hook);
					else
					{
						if (hook.id)
							hooks.rcptto.push(hook.id);
						if (hook.recipientdomains)
						{
							for (let i in hook.recipientdomains)
								hooks.rcptto.push(hook.recipientdomains[i]);
						}
					}
				}
				if (server.phases.eod && server.phases.eod.hook)
					hooks.eod.push(server.phases.eod.hook);
				if (server.phases.eod && server.phases.eod.rcpt && server.phases.eod.rcpt.hook)
				{
					var hook = server.phases.eod.rcpt.hook;
					if (typeof hook == "string")
						hooks.eodrcpt.push(hook);
					else
					{
						if (hook.id)
							hooks.eodrcpt.push(hook.id);
						if (hook.recipientdomains)
						{
							for (let i in hook.recipientdomains)
								hooks.eodrcpt.push(hook.recipientdomains[i]);
						}
					}
				}
			}
		}
	}
	Object.keys(hooks).forEach(x => {
		hooks[x] = [...new Set(hooks[x])];
	})
	return hooks;
}

export const run = (base: string = '.') =>
{
	var config = generate(base);

	fs.writeFileSync(path.join(base, "dist", "smtpd-app.yaml"), yaml.stringify(config.smtpd));
	fs.writeFileSync(path.join(base, "dist", "queued-app.yaml"), yaml.stringify(config.queued));
}

export const generate = (base: string = '.') =>
{
	var returnValue = { smtpd: "", queued: ""};
	var usersettings = JSON.parse(fs.readFileSync(path.join(base, "settings.json")).toString());
	{
		if (!fs.existsSync(path.join(base, "dist")))
			fs.mkdirSync(path.join(base, "dist"));

		var config = yaml.parse(fs.readFileSync(path.join(base, "src", "config", "smtpd-app.yaml")).toString());
		const hooks = extractHooks(config);

		var entries: any = Object.entries(hooks);
		for (let [type, value] of entries)
		{
			for (let id of value)
			{
				var hookfolder = [type];
				if (type == "eodrcpt")
					hookfolder = ["eod", "rcpt"];
				addHook(config, type, {
					id: id,
					data: fs.readFileSync(path.join(base, "src", "hooks", ...hookfolder, id + ".hsl")).toString()
				});
			}
		}

		for (let i of readdirSyncRecursive(path.join(base, "src", "files")))
		{
			var exclude : string[] = usersettings &&
			usersettings.smtpd &&
			usersettings.smtpd.build &&
			usersettings.smtpd.build.exclude ? usersettings.smtpd.build.exclude : [];
			if (exclude.indexOf(path.relative(path.join(base, "src", "files"), i)) != -1)
				continue;

			addFile(config, {
				id: path.relative(path.join(base, "src", "files"), i),
				data: fs.readFileSync(i).toString()
			});
		}
		returnValue.smtpd = config;
	}

	{
		var config = yaml.parse(fs.readFileSync(path.join(base, "src", "config", "queued-app.yaml")).toString());

		var filePath = path.join(base, "src", "hooks", "queue", "predelivery.hsl");
		if (fs.existsSync(filePath))
		{
			if (!config.scripting) config.scripting = {};
			if (!config.scripting.hooks) config.scripting.hooks = {};
			config.scripting.hooks.predelivery = fs.readFileSync(filePath).toString();
		}

		filePath = path.join(base, "src", "hooks", "queue", "postdelivery.hsl");
		if (fs.existsSync(filePath))
		{
			if (!config.scripting) config.scripting = {};
			if (!config.scripting.hooks) config.scripting.hooks = {};
			config.scripting.hooks.postdelivery = fs.readFileSync(filePath).toString();
		}

		for (let i of readdirSyncRecursive(path.join(base, "src", "files")))
		{
			var exclude : string[] = usersettings &&
			usersettings.queued &&
			usersettings.queued.build &&
			usersettings.queued.build.exclude ? usersettings.queued.build.exclude : [];
			if (exclude.indexOf(path.relative(path.join(base, "src", "files"), i)) != -1)
				continue;

			addFile(config, {
				id: path.relative(path.join(base, "src", "files"), i),
				data: fs.readFileSync(i).toString()
			});
		}
		returnValue.queued = config;
	}

	validate.validate(returnValue);
	return returnValue;
}