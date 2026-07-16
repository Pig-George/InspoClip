# Extension Popup Logo Interaction Design

## Goal

Make the popup brand mark visually lighter and add a brief, playful response when users click it.

## Visual treatment

- The logo control is fully transparent with no background fill, border, or box shadow.
- The icon remains at the current 38 px visual size so the header layout does not shift.
- Hover only adds a small lift/tilt to communicate interactivity; it does not introduce a surface.

## Click interaction

- Clicking retriggers a roughly 650 ms animation: compress, tilt left/right, then settle with a soft rebound.
- Two small sparkles briefly appear around the icon during the rebound.
- The control remains an accessible button with an explicit label.
- Under `prefers-reduced-motion`, the logo uses a minimal opacity response and the decorative sparkles are disabled.

## Scope

Only the extension popup header component and popup stylesheet change. The extension icon asset and header layout remain unchanged.

