#!/usr/bin/env node

import * as remote from '../remote';
import * as utils from '../utils';
import { Config } from '../config';
import moment from 'moment';
import program from 'commander';
import { ConnectorFactory } from '../factory';

program
	.command('rates')
	.description('Get the HSL rates')
	.option('-l, --limit <number>', 'The paging limit', parseInt)
	.option('-n, --namespace <string>', 'The paging namespace')
	.option('-e, --entry <string>', 'The paging entry')
	.option('-c, --clear', 'Clear the HSL rates')
	.option('-f, --format <format>', 'The output format to use (json|table)', 'json')
	.option('-r, --readable', 'Output human-readable values')
	.action((options) => {
		var connector = ConnectorFactory(Config());
		if (options.clear) {
			remote.clearRates(connector).then((response: any) => {
				if (typeof response !== 'undefined') {
					const rates = { affected: response.affected };
					utils.formattedOutput(rates, options.format);
				}
				connector.dispose();
			}).catch((error) => {
				console.error(error);
				connector.dispose();
				process.exitCode = 2;
			});
		} else {
			const paging = {
				limit: options.limit || 10,
				namespace: options.namespace || null,
				entry: options.entry || null
			};
			remote.getRates(connector, paging).then((response: any) => {
				if (typeof response !== 'undefined' && response.item && response.item.length) {
					let rates: any = [];
					if (options.readable) {
						rates = response.item.map((rate: any) => {
							rate.count = rate.count;
							rate.localcount = rate.localcount;
							rate['rate (#/s)'] = (rate.oldest - rate.newest) && rate.count > 1 ? Number((rate.count / (rate.oldest - rate.newest)).toPrecision(3)) : 'n/a',
							rate.interval = (rate.oldest - rate.newest) ? moment().subtract(rate.newest, 'seconds').from(moment().subtract(rate.oldest, 'seconds'), true) : 'n/a',
							rate.newest = moment().subtract(rate.newest, 'seconds').fromNow();
							delete rate.oldest;
							return rate;
						});
					} else {
						rates = response.item.map((rate: any) => {
							rate.count = rate.count;
							rate.localcount = rate.localcount;
							rate.oldest = rate.oldest;
							rate.newest = rate.newest;
							return rate;
						});
					}
					utils.formattedOutput(rates, options.format);
				}
				connector.dispose();
			}).catch((error) => {
				console.error(error);
				connector.dispose();
				process.exitCode = 2;
			});
		}
	});

program
	.command('cache <program>')
	.description('Get the HSL cache')
	.option('-c, --clear', 'Clear the HSL cache')
	.option('-f, --format <format>', 'The output format to use (json|table)', 'json')
	.option('-r, --readable', 'Output human-readable values')
	.action((program, options) => {
		var connector = ConnectorFactory(Config());
		if (options.clear) {
			remote.clearCache(connector, program).then((response: any) => {
				if (typeof response !== 'undefined') {
					const cache = { affected: response.affected };
					utils.formattedOutput(cache, options.format);
				}
				connector.dispose();
			}).catch((error) => {
				console.error(error);
				connector.dispose();
				process.exitCode = 2;
			});
		} else {
			remote.getCache(connector, program).then((response: any) => {
				if (typeof response !== 'undefined' && response.item && response.item.length) {
					let cache: any = [];
					if (options.readable) {
						cache = response.item.map((item: any) => {
							item.maxsize = item.maxsize;
							item.size = item.size;
							item.hits = item.hits;
							item.misses = item.misses;
							item.drops = item.drops;
							item.hitrate = Math.round(((Number(item.hits) / (Number(item.hits) + Number(item.misses))) * 100)) + '%';
							return item;
						});
					} else {
						cache = response.item.map((item: any) => {
							item.maxsize = item.maxsize;
							item.size = item.size;
							item.hits = item.hits;
							item.misses = item.misses;
							item.drops = item.drops;
							return item;
						});
					}
					utils.formattedOutput(cache, options.format);
				}
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