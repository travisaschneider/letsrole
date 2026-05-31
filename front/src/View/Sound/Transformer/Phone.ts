import {AudioTransformer} from "../AudioTransformer";
import {Template} from "../../Template";

export class Phone extends AudioTransformer {
    public static readonly key = 'phone';

    public static get title(): string {
        return Template.__('Phone');
    }

    public async transform(audioBuffer: AudioBuffer): Promise<AudioBuffer> {
        const ctx = new OfflineAudioContext(audioBuffer.numberOfChannels, audioBuffer.length, audioBuffer.sampleRate);
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;

        const lpf1 = ctx.createBiquadFilter();
        lpf1.type = "lowpass";
        lpf1.frequency.value = 2000.0;
        const lpf2 = ctx.createBiquadFilter();
        lpf2.type = "lowpass";
        lpf2.frequency.value = 2000.0;
        const hpf1 = ctx.createBiquadFilter();
        hpf1.type = "highpass";
        hpf1.frequency.value = 500.0;
        const hpf2 = ctx.createBiquadFilter();
        hpf2.type = "highpass";
        hpf2.frequency.value = 500.0;
        const compressor = ctx.createDynamicsCompressor();
        lpf1.connect( lpf2 );
        lpf2.connect( hpf1 );
        hpf1.connect( hpf2 );
        hpf2.connect( compressor );
        compressor.connect( ctx.destination );

        source.connect(lpf1);

        source.start(0);
        return await ctx.startRendering();
    }
}