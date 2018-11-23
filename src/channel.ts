import * as pb from './protobuf';

export const statusLiveStage = async (stream: NodeJS.ReadWriteStream) =>
{
	var response = await sendAndWait(stream, packRequest("b"));
	if (response)
		return await pb.protobufLoader("smtpd.proto", "smtpd.ConfigGreenStatusResponse", response);
	return undefined;
}

export const cancelLiveStage = async (stream: NodeJS.ReadWriteStream) =>
{ 
    await sendAndWait(stream, packRequest("c"));
}

export const startLiveStage = (stream: NodeJS.ReadWriteStream, buffer: Buffer) =>
{ 
    return sendAndWait(stream, packRequest("a", buffer));
}

export const reloadConfig = async (stream: NodeJS.ReadWriteStream) =>
{ 
    await sendAndWait(stream, packRequest("r"));
}

export const getRates = async (stream: NodeJS.ReadWriteStream, paging: any, filter: any = {}) =>
{
    const buffer = await pb.protobufPacker("rated.proto", "rated.HSLRateRequest", { paging: paging, filter: filter });
    const response = await sendAndWait(stream, packRequest("i", buffer));

	if (response)
		return await pb.protobufLoader("rated.proto", "rated.HSLRateResponse", response);
	else
		return undefined;
}

export const clearRates = async (stream: NodeJS.ReadWriteStream, filter: any = {}) =>
{
	const buffer = await pb.protobufPacker("rated.proto", "rated.HSLRateClearRequest", filter);
	const response = await sendAndWait(stream, packRequest("j", buffer));

	if (response)
		return await pb.protobufLoader("rated.proto", "rated.HSLRateClearResponse", response);
	else
		return undefined;
}

export const getCache = async (stream: NodeJS.ReadWriteStream, program: string) =>
{
	const response = await sendAndWait(stream, packRequest("g"));

	if (response)
		return await pb.protobufLoader(program + ".proto", program + ".HSLCacheResponse", response);
	else
		return undefined;
}

export const clearCache = async (stream: NodeJS.ReadWriteStream, program: string, filter: any = {}) =>
{
	const buffer = await pb.protobufPacker(program + ".proto", program + ".HSLCacheClearRequest", filter);
	const response = await sendAndWait(stream, packRequest("h", buffer));

	if (response)
		return await pb.protobufLoader(program + ".proto", program + ".HSLCacheClearResponse", response);
	else
		return undefined;
}

export const discardPrefetchedQueue = async (stream: NodeJS.ReadWriteStream) =>
{ 
    await sendAndWait(stream, packRequest("l"));
}

const sendAndWait = async(stream: NodeJS.ReadWriteStream, data: Buffer) =>
{
	return new Promise<Buffer>((resolve, reject) => {
		var buffer = Buffer.alloc(0);
		stream.on('data', (data: Buffer) => {
			buffer = Buffer.concat([buffer, data]);
			if (buffer.length > 0)
			{
				if (buffer[0] == '+'.charCodeAt(0) || buffer[0] == 'E'.charCodeAt(0))
				{
					if (buffer.length >= 9)
					{
						const len = buffer.readUIntLE(1, 6);
						if (buffer.readUInt16LE(7) != 0)
							reject(Error("Too large response"));
						if (len == 0)
							resolve(undefined);
						if (buffer.length == len + 9)
						{
							if (buffer[0] == 'E'.charCodeAt(0))
								reject(Error(buffer.slice(9, len + 9).toString()));
							resolve(buffer.slice(9, len + 9));
						}
						if (buffer.length > len + 9)
							reject(Error("Too much data in response"));
					}
				} else {
					reject(Error('Invalid protocol response: ' + buffer[0]));
				}
			}
		});
		stream.write(data);
	});
}

export const setupIPC = (stream: NodeJS.ReadWriteStream, resolve: Function, reject: Function) =>
{
	var buffer = Buffer.alloc(0);
	stream.on('error', (err: any) => {
		reject(err)
	});
	stream.on('data', (data: Buffer) => {
		buffer = Buffer.concat([buffer, data]);
		if (buffer.length > 0)
		{
			if (buffer[0] == '+'.charCodeAt(0) || buffer[0] == 'E'.charCodeAt(0))
			{
				if (buffer.length >= 9)
				{
					const len = buffer.readUIntLE(1, 6);
					if (buffer.readUInt16LE(7) != 0)
						return reject(Error("Too large response"));
					if (len == 0)
					{
						buffer = Buffer.alloc(0);
						return resolve(undefined);
					}
					if (buffer.length == len + 9)
					{
						if (buffer[0] == 'E'.charCodeAt(0))
							return reject(Error(buffer.slice(9, len + 9).toString()));
						var buf = buffer.slice(9, len + 9);
						buffer = Buffer.alloc(0);
						return resolve(buf);
					}
					if (buffer.length > len + 9)
						return reject(Error("Too much data in response"));
				}
			} else {
				return reject(Error('Invalid protocol response: ' + buffer[0]));
			}
		}
	});
}

export const packRequest = (command: string, protobuf?: Buffer): Buffer =>
{
	if (!protobuf)
		return Buffer.from(command);
	var buf = Buffer.alloc(8);
	buf.writeUInt32LE(protobuf.length, 0);
	return Buffer.concat([Buffer.from(command), buf, protobuf]);
}