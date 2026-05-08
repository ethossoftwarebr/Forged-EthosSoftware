import { Injectable } from '@nestjs/common';

import pkg from '../package.json';

@Injectable()
export class AppService {
  getInfo(): { name: string; version: string } {
    return { name: pkg.name, version: pkg.version };
  }
}
