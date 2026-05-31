import {AudioTransformer} from "../AudioTransformer";
import {Jungle} from "../Jungle";
import {Template} from "../../Template";

export class Announcement extends AudioTransformer {
    public static readonly key = 'announcement';

    public static get title(): string {
        return Template.__('Bad Connection');
    }

    public async transform(audioBuffer: AudioBuffer): Promise<AudioBuffer> {
        const channels = [];
        for(let i = 0; i < audioBuffer.numberOfChannels; i++) { channels[i] = new Float32Array(audioBuffer.getChannelData(i)); }

        // Run worker
        const outputChannels: any = await this.doWorkerTask(function() {
            self.onmessage = function(e) {

                const inputChannels = e.data.channels;
                const sampleRate = e.data.sampleRate;
                const secondsPerChunk = 2;
                const samplesPerChunk = secondsPerChunk*sampleRate;

                const outputChannels = [];
                for(let i = 0; i < inputChannels.length; i++) {

                    const input = inputChannels[i];
                    const output = new Float32Array(input.length);
                    const m = 0;
                    let doFlip = false;
                    for(let j = 0; j < input.length; j++) {
                        if(j%100 === 0 && Math.random() < 0.2) { doFlip = !doFlip; }
                        if(doFlip) {
                            output[j] = Math.abs(input[j]);
                        } else {
                            output[j] = input[j];
                        }
                    }

                    outputChannels.push(output);

                }

                // @ts-ignore
                self.postMessage(outputChannels, [...outputChannels.map(c => c.buffer), ...inputChannels.map(c => c.buffer)]);
                self.close();

            }
        }, {channels, sampleRate:audioBuffer.sampleRate}, channels.map(c => c.buffer))

        const ctx = new OfflineAudioContext(audioBuffer.numberOfChannels, outputChannels[0].length, audioBuffer.sampleRate);

        audioBuffer = ctx.createBuffer(outputChannels.length, outputChannels[0].length, audioBuffer.sampleRate);
        for(let i = 0; i < outputChannels.length; i++) { audioBuffer.copyToChannel(outputChannels[i], i); }

        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;

        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 2000;

        //source.connect(ctx.destination)
        source.connect(filter)
        filter.connect(ctx.destination);

        source.start(0);
        return await ctx.startRendering();
    }
}