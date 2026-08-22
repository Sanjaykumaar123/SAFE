---
name: SafePath AI Citizen
colors:
  surface: '#f7f9fc'
  surface-dim: '#d8dadd'
  surface-bright: '#f7f9fc'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f7'
  surface-container: '#eceef1'
  surface-container-high: '#e6e8eb'
  surface-container-highest: '#e0e3e6'
  on-surface: '#191c1e'
  on-surface-variant: '#44474c'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f4'
  outline: '#74777d'
  outline-variant: '#c4c6cd'
  surface-tint: '#4e6077'
  primary: '#00050e'
  on-primary: '#ffffff'
  primary-container: '#0b1f33'
  on-primary-container: '#7587a0'
  inverse-primary: '#b5c8e3'
  secondary: '#0057c2'
  on-secondary: '#ffffff'
  secondary-container: '#246fe7'
  on-secondary-container: '#fefcff'
  tertiary: '#00040d'
  on-tertiary: '#ffffff'
  tertiary-container: '#001e3d'
  on-tertiary-container: '#4088d9'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d1e4ff'
  primary-fixed-dim: '#b5c8e3'
  on-primary-fixed: '#081d30'
  on-primary-fixed-variant: '#36485e'
  secondary-fixed: '#d9e2ff'
  secondary-fixed-dim: '#afc6ff'
  on-secondary-fixed: '#001a43'
  on-secondary-fixed-variant: '#004398'
  tertiary-fixed: '#d4e3ff'
  tertiary-fixed-dim: '#a4c9ff'
  on-tertiary-fixed: '#001c39'
  on-tertiary-fixed-variant: '#004883'
  background: '#f7f9fc'
  on-background: '#191c1e'
  surface-variant: '#e0e3e6'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  margin-mobile: 16px
  margin-desktop: 24px
  gutter: 16px
---

## Brand & Style
The design system is centered on the core values of safety, reliability, and immediate clarity. It serves a civic-tech purpose where users need to process critical information quickly under potentially stressful conditions. 

The aesthetic is **Corporate Modern with a Precision focus**. It leverages a clean, utility-driven layout that avoids decorative distractions. By utilizing a "Map-First" philosophy, the UI prioritizes spatial awareness and real-time data visualization. The emotional response is one of calm authority—positioning the application as a dependable companion for urban navigation and emergency response. High-density information is managed through a strict hierarchy and purposeful use of whitespace, ensuring the interface feels premium yet accessible.

## Colors
The palette is anchored by **Deep Navy (#0B1F33)**, providing a stable, authoritative foundation for headers and primary navigation. **Primary Blue** is reserved for high-priority actions and interactive map elements, while **Secondary Blue** supports secondary interactions and accents.

A sophisticated semantic system is used for safety reporting:
- **Safety Green**: Indicates resolved issues or safe zones.
- **Warning Amber**: Used for cautionary alerts that require attention but not immediate action.
- **Critical Red**: Reserved exclusively for life-safety threats or immediate dangers.
- **Pending Purple**: Denotes information currently under AI or human review.

The background uses a cool-toned off-white (**#F7F9FC**) to reduce eye strain and provide a neutral canvas for data-heavy map overlays.

## Typography
This design system utilizes **Inter** exclusively to leverage its exceptional legibility and systematic weights. The type scale is optimized for rapid scanning. 

- **Headlines**: Use Bold or Semi-Bold weights with tight letter-spacing to create a sense of urgency and importance.
- **Body Text**: Maintains a generous line height (1.5x) to ensure readability for incident descriptions and instructions.
- **Labels**: Small-scale labels (caps-locked for category markers) use medium weights and increased letter spacing to differentiate them from interactive body text.
- **Mobile Adjustments**: Headlines are aggressively scaled down on mobile to ensure critical alerts remain "above the fold" even on smaller devices.

## Layout & Spacing
The system employs a strict **8pt grid**. All margins, paddings, and component heights must be multiples of 8. 

The layout follows a **Map-Priority model**:
- **Mobile**: The map occupies the full viewport background. UI components (Search, Filters, Reporting) are presented as floating sheets or anchored bottom-modals to allow one-handed operation. 
- **Desktop/Tablet**: A split-view approach is used, where a 400px side panel contains the information feed and the map persists in the remaining fluid space.
- **Safe Areas**: Elements should never sit flush against the screen edges; a minimum 16px horizontal margin is required for all content containers.

## Elevation & Depth
Elevation is communicated through **Tonal Layers** rather than heavy shadows, staying true to a clean Material 3-influenced aesthetic.

- **Level 0 (Base)**: The Map layer.
- **Level 1 (Surface)**: Floating action buttons and search bars. Use a subtle `0px 4px 12px rgba(0,0,0,0.05)` shadow to lift them slightly from the map.
- **Level 2 (Active Sheets)**: Bottom sheets and modal cards. These use a higher contrast background and a soft overlay behind them to focus user attention.
- **Outlines**: Use 1px solid borders in `#EAECF0` for card elements to define boundaries without adding visual weight.

## Shapes
The shape language is **Soft and Approachable**. 
- **Standard Components**: (Inputs, Buttons, Small Cards) use a **12px** radius.
- **Large Containers**: (Bottom Sheets, Main Feed Cards) use a **16px** or **24px** top-radius to create a modern, "nested" appearance.
- **Status Badges**: Use a fully rounded (pill) shape to distinguish them from interactive buttons.
- **Interactive Icons**: Housed within 40px or 48px circular containers for clear tap targets.

## Components
- **Buttons**: Primary buttons are solid Deep Navy or Primary Blue with white text. High-emphasis "Report Emergency" buttons use Critical Red. All buttons have a minimum height of 48px for mobile accessibility.
- **Status Badges**: These consist of a low-opacity background tint and a high-contrast text color (e.g., Warning Amber text on a 10% opacity Amber background). They must include an icon for accessibility.
- **Input Fields**: Minimalist style with a 1px border. Focus states use a 2px Primary Blue border.
- **Incident Cards**: Cards should prioritize the "Severity Badge" in the top right. Titles are Headline-MD, and metadata (time/distance) uses Label-SM in Secondary Text color.
- **Map Markers**: Circular markers with a white border and the semantic color of the incident. High-priority markers should pulsate subtly to indicate real-time activity.
- **Bottom Sheets**: Use a drag handle (handle-bar) at the top. Sheets should have three snap points: collapsed (peek), half-expanded (info), and full-screen (details).