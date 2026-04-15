import "@testing-library/jest-dom";
import { TextEncoder, TextDecoder } from "node:util";

(globalThis).TextEncoder = TextEncoder;
(globalThis).TextDecoder = TextDecoder as unknown as typeof globalThis.TextDecoder;