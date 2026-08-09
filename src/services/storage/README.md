# Storage Service

Abstraction over local persistence. Components and features must go through the `StorageService`
interface defined here rather than calling AsyncStorage (or any other storage primitive) directly.
This is what lets us swap in a real backend later without a rewrite.

Populated in the "storage abstraction layer" build step.
