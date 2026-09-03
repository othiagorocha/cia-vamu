let suppressUntil = 0;

export const suppressEventCardOpen = (durationMs = 500) => {
  suppressUntil = Date.now() + durationMs;
};

export const isEventCardOpenSuppressed = () => Date.now() < suppressUntil;
