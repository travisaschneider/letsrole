import {AudioTransformer} from "../AudioTransformer";
import {Template} from "../../Template";

export class None extends AudioTransformer {
    public static readonly key = 'none';

    public static get title(): string {
        return Template.__('No Transformation');
    }

    public async transform(audioBuffer: AudioBuffer): Promise<AudioBuffer> {
        return Promise.resolve(audioBuffer);
    }
}