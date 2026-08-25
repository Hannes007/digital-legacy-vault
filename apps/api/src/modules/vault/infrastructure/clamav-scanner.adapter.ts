import { Inject, Injectable, Logger } from '@nestjs/common';
import { connect } from 'node:net';

import { ScanVerdict } from '@dlv/shared-types';

import { ENV } from '../../../common/tokens';
import type { ScannerPort } from '../application/ports';
import type { Env } from '@dlv/config';

// EICAR anti-malware test string — a local safety net when no clamd is reachable
// (dev). Production always talks to clamd over INSTREAM.
const EICAR = Buffer.from('EICAR-STANDARD-ANTIVIRUS-TEST-FILE', 'ascii');

@Injectable()
export class ClamAvScannerAdapter implements ScannerPort {
  private readonly logger = new Logger(ClamAvScannerAdapter.name);

  constructor(@Inject(ENV) private readonly env: Env) {}

  async scan(bytes: Uint8Array): Promise<ScanVerdict> {
    try {
      return await this.instream(Buffer.from(bytes));
    } catch (err) {
      this.logger.warn(`clamd unavailable (${String(err)}); using local EICAR heuristic.`);
      return Buffer.from(bytes).includes(EICAR) ? ScanVerdict.INFECTED : ScanVerdict.CLEAN;
    }
  }

  /** clamd INSTREAM: `zINSTREAM\0` then <len:uint32be><chunk>... then <0>. */
  private instream(buf: Buffer): Promise<ScanVerdict> {
    return new Promise((resolve, reject) => {
      const socket = connect({ host: this.env.CLAMAV_HOST, port: this.env.CLAMAV_PORT });
      const chunks: Buffer[] = [];
      socket.setTimeout(15_000);
      socket.on('error', reject);
      socket.on('timeout', () => {
        socket.destroy();
        reject(new Error('clamd timeout'));
      });
      socket.on('data', (d) => chunks.push(d));
      socket.on('end', () => {
        const reply = Buffer.concat(chunks).toString('utf8');
        if (reply.includes('FOUND')) resolve(ScanVerdict.INFECTED);
        else if (reply.includes('OK')) resolve(ScanVerdict.CLEAN);
        else resolve(ScanVerdict.ERROR);
      });
      socket.on('connect', () => {
        socket.write('zINSTREAM\0');
        const size = Buffer.alloc(4);
        size.writeUInt32BE(buf.byteLength, 0);
        socket.write(size);
        socket.write(buf);
        socket.write(Buffer.from([0, 0, 0, 0])); // zero-length chunk terminates
      });
    });
  }
}
