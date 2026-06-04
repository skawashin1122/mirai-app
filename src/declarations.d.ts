/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

declare module "textalive-app-api" {
  export class Player {
    constructor(options: any);
    addListener(callbacks: any): void;
    createFromSongUrl(url: string): Promise<any>;
    requestPlay(): void;
    requestPause(): void;
    requestStop(): void;
    dispose(): void;
    video: any;
  }
}
