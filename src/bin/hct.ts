#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import * as init from '../init';
import * as remote from '../remote';
import * as build from '../build';
import * as utils from '../utils';
import { Config } from '../config';
import ora from 'ora';
import program from 'commander';
import { ConnectorFactory, IConnector } from '../factory';

program
	.command('init')
	.description('Initialize environment')
	.option('-f, --force', 'Force initialization on existing folder')
	.action((options) => {
		init.run(null, options.force || false);
		console.log("Initialized environment in " + process.cwd());
	});

program
	.command('build')
	.description('Build the configuration files')
	.action((options) => {
		try {
			build.run();
			console.log('Configuration files were created successfully');
		} catch (e) {
			console.error(e);
			console.log('Failed');
			process.exitCode = 1;
		}
	});

program
	.command('syntax <file>')
	.description('Validate a HSL script')
	.action((file, options) => {
		const syntaxobject = build.syntax(file);
		var connector = ConnectorFactory(Config());
		remote.syntax(connector, syntaxobject).then((syntaxerror) => {
			if (syntaxerror) {
				console.log(syntaxerror);
				process.exitCode = 1;
			} else
				console.log("OK");
			connector.dispose();
		}).catch((error) => {
			console.error(error);
			connector.dispose();
			process.exitCode = 2;
		});
	});

program
	.command('run <file>')
	.description('Run a HSL script')
	.action((file, options) => {
		var connector = ConnectorFactory(Config());
		remote.run(connector, file).then((res: any) => {
			process.exitCode = res.code;
			connector.dispose();
		}).catch((error) => {
			console.error(error);
			connector.dispose();
			process.exitCode = 2;
		});
	});

program
	.command('reload <program>')
	.description('Reload a program')
	.action((program, options) => {
		var connector = ConnectorFactory(Config());
		remote.reloadConfig(connector, program).then(() => {
			console.log("OK");
			connector.dispose();
		}).catch((error) => {
			console.error(error);
			connector.dispose();
			process.exitCode = 2;
		});
	});


const spinnerUntilDone = (connector: IConnector) =>
{
	return new Promise(async (resolve, reject) => {
		const sleep = (ms: number) => {
			return new Promise(resolve => setTimeout(resolve, ms));
		};
		var isRunning = false;
		const spinner = ora({ text: 'Loading...' }).start();
		try {
			while (true) {
				var r : any = await remote.statusLiveStage(connector);
				if (!r) {
					if (!isRunning)
						spinner.fail('No live stage is running');
					else
						spinner.stopAndPersist();
					resolve();
					break;
				}
				isRunning = true;
				var count = r.count;
				if (r.conditions && r.conditions.count)
					count += "/" + r.conditions.count;
				var time = r.time;
				if (r.conditions && r.conditions.time) {
					time += "/" + r.conditions.time;
				}
				if (r.expired == true) {
					spinner.succeed(r.id + ': ' + count + ' connection(s), ' + time + 's runtime');
					resolve();
					break;
				}
				spinner.text = r.id + ': ' + count + ' connection(s), ' + time + 's runtime';
				await sleep(1000);
			}
		} catch (e) {
			spinner.fail(e);
			reject();
		}
	});
}

program
	.command('livestage <command>')
	.description('Manage the live staging')
	.option('-w, --watch', 'Watch mode (while running)')
	.action((command, options) => {
		const commands = ['start', 'status', 'cancel'];
		if (!commands.includes(command)) {
			console.error('Invalid command');
			process.exit(2);
		}
		const settings = Config();
		var connector = ConnectorFactory(settings);
		if (command == 'start') {
			const config = fs.readFileSync(path.join("dist", "smtpd-app.yaml")).toString();
			const config2 = fs.readFileSync(path.join("dist", "queued-app.yaml")).toString();
			const conditions = settings.livestage && settings.livestage.conditions ? settings.livestage.conditions : {};
			const id = settings.livestage && settings.livestage.id ? settings.livestage.id : "abcd";
			remote.startLiveStage(connector, id, conditions, config, config2).then(() => {
				if (options.watch) {
					var interrupted = false;
					process.on('SIGINT', () => {
						remote.cancelLiveStage(connector).then(() => {
							interrupted = true;
						}).catch((error) => {
							console.error(error);
							connector.dispose();
							process.exitCode = 2;
						});
					});
					spinnerUntilDone(connector).then(() => {
						if (interrupted)
							console.log('Live stage interrupted');
						connector.dispose();
					}).catch(() => {
						console.log('Live stage error');
						connector.dispose();	
						process.exitCode = 2;
					});
				} else {
					console.log('Live stage started');
					connector.dispose();	
				}
			}).catch((error) => {
				console.error(error);
				connector.dispose();
				process.exitCode = 2;
			});
		}
		if (command == 'status') {
			if (options.watch) {
				spinnerUntilDone(connector).then(() => {
					connector.dispose();
				}).catch(() => {
					connector.dispose();	
					process.exitCode = 2;
				});
			} else {
				remote.statusLiveStage(connector).then((status: any) => {
					if (!status)
					{
						console.log("No live stage is running");
						process.exitCode = 1;
					} else {
						utils.formattedOutput(status, 'json');
					}
					connector.dispose();
				}).catch((error) => {
					console.error(error);
					connector.dispose();
					process.exitCode = 2;
				})
			}
		}
		if (command == 'cancel') {
			remote.cancelLiveStage(connector).then(() => {
				console.log('Live stage cancelled');
				connector.dispose();
			}).catch((error) => {
				console.error(error);
				connector.dispose();
				process.exitCode = 2;
			});
		}
	});

program
	.command('*')
	.action(() => {
		console.error('Unknown command');
		process.exitCode = 2;
	});

program.parse(process.argv);
if (!program.args.length) program.help();