import os from "os";

export const getLocalIpAddress = () => {
  const interfaces = os.networkInterfaces();
  let ipAddress = null;

  Object.keys(interfaces).forEach((interfaceName) => {
    interfaces[interfaceName].forEach((iface) => {
      if (!iface.internal && iface.family === "IPv4") {
        ipAddress = iface.address;
      }
    });
  });

  return ipAddress;
};
