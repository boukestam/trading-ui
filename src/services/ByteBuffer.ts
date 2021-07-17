import fs from 'fs';

export default class ByteBuffer {
    buffer: Uint8Array;
    index: number;

    constructor (size: number) {
        this.buffer = new Uint8Array(size);
        this.index = 0;
    }

    writeToFile (file: string) {
        fs.writeFileSync(file, this.buffer);
    }

    writeInts (nums: number[]) {
        const intArray = new Int32Array(nums.length);

        for (let i = 0; i < nums.length; i++) {
            intArray[i] = nums[i];
        }

        const byteArray = new Int8Array(intArray.buffer);

        for (let i = 0; i < byteArray.length; i++) {
            this.buffer[this.index++] = byteArray[i];
        }
    }

    writeFloats (nums: number[]) {
        const floatArray = new Float32Array(nums.length);

        for (let i = 0; i < nums.length; i++) {
            floatArray[i] = nums[i];
        }

        const byteArray = new Int8Array(floatArray.buffer);

        for (let i = 0; i < byteArray.length; i++) {
            this.buffer[this.index++] = byteArray[i];
        }
    }
}
  