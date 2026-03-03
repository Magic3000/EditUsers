# EditUsers

EditUsers is a Vencord plugin that allows local customization of user appearance and profile data in your Discord client.  
All changes are client-side and visible only to you.

## Features

### Display Customization
- Custom display name and global name
- Animated nameplate support
- Selectable font styles and effects

### Color Customization
- Custom name colors in messages
- Custom colors for DMs
- Optional animated gradients

### Tags
- Custom tag text
- Custom tag background and text colors
- Optional tag badge image

### Avatar and Profile
- Custom avatar URL
- Custom profile banner URL
- Custom profile banner, primary and accent colors
- Option to remove banner or profile effect

### IndexedDB Export / Import
- Export full configuration from IndexedDB
- Import configuration back into IndexedDB

## Usage

1. Right-click any user.
2. Select **Edit User**.

Changes are stored locally in IndexedDB under the `vencord-editusers` key.

Profiles are stored in IndexedDB in the `VencordStore` under the key:
