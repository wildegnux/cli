#!/usr/bin/env node

import * as db from '../sequelize';
import * as utils from '../utils';
import { Config } from '../config';
import program from 'commander';

program
	.command('metric <metric>')
	.description('Return metric information about the mail queue')
	.option('-f, --format <format>', 'The output format to use (json|table)', 'json')
	.action((metric, options) => {
		let connector = db.Connector(Config(program.settings));
		if (metric === 'bytes') {
			db.getQueueSize(connector).then((response: any[]) => {
				connector.close();
				utils.formattedOutput({
					hold: response[0],
					deliver: response[1]
				}, options.format);
			}).catch((error) => {
				connector.close();
				console.error(error);
				process.exitCode = 2;
			});
		} else {
			db.getQueueCount(connector).then((response: any[]) => {
				connector.close();
				utils.formattedOutput({
					hold: response[0].count,
					deliver: response[1].count
				}, options.format);
			}).catch((error) => {
				connector.close();
				console.error(error);
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

program.option('-s, --settings [settings.json]', 'Specify settings file', 'settings.json');
program.parse(process.argv);
if (!program.args.length) program.help();