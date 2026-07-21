/**
 * MASTER TOKEN REGISTRY HUB
 * Version: 1.1.0 (BEP2 Protocol Integrated)
 */

import ethereum from './ethereum.json';
import polygon from './polygon.json';
import bsc from './bsc.json';
import tron from './tron.json';
import optimism from './optimism.json';
import base from './base.json';
import avalanche from './avalanche.json';
import arbitrum from './arbitrum.json';
import scroll from './scroll.json';
import solana from './solana.json';
import bep2 from './bep2.json';

const tokenRegistry: Record<number, any[]> = {
  1: ethereum,
  137: polygon,
  56: bsc,
  728126428: tron,
  10: optimism,
  8453: base,
  43114: avalanche,
  42161: arbitrum,
  534352: scroll,
  501: solana,
  714: bep2
};

export default tokenRegistry;
