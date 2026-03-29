"use client";

import { atom, useAtomValue } from "jotai";
import { jotaiStore } from "@/store";

interface BulkProcessState {
  running: boolean;
  total: number;
  completed: number;
}

const bulkProcessAtom = atom<BulkProcessState>({
  running: false,
  total: 0,
  completed: 0,
});

export const useBulkProcessState = () => useAtomValue(bulkProcessAtom);

export const startBulkProcess = () => {
  jotaiStore.set(bulkProcessAtom, { running: true, total: 0, completed: 0 });
};

export const incrementBulkTotal = (count: number) => {
  jotaiStore.set(bulkProcessAtom, (prev) => ({
    ...prev,
    total: prev.total + count,
  }));
};

export const incrementBulkCompleted = () => {
  jotaiStore.set(bulkProcessAtom, (prev) => ({
    ...prev,
    completed: prev.completed + 1,
  }));
};

export const finishBulkProcess = () => {
  jotaiStore.set(bulkProcessAtom, (prev) => ({
    ...prev,
    running: false,
  }));
};

export const resetBulkProcess = () => {
  jotaiStore.set(bulkProcessAtom, {
    running: false,
    total: 0,
    completed: 0,
  });
};
