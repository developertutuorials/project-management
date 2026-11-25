import EventEmitter from "events";

class DistributedEventBus {
  constructor() {
    this.emitter = new EventEmitter();
    this.subscribers = new Map();
  }

  /**
   * Publish an event to the bus.
   * If an external notification endpoint is defined or inngest is used, dispatches to it.
   */
  async publish(eventName, payload) {
    console.log(`[EventBus] Publishing event: ${eventName}`, payload);
    this.emitter.emit(eventName, payload);

    // If Notification Service URL is set, dispatch HTTP webhook for async processing
    const notifServiceUrl = process.env.NOTIFICATION_SERVICE_URL || "http://localhost:5004";
    try {
      if (typeof fetch !== "undefined") {
        await fetch(`${notifServiceUrl}/events`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event: eventName, data: payload }),
        }).catch((err) => {
          // Non-blocking in dev if notification service is starting up
          console.warn(`[EventBus] Notification service unreachable at ${notifServiceUrl}: ${err.message}`);
        });
      }
    } catch (e) {
      console.warn(`[EventBus] Failed to forward event to notification-service: ${e.message}`);
    }
  }

  /**
   * Subscribe locally to an event
   */
  subscribe(eventName, handler) {
    this.emitter.on(eventName, handler);
  }
}

export const eventBus = new DistributedEventBus();
export default eventBus;
