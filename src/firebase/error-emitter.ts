'use client';

type ErrorListener = (error: any) => void;

class ErrorEmitter {
  private listeners: { [channel: string]: ErrorListener[] } = {};

  on(channel: string, listener: ErrorListener) {
    if (!this.listeners[channel]) {
      this.listeners[channel] = [];
    }
    this.listeners[channel].push(listener);
  }

  emit(channel: string, error: any) {
    if (this.listeners[channel]) {
      this.listeners[channel].forEach((listener) => listener(error));
    }
  }

  off(channel: string, listener: ErrorListener) {
    if (this.listeners[channel]) {
      this.listeners[channel] = this.listeners[channel].filter((l) => l !== listener);
    }
  }
}

export const errorEmitter = new ErrorEmitter();
