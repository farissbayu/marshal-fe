import { useEffect } from "react";
import { EVENTS_URL } from "./env";
import { eventSimulator } from "./mock/event-simulator";
import { type FlowEvent, flowEventSchema } from "./schemas";
import { useAppStore } from "./stores/app";
import { useEventLogStore } from "./stores/event-log";

/**
 * Subscribes to the backend SSE flow log at `/events`.
 * In mock mode it consumes the in-browser simulator instead of a network stream.
 */
export function useEventStream(url: string = EVENTS_URL, enabled = true) {
  const addEvents = useEventLogStore((s) => s.addEvents);
  const setConnection = useEventLogStore((s) => s.setConnection);
  const setStreamStatus = useAppStore((s) => s.setStreamStatus);
  const mockMode = useAppStore((s) => s.mockMode);

  useEffect(() => {
    if (!enabled) {
      setConnection("idle");
      setStreamStatus("offline");
      return;
    }

    if (mockMode) {
      setConnection("open");
      setStreamStatus("live");
      const unsubscribe = eventSimulator.subscribe((events) => {
        addEvents(events);
        useAppStore.getState().touch();
      });
      return () => {
        unsubscribe();
        setConnection("idle");
        setStreamStatus("offline");
      };
    }

    let source: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let closed = false;

    const connect = () => {
      setConnection("connecting");
      setStreamStatus("reconnecting");
      source = new EventSource(url, { withCredentials: true });

      source.onopen = () => {
        setConnection("open");
        setStreamStatus("live");
        useAppStore.getState().setApiStatus("connected");
      };

      source.onmessage = (event) => {
        const parsed = parseEvent(event.data);
        if (parsed) {
          addEvents([parsed]);
          useAppStore.getState().touch();
        }
      };

      source.onerror = () => {
        setConnection("error");
        setStreamStatus("reconnecting");
        source?.close();
        if (!closed) reconnectTimer = setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      closed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      source?.close();
      setConnection("idle");
      setStreamStatus("offline");
    };
  }, [url, enabled, mockMode, addEvents, setConnection, setStreamStatus]);
}

function parseEvent(raw: string): FlowEvent | null {
  try {
    const json = JSON.parse(raw);
    const parsed = flowEventSchema.safeParse(json);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
