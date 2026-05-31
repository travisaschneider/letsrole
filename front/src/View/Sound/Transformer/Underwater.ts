import {AudioTransformer} from "../AudioTransformer";
import {Template} from "../../Template";

export class Underwater extends AudioTransformer {
    public static readonly key = 'underwater';

    public static get title(): string {
        return Template.__('Underwater');
    }

    public async transform(audioBuffer: AudioBuffer): Promise<AudioBuffer> {
        const ctx = new OfflineAudioContext(audioBuffer.numberOfChannels, audioBuffer.length, audioBuffer.sampleRate);

        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;

        const compressor1 = ctx.createDynamicsCompressor();
        const compressor2 = ctx.createDynamicsCompressor();
        const inputGain = ctx.createGain();
        inputGain.gain.value = 0.5;
        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 500;

        /*let underwater = ctx.createBufferSource();
        underwater.buffer = await ctx.decodeAudioData(await (await fetch("../audio/backgrounds/underwater1.mp3")).arrayBuffer());
        underwater.loop = true;*/
        const underwaterGain = ctx.createGain();
        underwaterGain.gain.value = 0.3;

        const Tuna: any = window['Tuna'];

        const tuna = new Tuna(ctx);
        const effect = new tuna.WahWah({
            automode: true,                //true/false
            baseFrequency: 0.02,            //0 to 1
            excursionOctaves: 1,           //1 to 6
            sweep: 0.2,                    //0 to 1
            resonance: 10,                 //1 to 100
            sensitivity: 0.5,              //-1 to 1
            bypass: 0
        });

        source.connect(inputGain);
        inputGain.connect(effect.input);
        effect.connect(filter);
        filter.connect(compressor2);
        compressor2.connect(ctx.destination);

        //underwater.connect(underwaterGain);
        underwaterGain.connect(compressor2);

        source.start(0);
        //underwater.start(0);
        return await ctx.startRendering();
    }
}