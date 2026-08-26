/// <reference types="nativewind/types" />

/**
 * `global.css` is consumed by NativeWind's Metro transformer, not by TypeScript.
 * Without this declaration the side-effect import in app/_layout.tsx is a
 * type error even though it bundles correctly.
 */
declare module '*.css';
