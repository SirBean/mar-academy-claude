import { Config } from "@remotion/cli/config";

// Production defaults. Every render of the system uses these.
Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(95);
Config.setCodec("h264");
Config.setCrf(16); // high quality for social re-encoding
Config.setPixelFormat("yuv420p");
Config.setConcurrency(null);
Config.setChromiumOpenGlRenderer("swiftshader");
