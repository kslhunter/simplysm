# Login Page Design (solid-demo)

## Overview

Add a UI demo login page to solid-demo. No auth logic — just visual demo with navigation.

## Layout

- **Style**: Fullscreen centered card
- **Route**: `/login` (outside Home layout, same pattern as `mobile-layout-demo`)

## UI Structure

```
┌──────────────────────────────────┐
│    (gradient/solid background)    │
│                                  │
│       ┌──────────────────┐       │
│       │  [SIMPLYSM logo] │       │
│       │                  │       │
│       │  ID     [______] │       │
│       │  PW     [______] │       │
│       │                  │       │
│       │  [   Login    ]  │       │
│       │                  │       │
│       │  Change PW | Sign Up     │
│       └──────────────────┘       │
│                                  │
│                    [ThemeToggle]  │
└──────────────────────────────────┘
```

## Components Used

- `Field` — ID/PW input
- `Button` — Login button
- `ThemeToggle` — Bottom-right theme toggle
- `logo-landscape.png` — Same logo as Home.tsx

## Behavior

| Element | On Click |
|---------|----------|
| Login button | Navigate to `/home` |
| Change PW link | `alert("비밀번호 변경")` |
| Sign Up link | `alert("회원가입")` |
| Home "로그아웃" menu | Navigate to `/login` |

## Root Redirect Change

- Current: `/` → `/home`
- New: `/` → `/login`

## Files to Modify

1. **`pages/LoginPage.tsx`** — New file
2. **`main.tsx`** — Add `/login` route, change root redirect to `/login`
3. **`Home.tsx`** — Change "로그아웃" onClick to navigate to `/login`
