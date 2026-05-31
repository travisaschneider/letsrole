import {AudioTransformer} from "../AudioTransformer";
import {Template} from "../../Template";

export class BadPhone extends AudioTransformer {
    public static readonly key = 'bad-phone';

    public static get title(): string {
        return Template.__('Bad Phone');
    }

    public async transform(audioBuffer: AudioBuffer): Promise<AudioBuffer> {
        const channels = [];
        for(let i = 0; i < audioBuffer.numberOfChannels; i++) { channels[i] = new Float32Array(audioBuffer.getChannelData(i)); }

        // Run worker
        const outputChannels: any = await this.doWorkerTask(function() {
            self.onmessage = function(e) {

                const inputChannels = e.data.channels;
                const sampleRate = e.data.sampleRate;

                const outputChannels = [];
                for(let i = 0; i < inputChannels.length; i++) {
                    const input = inputChannels[i];
                    const output = new Float32Array(input.length);

                    // cut input at nodal points
                    const chunks = [];
                    let currentChunk = [];
                    for(let j = 0; j < input.length; j++) {
                        if(input[j] > 0 && input[j-1] < 0 || input[j] < 0 && input[j-1] > 0) {
                            chunks.push(currentChunk);
                            currentChunk = [];
                        }
                        currentChunk.push(input[j]);
                    }

                    // play with chunks
                    for(let j = 0; j < chunks.length; j++) {
                        const chunk = chunks[j];
                        const numberOfPoints = chunk.length;
                        const radiansPerPoint = Math.PI / numberOfPoints;
                        let sign = chunk[0] > 0 ? 1 : -1;
                        if(numberOfPoints < 20) { sign = 0; }
                        for(let p = 0; p < numberOfPoints; p++) {
                            chunk[p] = sign*Math.sin(radiansPerPoint*p);
                        }
                    }

                    // join chunks
                    let m = 0;
                    for(let j = 0; j < chunks.length; j++) {
                        for(let k = 0; k < chunks[j].length; k++) {
                            output[m] = chunks[j][k];
                            m++;
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

        return audioBuffer;
    }
}