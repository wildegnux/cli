import { Client, ClientChannel } from 'ssh2';
import net from 'net';
import * as stream from 'stream';
import { EventEmitter } from 'events';
import * as child_process from 'child_process';

export interface ExecProgram extends EventEmitter
{
    stdin: stream.Writable
    stdout: stream.Readable
    stderr: stream.Readable
}

export interface IConnector
{
    openChannel: (path: string) => Promise<NodeJS.ReadWriteStream>
    openServerChannel: (path: string, callback: (stream: NodeJS.ReadWriteStream) => void) => any
    closeServerChannel: (server: any) => void
    exec: (program: string, argv: string[]) => Promise<ExecProgram>
    dispose: () => void
}

export const ConnectorFactory = (settings: any) =>
{
	if (settings.ssh2)
        return new SSH2Connector(settings.ssh2);
    return new UNIXConnector();
}

export class SSH2Connector implements IConnector
{
    settings: any;
    conn?: Client;
	constructor(settings: any)
	{
        this.settings = settings;
    }
    async openServerChannel(path: string, callback: (stream: NodeJS.ReadWriteStream) => void)
    {
		return new Promise<any>(async (resolve, reject) => {
            if (!this.conn)
                this.conn = await connect(this.settings);
            this.conn.openssh_forwardInStreamLocal(path, (err) => {
                reject(err);
            });
            this.conn.on('unix connection', (info: any, accept: any, reject: any) => {
                callback(accept());
            });
            resolve(path);
        });
    }
    closeServerChannel(server: any)
    {
        if (this.conn)
            this.conn.openssh_unforwardInStreamLocal(server);
    }
	async openChannel(path: string)
	{
        if (!this.conn)
            this.conn = await connect(this.settings);
		return await openChannel(this.conn, path);
    }
    async exec(program: string, argv: string[])
    {
        if (!this.conn)
            this.conn = await connect(this.settings);
        return await exec(this.conn, program + " " + argv.join(" "));
    }
    dispose()
    {
        if (this.conn)
            this.conn.end();
    }
}

export class UNIXConnector implements IConnector
{
	async openChannel(path: string)
	{
		return new Promise<NodeJS.ReadWriteStream>((resolve, reject) => {
			const client = net.createConnection({ path: path }, async () => {
				resolve(client);
			});
		});
    }
    async openServerChannel(path: string, callback: (stream: NodeJS.ReadWriteStream) => void)
    {
        return new Promise<any>(async (resolve, reject) => {
            var s = net.createServer((client) => {
                callback(client);
            });
            s.listen(path);
            resolve(s);
        });
    }
    closeServerChannel(server: any)
    {
        server.close();
    }
	async exec(program: string, argv: string[])
	{
		return new Promise<ExecProgram>((resolve, reject) => {
			resolve(child_process.spawn(program, argv));
		});
	}
	dispose()
	{
	}
}

export const openChannel = async(client: Client, channel: string) =>
{
	return new Promise<ClientChannel>((resolve, reject) => {
		client.openssh_forwardOutStreamLocal(channel, (err, stream) => {
			if (err) reject(err);
			resolve(stream);
		});
	});
}

const connect = async (settings: any) =>
{
	return new Promise<Client>((resolve, reject) => {
		var conn = new Client();
		conn.on('error', (err) => {
			conn.end();
			reject(err);
		});
		conn.on('ready', () => {
			resolve(conn);
        });
		conn.connect(settings);
	});
}

export const exec = async (client: Client, program: string) =>
{
	return new Promise<ExecProgram>((resolve, reject) => {
		client.exec(program, (err, stream) => {
            if (err) reject(err);
            resolve(stream);
		});
	});
}
