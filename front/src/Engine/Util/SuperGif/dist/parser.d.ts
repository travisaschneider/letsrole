import { SuperGifStream } from './stream';
export declare class SuperGifParser {
    private stream;
    private handler;
    constructor(stream: SuperGifStream, handler: any);
    private parseCT;
    private readSubBlocks;
    private parseHeader;
    private parseExt;
    private parseImg;
    private parseBlock;
    parse(): void;
}
