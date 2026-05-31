import {AudioTransformer} from "../AudioTransformer";
import {Jungle} from "../Jungle";
import {Template} from "../../Template";

export class Megaphone extends AudioTransformer {
    public static readonly key = 'megaphone';

    public static get title(): string {
        return Template.__('Megaphone');
    }

    public async transform(audioBuffer: AudioBuffer): Promise<AudioBuffer> {
        const ctx = new OfflineAudioContext(audioBuffer.numberOfChannels, audioBuffer.length, audioBuffer.sampleRate);
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;

        // Wave shaper
        const waveShaper = ctx.createWaveShaper();
        waveShaper.curve = makeDistortionCurve(30);
        function makeDistortionCurve(amount) {
            const k = typeof amount === 'number' ? amount : 50;
            const n_samples = 44100;
            const curve = new Float32Array(n_samples);
            const deg = Math.PI / 180;
            let x;
            for (let i = 0; i < n_samples; ++i ) {
                x = i * 2 / n_samples - 1;
                curve[i] = ( 3 + k ) * x * 20 * deg / (Math.PI + k * Math.abs(x));
            }
            return curve;
        }

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
        hpf2.connect( waveShaper );
        waveShaper.connect( compressor );
        compressor.connect( ctx.destination );

        source.connect(lpf1);

        source.start(0);
        return await ctx.startRendering();
    }
}