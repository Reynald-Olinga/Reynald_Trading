// src/services/eventBus.ts
type Listener<T = any> = (data: T) => void;

export class EventBus {
  private listeners: Record<string, Listener[]> = {};

  on(event: string, fn: Listener) {
    (this.listeners[event] ||= []).push(fn);
  }

  off(event: string, fn: Listener) {
    this.listeners[event] = (this.listeners[event] || []).filter(f => f !== fn);
  }

  emit(event: string, data?: any) {
    (this.listeners[event] || []).forEach(fn => fn(data));
  }
}