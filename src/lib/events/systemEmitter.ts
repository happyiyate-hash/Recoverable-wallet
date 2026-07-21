'use client';

type SystemListener = (payload: any) => void;

class SystemEmitter {
  private listeners: { [channel: string]: SystemListener[] } = {};

  on(channel: string, listener: SystemListener) {
    if (!this.listeners[channel]) {
      this.listeners[channel] = [];
    }
    this.listeners[channel].push(listener);
  }

  emit(channel: string, payload: any) {
    if (this.listeners[channel]) {
      this.listeners[channel].forEach((listener) => listener(payload));
    }
  }

  off(channel: string, listener: SystemListener) {
    if (this.listeners[channel]) {
      this.listeners[channel] = this.listeners[channel].filter((l) => l !== listener);
    }
  }
}

export const systemEmitter = new SystemEmitter();
