import yaml from "yaml";
import * as pb from './protobuf';
import * as channel from './channel';
import { generate } from './build';
import { IConnector, ExecProgram } from './factory';

const smtpd_socket = "/var/run/halon/smtpd.ctl";
const queued_socket = "/var/run/halon/queued.ctl";
const dlpd_socket = "/var/run/halon/dlpd.ctl";
const rated_socket = "/var/run/halon/rated.ctl";
const hsllint_program = "/opt/halon/bin/hsl-lint";
const hsh_program = "/opt/halon/bin/hsh";

export const syntax = async (connector: IConnector, syntax: any) =>
{
	return new Promise(async (resolve, reject) => {
		var stderr = Buffer.alloc(0);
		var program = await connector.exec(hsllint_program, []);
		program.on('close', (code: number, signal: string) => {
			switch (code)
			{
				case 0: resolve(undefined); break;
				case 1: resolve(yaml.parse(stderr.toString())); break;
				default: reject(Error("hsl-lint exited with code: " + code + ", stderr: " + stderr.toString()));
			}
		});
		program.on('data', (data: Buffer) => {
			console.log(data);
		});
		program.stderr.on('data', (data: Buffer) => {
			stderr = Buffer.concat([stderr, data]);
		});
		program.stdin.end(yaml.stringify(syntax));
	});
}

export const startLiveStage = async (connector: IConnector, id: string, conditions: any, config: string, config2: string) =>
{
	const sbuffer = await pb.protobufPacker("smtpd.proto", "smtpd.ConfigGreenDeployRequest", { id: id, conditions: conditions, config: config });
	const qbuffer = await pb.protobufPacker("queued.proto", "queued.ConfigGreenDeployRequest", { id: id, conditions: conditions, config: config2 });

	return new Promise(async (resolve, reject) => {
		var s = await connector.openChannel(smtpd_socket);
		var q = await connector.openChannel(queued_socket);
		channel.startLiveStage(q, qbuffer).then(() => {
			channel.startLiveStage(s, sbuffer).then(() => {
				q.end();
				s.end();
				resolve(undefined);
			}).catch(async (err) => {
				await channel.cancelLiveStage(q);
				await channel.cancelLiveStage(s);
				q.end();
				s.end();
				reject(err);
			});
		}).catch(async (err) => {
			await channel.cancelLiveStage(s);
			q.end();
			s.end();
			reject(err);
		});
	});
}

export const cancelLiveStage = async (connector: IConnector) =>
{
	var s = await connector.openChannel(smtpd_socket);
	await channel.cancelLiveStage(s);
	s.end();
	var q = await connector.openChannel(queued_socket);
	await channel.cancelLiveStage(q);
	q.end();
}

export const statusLiveStage = (connector: IConnector) =>
{
	return new Promise((resolve, reject) => {
		connector.openChannel(smtpd_socket).then((stream) => {
			channel.statusLiveStage(stream).then((result) => {
				stream.end();
				resolve(result);
			}).catch((error) => {
				stream.end();
				reject(error);
			});
		}).catch(reject);
	});
}

export const getRates = (connector: IConnector, paging: any, filter: any = {}) =>
{
	return new Promise((resolve, reject) => {
		connector.openChannel(rated_socket).then((stream) => {
			channel.getRates(stream, paging, filter).then((result) => {
				stream.end();
				resolve(result);
			}).catch((error) => {
				stream.end();
				reject(error);
			});
		}).catch(reject);
	});
}

export const clearRates = (connector: IConnector, filter: any = {}) =>
{
	return new Promise((resolve, reject) => {
		connector.openChannel(rated_socket).then((stream) => {
			channel.clearRates(stream, filter).then((result) => {
				stream.end();
				resolve(result);
			}).catch((error) => {
				stream.end();
				reject(error);
			});
		}).catch(reject);
	});
}

export const getCache = async (connector: IConnector, program: string) =>
{
	var sock = "";
	if (program == "smtpd")
		sock = smtpd_socket;
	else if (program == "queued")
		sock = queued_socket;
	else
		throw Error("No such program");

	return new Promise((resolve, reject) => {
		connector.openChannel(sock).then((stream) => {
			channel.getCache(stream, program).then((result) => {
				stream.end();
				resolve(result);
			}).catch((error) => {
				stream.end();
				reject(error);
			});
		}).catch(reject);
	});
}

export const clearCache = (connector: IConnector, program: string, filter: any = {}) =>
{
	var sock = "";
	if (program == "smtpd")
		sock = smtpd_socket;
	else if (program == "queued")
		sock = queued_socket;
	else
		throw Error("No such program");

	return new Promise((resolve, reject) => {
		connector.openChannel(sock).then((stream) => {
			channel.clearCache(stream, program, filter).then((result) => {
				stream.end();
				resolve(result);
			}).catch((error) => {
				stream.end();
				reject(error);
			});
		}).catch(reject);
	});
}

export const reloadConfig = (connector: IConnector, program: string) =>
{
	var sock = "";
	if (program == "smtpd")
		sock = smtpd_socket;
	else if (program == "queued")
		sock = queued_socket;
	else if (program == "dlpd")
		sock = dlpd_socket;
	else if (program == "rated")
		sock = rated_socket;
	else
		throw Error("No such program");

	return new Promise((resolve, reject) => {
		connector.openChannel(sock).then((stream) => {
			channel.reloadConfig(stream).then(() => {
				stream.end();
				resolve(undefined);
			}).catch((error) => {
				stream.end();
				reject(error);
			});
		}).catch(reject);
	});
}

export const run = async (connector: IConnector, entrypoint: string) =>
{
	const debugsocket = "/tmp/hsh-debug." + (new Date()).getTime();
	return new Promise(async (resolve, reject) => {
		connector.openServerChannel(debugsocket, (debugChannel) => {
			var cmd = 'e';
			channel.setupIPC(debugChannel, async (response: any) => {
				try {
					if (cmd == 'e')
					{
						if (!response)
							return;
						console.log(await pb.protobufLoader("hsh.proto", "hsh.HSLBreakPointResponse", response));
						cmd = 'f';
						debugChannel.write(channel.packRequest("f"));
					}
					else if (cmd == 'f')
					{
						cmd = 'e';
						debugChannel.write(channel.packRequest("e"));
					}
				} catch (error) {
					console.log(error);
				}
			}, (e: any) => {
				// handle done!
				if (e.errno != 'EPIPE')
					console.log(e);
			});
			debugChannel.write(channel.packRequest("e"));
		}).then((s: any) => {
			connector.exec(hsh_program, ["-c", "/dev/null", "-C", debugsocket, "-A", "-", "-"]).then((program: ExecProgram) => {
				program.on('close', (code: number, signal: string) => {
					connector.closeServerChannel(s);
					resolve({ code: code });
				});
				program.stdout.on('data', (data: Buffer) => {
					process.stdout.write(data.toString());
				});
				program.stderr.on('data', (data: Buffer) => {
					process.stderr.write(data.toString());
				});
				var config : any = generate().smtpd;
				config.__entrypoint = 'include "' + entrypoint + '";';
				program.stdin.end(yaml.stringify(config));
			});
		}).catch(reject);
	});
}

export const discardPrefetchedQueue = async (connector: IConnector) =>
{
	var q = await connector.openChannel(queued_socket);
	await channel.discardPrefetchedQueue(q);
	q.end();
}