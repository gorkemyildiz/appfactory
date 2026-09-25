let enabled = __DEV__;
export function isDemoMode() {
  return enabled;
}
export function setDemoMode(value: boolean) {
  enabled = value;
}
