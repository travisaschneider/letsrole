import {AudioTransformer} from "../AudioTransformer";
import {Jungle} from "../Jungle";
import {Template} from "../../Template";

export class Speed extends AudioTransformer {
    public static readonly key = 'speed';

    public static get title(): string {
        return Template.__('Faster');
    }

    public async transform(audioBuffer: AudioBuffer): Promise<AudioBuffer> {
        const speed = 1.5;
        const channels = [];
        for(let i = 0; i < audioBuffer.numberOfChannels; i++) { channels[i] = new Float32Array(audioBuffer.getChannelData(i)); }

        // Run worker
        const outputChannels: any = await this.doWorkerTask(function() {
            self.onmessage = function(e) {

                const inputChannels = e.data.channels;
                const speed = e.data.speed;
                const outputChannels = [];
                for(let i = 0; i < inputChannels.length; i++) {
                    outputChannels[i] = new Float32Array( Math.floor(inputChannels[i].length/speed) );
                    for(let j = 0; j < outputChannels[i].length; j++) {
                        outputChannels[i][j] = inputChannels[i][Math.floor(j*speed)];
                    }
                }

                // @ts-ignore
                self.postMessage(outputChannels, [...outputChannels.map(c => c.buffer), ...inputChannels.map(c => c.buffer)]);
                self.close();

            }
        }, {channels,speed}, channels.map(c => c.buffer))

        const ctx = new OfflineAudioContext(audioBuffer.numberOfChannels, outputChannels[0].length, audioBuffer.sampleRate);

        const outputAudioBuffer = ctx.createBuffer(outputChannels.length, outputChannels[0].length, audioBuffer.sampleRate);
        for(let i = 0; i < outputChannels.length; i++) { outputAudioBuffer.copyToChannel(outputChannels[i], i); }

        return outputAudioBuffer;
    }
}