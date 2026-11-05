const path = require("path");
const sec = [{ key: "X-Content-Type-Options", value: "nosniff" }, { key: "X-Frame-Options", value: "DENY" }, { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" }, { key: "Permissions-Policy", value: "camera=(self), geolocation=(self), microphone=()" }];
module.exports = { output: "standalone", poweredByHeader: false, experimental: { outputFileTracingRoot: path.join(__dirname, "../../") }, async headers() { return [{ source: "/(.*)", headers: sec }]; } };
