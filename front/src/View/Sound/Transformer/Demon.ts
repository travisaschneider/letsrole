import {AudioTransformer} from "../AudioTransformer";
import {Jungle} from "../Jungle";
import {Template} from "../../Template";

export class Demon extends AudioTransformer {
    public static readonly key = 'demon';

    public static get title(): string {
        return Template.__('Demon');
    }

    public async transform(audioBuffer: AudioBuffer): Promise<AudioBuffer> {
        const distortionAmount = 100;
        const ctx = new OfflineAudioContext(audioBuffer.numberOfChannels, audioBuffer.length, audioBuffer.sampleRate);

        // Source
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;

        // Compressor
        const compressor = ctx.createDynamicsCompressor();
        compressor.threshold.value = -50;
        compressor.ratio.value = 16;

        // Wobble
        const oscillator = ctx.createOscillator();
        oscillator.frequency.value = 50;
        oscillator.type = 'sawtooth';
        // ---
        const oscillatorGain = ctx.createGain();
        oscillatorGain.gain.value = 0.004;
        // ---
        const delay = ctx.createDelay();
        delay.delayTime.value = 0.01;
        // ---
        const fireGain = ctx.createGain();
        fireGain.gain.value = 0.2;
        // ---
        const convolverGain = ctx.createGain();
        convolverGain.gain.value = 2;

        // Filter
        const filter = ctx.createBiquadFilter();
        filter.type = "highshelf";
        filter.frequency.value = 1000;
        filter.gain.value = 10;

        // Create graph
        oscillator.connect(oscillatorGain);
        oscillatorGain.connect(delay.delayTime);
        // ---
        source.connect(delay)
        //waveShaper.connect(convolver);

        convolverGain.connect(filter);
        filter.connect(compressor);

        fireGain.connect(ctx.destination);

        compressor.connect(ctx.destination);

        const filter2 = ctx.createBiquadFilter();
        filter2.type = "lowpass";
        filter2.frequency.value = 2000;
        const noConvGain = ctx.createGain();
        noConvGain.gain.value = 0.9;
        delay.connect(filter2);
        filter2.connect(filter);
        filter.connect(noConvGain);
        noConvGain.connect(compressor);

        // Render
        oscillator.start(0);
        source.start(0);

        const outputAudioBuffer = await ctx.startRendering();

        return outputAudioBuffer;
    }
}