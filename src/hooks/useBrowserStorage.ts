import type { CryptoKeyMap, LocalStorageCryptoKeyMap } from "@/types/data";
import { useCallback, useEffect, useState } from "react";


const STORAGE_KEY = "privateKeys";

// Custom hook for persistent storage with expiration
export function useBrowserStorage(
  expiryMs = 24 * 60 * 60 * 1000
) {
  // Initialize state from localStorage
  const [storedValues, setStoredValues] = useState<LocalStorageCryptoKeyMap>(() => {
    try {
      const item = window.localStorage.getItem(STORAGE_KEY);
      if (!item) return {};
      const items: LocalStorageCryptoKeyMap = JSON.parse(item);
      Object.keys(items).forEach(key => {
        if (items[key].expiresAt < Date.now()) {
          delete items[key];
        }
      });
      return items;
    } catch (error) {
      console.error("Error reading from localStorage:", error);
      return {};
    }
  });
  
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(storedValues));
    } catch (error) {
      console.error("Error saving to localStorage:", error);
    }
  }, [storedValues]);

  // Save to localStorage with expiration
  const setValue = useCallback((value: CryptoKeyMap) => {
      const expiry = expiryMs
        ? Date.now() + expiryMs
        : Date.now() + 24 * 60 * 60 * 1000; // Default 24h
      setStoredValues(prev => ({ ...prev, [STORAGE_KEY]: { ...value, expiresAt: expiry } }));
  }, [expiryMs]);

  // Remove from storage
  const removeValue = useCallback((...sessionIds: string[]) => {
    if (sessionIds.length === 0) return;
    setStoredValues(prev => {
      const newState = { ...prev };
      sessionIds.forEach(id => {
        delete newState[id];
      });
      return newState;
    });
  }, []);

  // const appendValue = useCallback((newValue: Partial<T>) => {
  //   if (typeof storedValueRef.current !== "object" || storedValueRef.current === null) {
  //     throw new Error("Stored value is not an object, cannot append");
  //   }
  //   setValue({ ...storedValueRef.current, ...newValue });
  // }, [setValue]);

  return { storedValues, setValue, removeValue };
}
