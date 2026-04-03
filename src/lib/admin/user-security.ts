export function buildBanUpdate(currentSessionVersion: number) {
  return {
    isActive: false,
    sessionVersion: currentSessionVersion + 1,
  };
}

export function buildUnbanUpdate() {
  return {
    isActive: true,
  };
}

export function isSessionTokenValid(sessionVersionInToken: number, currentSessionVersion: number, isActive: boolean) {
  return isActive && sessionVersionInToken === currentSessionVersion;
}
