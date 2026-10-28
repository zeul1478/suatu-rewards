import { networkInterfaces } from "node:os";

/**
 * Private IPv4 addresses of this machine (e.g. 10.0.0.157), used to reach the
 * dev server from a phone on the same Wi-Fi.
 * @returns {string[]}
 */
export function lanAddresses() {
  return Object.values(networkInterfaces())
    .flat()
    .filter((net) => net && net.family === "IPv4" && !net.internal)
    .map((net) => /** @type {import("node:os").NetworkInterfaceInfo} */ (net).address)
    .filter((address) => /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(address));
}
