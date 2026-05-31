import {AudioTransformer} from "../AudioTransformer";
import {Jungle} from "../Jungle";
import {Template} from "../../Template";

export class Troll extends AudioTransformer {
    public static readonly key = 'troll';

    public static get title(): string {
        return Template.__('Troll');
    }

    public async transform(audioBuffer: AudioBuffer): Promise<AudioBuffer> {
        const ctx = new OfflineAudioContext(audioBuffer.numberOfChannels, audioBuffer.length, audioBuffer.sampleRate);

        // Source
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;

        // Wobble
        const oscillator1 = ctx.createOscillator();
        oscillator1.frequency.value = -10;
        oscillator1.type = 'sawtooth';

        const oscillator2 = ctx.createOscillator();
        oscillator2.frequency.value = 50;
        oscillator2.type = 'sawtooth';

        const oscillator3 = ctx.createOscillator();
        oscillator3.frequency.value = 30;
        oscillator3.type = 'sawtooth';
        // ---
        const oscillatorGain = ctx.createGain();
        oscillatorGain.gain.value = 0.007;
        // ---
        const oscillatorGain2 = ctx.createGain();
        oscillatorGain2.gain.value = 0.007;
        // ---
        const delay = ctx.createDelay();
        delay.delayTime.value = 0.01;
        // ---
        const delay2 = ctx.createDelay();
        delay2.delayTime.value = 0.01;

        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 2000;

        const compressor = ctx.createDynamicsCompressor();
        const compressor2 = ctx.createDynamicsCompressor();
        const compressor3 = ctx.createDynamicsCompressor();
        const compressor4 = ctx.createDynamicsCompressor();
        const compressor5 = ctx.createDynamicsCompressor();

        // Create graph
        oscillator1.connect(oscillatorGain);
        oscillator2.connect(oscillatorGain);
        // oscillator3.connect(oscillatorGain);
        oscillatorGain.connect(delay.delayTime);
        // ---
        source.connect(compressor2)
        compressor2.connect(delay);
        delay.connect(compressor3)
        compressor3.connect(filter);
        filter.connect(compressor5)


        oscillator3.connect(oscillatorGain2);
        oscillatorGain2.connect(delay2.delayTime);

        source.connect(compressor)
        compressor.connect(delay2);
        delay2.connect(compressor4)
        compressor4.connect(filter)
        filter.connect(compressor5);

        compressor5.connect(ctx.destination);
        //
        //filter.connect(ctx.destination);
        //compressor.connect(ctx.destination);

        // source.connect(delay);
        // delay.connect(filter);
        // filter.connect(ctx.destination);

        // Render
        oscillator1.start(0);
        oscillator2.start(0);
        oscillator3.start(0);
        source.start(0);
        // fire.start(0);
        const outputAudioBuffer = await ctx.startRendering();
        return outputAudioBuffer;
    }
}