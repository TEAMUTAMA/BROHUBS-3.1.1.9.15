import { useState, useEffect, useRef, useMemo } from 'react';

export function useSharedState<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  // Unique ID for each hook instance to distinguish self-dispatched events
  const instanceId = useMemo(() => Math.random().toString(36).substring(2, 9), []);

  const [state, setState] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : initialValue;
    } catch (e) {
      return initialValue;
    }
  });

  // Track the last seen stringified value to prevent redundant writes or infinite broadcast loops
  const lastSeenValueRef = useRef<string>(JSON.stringify(state));

  // Listen to external changes from other tabs (storage event) or same tab (CustomEvent)
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === key && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          const stringified = e.newValue;
          if (lastSeenValueRef.current !== stringified) {
            lastSeenValueRef.current = stringified;
            setState(parsed);
          }
        } catch (err) {}
      }
    };
    
    const handleCustom = (e: any) => {
      if (e.detail && e.detail.sender === instanceId) {
        return; // Ignore events dispatched by ourselves
      }
      try {
        const parsed = e.detail.value;
        const stringified = JSON.stringify(parsed);
        if (lastSeenValueRef.current !== stringified) {
          lastSeenValueRef.current = stringified;
          setState(parsed);
        }
      } catch (err) {}
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener(`shared-state-${key}`, handleCustom);
    
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(`shared-state-${key}`, handleCustom);
    };
  }, [key, instanceId]);

  // Save and broadcast local changes
  useEffect(() => {
    const stringified = JSON.stringify(state);
    
    // If the local state is already matching the last synchronized value, skip doing anything
    if (lastSeenValueRef.current === stringified) {
      return;
    }

    lastSeenValueRef.current = stringified;

    try {
      localStorage.setItem(key, stringified);
    } catch (e) {}
    
    window.dispatchEvent(
      new CustomEvent(`shared-state-${key}`, { 
        detail: { value: state, sender: instanceId } 
      })
    );
  }, [key, state, instanceId]);

  const setSharedState = (value: T | ((val: T) => T)) => {
    setState(value);
  };

  return [state, setSharedState];
}
