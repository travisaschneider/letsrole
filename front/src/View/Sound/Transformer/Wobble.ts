import {AudioTransformer} from "../AudioTransformer";
import {Jungle} from "../Jungle";
import {Template} from "../../Template";

export class Wobble extends AudioTransformer {
    public static readonly key = 'wobble';

    public static get title(): string {
        return Template.__('Wobble');
    }

    public async transform(audioBuffer: AudioBuffer): Promise<AudioBuffer> {
        const ctx = new OfflineAudioContext(audioBuffer.numberOfChannels, audioBuffer.length, audioBuffer.sampleRate);

        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;

        const oscillator = ctx.createOscillator();
        oscillator.frequency.value = 1;
        oscillator.type = 'sine';

        const oscillatorGain = ctx.createGain();
        oscillatorGain.gain.value = 0.05;

        const delay = ctx.createDelay();
        delay.delayTime.value = 0.05;

        // source --> delay --> ctx.destination
        // oscillator --> oscillatorGain --> delay.delayTime --> ctx.destination

        source.connect(delay);
        delay.connect(ctx.destination);

        oscillator.connect(oscillatorGain);
        oscillatorGain.connect(delay.delayTime);

        oscillator.start();
        source.start();

        const outputAudioBuffer = await ctx.startRendering();
        return outputAudioBuffer;
    }
}