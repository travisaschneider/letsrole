import {AudioTransformer} from "../AudioTransformer";
import {Jungle} from "../Jungle";
import {Template} from "../../Template";

export class HighPitch extends AudioTransformer {
    public static readonly key = 'high-pitch';

    public static get title(): string {
        return Template.__('High Pitch');
    }

    public async transform(audioBuffer: AudioBuffer): Promise<AudioBuffer> {
        const pitchMod = 2;
        const ctx = new OfflineAudioContext(audioBuffer.numberOfChannels, audioBuffer.length, audioBuffer.sampleRate);

        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;

        const pitchChangeEffect = new Jungle(ctx);

        const compressor = ctx.createDynamicsCompressor();
        source.connect(pitchChangeEffect.input)
        pitchChangeEffect.output.connect(compressor)
        pitchChangeEffect.setPitchOffset(pitchMod);

        compressor.connect(ctx.destination);

        source.start(0);

        return await ctx.startRendering();
    }
}