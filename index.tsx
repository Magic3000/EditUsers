import "./styles.css";

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { get } from "@api/DataStore";
import { definePluginSettings, Settings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { classNameFactory } from "@utils/css";
import { getIntlMessage } from "@utils/discord";
import { openModal } from "@utils/modal";
import definePlugin, { OptionType } from "@utils/types";
import { Channel, User, GuildMember, Message } from "@vencord/discord-types";
import { extractAndLoadChunksLazy, findLazy, findByCodeLazy, findStoreLazy } from "@webpack";
import { ChannelStore, Menu, React, UserProfileStore, RelationshipStore, MessageStore, FluxDispatcher, useEffect, GuildStore, StreamerModeStore, GuildMemberStore } from "@webpack/common";
import { SetUserModal } from "./SetUserModal";
import { Button } from "@components/Button";
import ircColors from "@plugins/ircColors";
import { isPluginEnabled } from "@api/PluginManager";
import { JSX } from "react";
import mentionAvatars from "@plugins/mentionAvatars";
import { GradientStop } from "./GradientColorPicker";

export const DATASTORE_PROFILES_KEY = "vencord-editusers";
export let profiles: Record<string, CustomUserProfile> = {};
export async function reloadProfiles() {
    profiles =
        await get<Record<string, CustomUserProfile>>(DATASTORE_PROFILES_KEY) || {};
}
export const Tag = findLazy(m => m.Types?.[0] === "BOT") as React.ComponentType<{ type?: number | null, className?: string, useRemSizes?: boolean; }> & { Types: Record<string, number>; };

const EDITUSERS = classNameFactory();
const requireSettingsMenu = extractAndLoadChunksLazy(['type:"USER_SETTINGS_MODAL_OPEN"']);


type colorStringsType = { primaryColor: string | null, secondaryColor: string | null, tertiaryColor: string | null; } | null | undefined;
const UserStore = findStoreLazy("UserStore");
const wrapEmojis = findByCodeLazy("lastIndex;return");
const adjustColor = findByCodeLazy("light1", "dark1", "toonStroke");
const AccessibilityStore = findStoreLazy("AccessibilityStore");

const roleColorPattern = /^role((?:\+|-)\d{0,4})?$/iu;
const symbolPattern = /^[\p{S}\p{P}]{1,3}$/iu;
const templatePattern = /(?:\{(?:custom|friend|nick|display|user)(?:,\s*(?:custom|friend|nick|display|user))*\})/iu;

let toCSSCache: Map<string, string | null> | null = null;
let toCSSProbe: HTMLDivElement | null = null;

function toCSS(color: string | number | null | undefined): string | null {
    if (color == null) return null;
    if (typeof color === "number") return `#${color.toString(16).padStart(6, "0")}`;
    if (!color) return null;

    const cached = toCSSCache?.get(color);
    if (cached !== undefined) return cached ?? null;

    if (!toCSSProbe) return null;

    toCSSProbe.style.color = "";
    toCSSProbe.style.color = color;
    const result = toCSSProbe.style.color !== "" ? color : null;
    toCSSCache?.set(color, result);
    return result;
}

let convertToRGBCanvas: HTMLCanvasElement | null = null;
let convertToRGBCtx: CanvasRenderingContext2D | null = null;
let convertToRGBCache: Map<string, [number, number, number] | null> | null = null;

function convertToRGB(color: string): [number, number, number] | null {
    const cached = convertToRGBCache?.get(color);
    if (cached !== undefined) return cached ?? null;

    if (!convertToRGBCanvas || !convertToRGBCtx) return null;

    convertToRGBCtx.fillStyle = "#000000";
    convertToRGBCtx.clearRect(0, 0, 1, 1);
    convertToRGBCtx.fillStyle = color;
    convertToRGBCtx.fillRect(0, 0, 1, 1);
    const [r, g, b] = convertToRGBCtx.getImageData(0, 0, 1, 1).data;
    const result: [number, number, number] = [r, g, b];
    convertToRGBCache?.set(color, result);
    return result;
}

function adjustBrightness(color: string, percent: number): string {
    const rgb = convertToRGB(color);
    if (!rgb) return color;

    let [r, g, b] = rgb;
    r = Math.max(0, Math.min(255, r + Math.round(r * (percent / 100))));
    g = Math.max(0, Math.min(255, g + Math.round(g * (percent / 100))));
    b = Math.max(0, Math.min(255, b + Math.round(b * (percent / 100))));

    const hex = `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
    if (hex === "#ffffff" || hex === "#000000") return color;

    return hex;
}





const ColorIcon = () => {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
            width="18"
            height="18"
        >
            <path d="M3 17.25V21h3.75L19.81 7.94l-3.75-3.75L3 17.25zm2.92 2.33H5v-.92l9.06-9.06.92.92L5.92 19.58zM20.71 6.04a1 1 0 0 0 0-1.41l-1.34-1.34a1 1 0 0 0-1.41 0l-1.13 1.13 2.75 2.75 1.13-1.13z" />
        </svg>
    );
};

const userContextMenuPatch: NavContextMenuPatchCallback = (children, { user }: { user: User; }) => {
    if (user?.id == null) return;

    const setEditUserItem = (
        <Menu.MenuItem
            label="Edit User"
            id="edit-user"
            icon={ColorIcon}
            action={async () => {
                await requireSettingsMenu();
                openModal(modalProps => <SetUserModal id={user.id} modalProps={modalProps} />);
            }}
        />
    );
    const container = findGroupChildrenByChildId("close-dm", children);
    if (container) {
        const idx = container.findIndex(c => c?.props?.id === "close-dm");
        container.splice(idx, 0, <Menu.MenuSeparator />, setEditUserItem, <Menu.MenuSeparator />);
    }
    else {
        children.push(<Menu.MenuSeparator />, setEditUserItem);
    }
};

const channelContextMenuPatch: NavContextMenuPatchCallback = (children, { channel }: { channel: Channel; }) => {
    if (channel?.id == null) return;

    const setEditUserItem = (
        <Menu.MenuItem
            label="Edit User"
            id="edit-user"
            icon={ColorIcon}
            action={async () => {
                await requireSettingsMenu();
                openModal(modalProps => <SetUserModal id={channel.id} modalProps={modalProps} />);
            }}
        />
    );

    const container = findGroupChildrenByChildId("add-friend-nickname", children);
    if (container) {
        const idx = container.findIndex(c => c?.props?.id === "note");
        container.splice(idx, 0, <Menu.MenuSeparator />, setEditUserItem, <Menu.MenuSeparator />);
    }
    else {
        children.push(<Menu.MenuSeparator />, setEditUserItem);
    }
};

function getCustomColorString(id: string | undefined, withHash?: boolean): string | undefined {
    if (!id || !Settings.plugins.EditUsers.enabled) return;

    const color = profiles[id]?.color1;
    if (!color) return;

    return withHash ? `#${color}` : color;
}

function getCustomNameString(id: string | undefined): string | undefined {
    if (!id || !Settings.plugins.EditUsers.enabled) return;
    return profiles[id]?.nickname;
}

function normalizeAvatarUrl(url: string) {
    if (!url || url == '') return url;

    if (url.startsWith('https://iili.io/')) return url;

    url = url.replace(/[?&]size=\d+/g, "");
    if (url.includes("media.discordapp.net") && !url.includes("format=")) {
        url += (url.includes("?") ? "&" : "?") + "format=webp";
    }

    return url;
}

function hexToInt(hex?: string | number) {
    if (hex == null || hex === "") return undefined;
    if (typeof hex === "number") return hex;
    return parseInt(hex.replace("#", ""), 16);
}

function colorToHex(color?: string | number, withHash = true) {
    if (color == null || color === "") return undefined;

    const prefix = withHash ? "#" : "";

    if (typeof color === "string") {
        return color.startsWith("#")
            ? (withHash ? color : color.slice(1))
            : prefix + color;
    }

    return prefix + (color & 0xffffff).toString(16).padStart(6, "0");
}

function mixColor(a: number, b: number, t: number) {
    const ar = (a >> 16) & 255;
    const ag = (a >> 8) & 255;
    const ab = a & 255;

    const br = (b >> 16) & 255;
    const bg = (b >> 8) & 255;
    const bb = b & 255;

    const r = Math.round(ar * (1 - t) + br * t);
    const g = Math.round(ag * (1 - t) + bg * t);
    const b2 = Math.round(ab * (1 - t) + bb * t);

    return (r << 16) | (g << 8) | b2;
}

function patchUserProfileObject(this: any, userProfile: any) {
    if (!userProfile) return userProfile;

    const userId = userProfile?.userId;
    if (!userId) return userProfile;

    const profile = profiles[userId] ?? (settings.store.randomizeForNonEdited ? getRandomCustomization(userId) : undefined);
    if (!profile) return userProfile;

    const newUserProfileObject =
        new (userProfile.constructor as any)(userProfile);

    const origUserProfile = this.origGetUserProfile(userId);

    const bannerColor = hexToInt(profile.profileBannerColor);
    const primaryColor = hexToInt(profile.profilePrimaryColor);
    const accentColor = hexToInt(profile.profileAccentColor);

    if (profile?.removeEffect && newUserProfileObject.profileEffect) {
        newUserProfileObject.profileEffect = null;
    } else {
        newUserProfileObject.profileEffect = origUserProfile.profileEffect;
    }

    if (bannerColor != null) {
        newUserProfileObject.primaryColor = bannerColor;
        newUserProfileObject.accentColor = bannerColor;
    } else {
        newUserProfileObject.primaryColor = origUserProfile.primaryColor;
        newUserProfileObject.accentColor = origUserProfile.accentColor;
    }

    if (primaryColor != null || accentColor != null) {
        newUserProfileObject.themeColors = [
            primaryColor ?? 0x000000,
            accentColor ?? 0x000000
        ];
        newUserProfileObject.canEditThemes = true;
        newUserProfileObject.premiumType = 2;
    } else {
        newUserProfileObject.themeColors = origUserProfile.themeColors;
        newUserProfileObject.canEditThemes = origUserProfile.canEditThemes;
        newUserProfileObject.premiumType = origUserProfile.premiumType;
    }

    return newUserProfileObject;
}

function patchUserObject(user: any) {
    const userId = user?.id;
    if (!userId || !profiles) return user;

    const newUserObject = new (user.constructor as any)(user);

    const profile = profiles[userId] ?? (settings.store.randomizeForNonEdited ? getRandomCustomization(userId) : undefined);
    if (profile) {
        let url = profile.avatarUrl;
        if (url) {
            url = normalizeAvatarUrl(url);
            newUserObject.avatar = url;
            newUserObject.avatarURL = url;
            newUserObject.getAvatarSource = () => ({ uri: url });
            newUserObject.getAvatarURL = _ => url;
            newUserObject.guildMemberAvatars = {};
        }
        let username = profile.username;
        if (username) {
            //newUserObject.globalName = username;
            newUserObject.username = username;
        }
        let nickname = profile.nickname;
        if (nickname) {
            newUserObject.globalName = nickname;
        }
        if (profile.useColors) {
            const useGradient = profile.useGradient;
            const g = profile.nicknameGradient;
            const effectType = profile.effectType ?? 0;
            newUserObject.displayNameStyles = {
                effectDisplayType: 2,
                loop: profile.useColors,
                fontId: FontTypeToDiscordFontId[profile.fontId ?? 0],
                effectId: effectType + 1,
                colors: [
                    useGradient
                        ? g?.[0]?.color ?? profile.color1
                        : profile.color1 ?? g?.[0]?.color,

                    useGradient
                        ? g?.[1]?.color ?? profile.color2
                        : profile.color2 ?? g?.[1]?.color,
                    effectType === 5
                        ? (useGradient
                            ? g?.[2]?.color ?? profile.color3
                            : profile.color3 ?? g?.[2]?.color)
                        : undefined
                ].filter(v => v != null)
            };
        }
    }

    return newUserObject;
}

const injectedTagStyles = new Map<string, [string, string]>();

function ensureTagStyle(userId: string, color: string, textColor: string = "var(--white-500)") {
    const className = `editusers-color-${userId}`;
    const styleId = `eu-tag-${userId}`;

    let style = document.getElementById(styleId) as HTMLStyleElement | null;
    const cachedColors = injectedTagStyles.get(className);

    if (cachedColors && cachedColors[0] === color && cachedColors[1] === textColor && style) {
        return className;
    }

    injectedTagStyles.set(className, [color, textColor]);

    if (!style) {
        style = document.createElement("style");
        style.id = styleId;
        document.head.appendChild(style);
    }

    style.textContent = `
    .${className} {
      background: ${color} !important;
      border-color: ${color} !important;
    }
    .${className} span {
      color: ${textColor} !important;
    }
  `;

    return className;
}

async function openDB(): Promise<IDBDatabase> {
    return new Promise((res, rej) => {
        const req = indexedDB.open("VencordData");
        req.onerror = () => rej(req.error);
        req.onsuccess = () => res(req.result);
    });
}

async function exportConfig() {
    const db = await openDB();

    const data = await new Promise<any>((res, rej) => {
        const tx = db.transaction(["VencordStore"], "readonly");
        const store = tx.objectStore("VencordStore");
        const req = store.get(DATASTORE_PROFILES_KEY);
        req.onerror = () => rej(req.error);
        req.onsuccess = () => res(req.result);
    });

    if (!data) {
        console.warn("No data found");
        return;
    }

    const blob = new Blob([JSON.stringify(data, null, 4)], {
        type: "application/json"
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "editusers-config.json";
    a.click();
    URL.revokeObjectURL(url);

    console.log("Exported:", data);
}

async function importConfig() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";

    input.onchange = async (e: any) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const text = await file.text();

        try {
            const parsed = JSON.parse(text);

            const db = await openDB();

            await new Promise(async (res, rej) => {
                const tx = db.transaction(["VencordStore"], "readwrite");
                const store = tx.objectStore("VencordStore");
                const req = store.put(parsed, DATASTORE_PROFILES_KEY);
                req.onerror = () => rej(req.error);
                req.onsuccess = () => res(null);
                await reloadProfiles();
                FluxDispatcher.dispatch({ type: "FORCE_UPDATE" });
            });

            console.log("Import complete");
        } catch (err) {
            console.error("Import failed:", err);
        }
    };

    input.click();
}

export const enum EffectType {
    Solid,
    Gradient,
    Neon,
    Toon,
    Pop,
    TripleGradient,
}

export const enum FontType {
    GgSans,
    Temp,
    Sakura,
    Jellybean,
    Modern,
    Medieval,
    Bit8,
    Vampyre,
}

const FontTypeToDiscordFontId: Record<FontType, number> = {
    [FontType.GgSans]: 11,
    [FontType.Temp]: 12,
    [FontType.Sakura]: 3,
    [FontType.Jellybean]: 4,
    [FontType.Modern]: 6,
    [FontType.Medieval]: 7,
    [FontType.Bit8]: 8,
    [FontType.Vampyre]: 10,
};

const DiscordFontIdToFontType: Record<number, FontType> = {
    11: FontType.GgSans,
    12: FontType.Temp,
    3: FontType.Sakura,
    4: FontType.Jellybean,
    6: FontType.Modern,
    7: FontType.Medieval,
    8: FontType.Bit8,
    10: FontType.Vampyre
};

const settings = definePluginSettings({
    forceAnimatedNickname: {
        type: OptionType.BOOLEAN,
        description: "Force nickname to be animated like you always hover on it",
        default: true,
    },
    showUsernameInNickname: {
        type: OptionType.BOOLEAN,
        description: "Show username in parentheses after nickname",
        default: true,
    },
    showOnServer: {
        type: OptionType.BOOLEAN,
        description: "Apply colorization and nickname changes on servers",
        default: true,
    },
    additionalServerMembersCustomization: {
        type: OptionType.BOOLEAN,
        description: "Apply custom name-component colorization for servers instead of name and colors patching",
        default: true,
    },
    additionalDMListMembersCustomization: {
        type: OptionType.BOOLEAN,
        description: "Apply custom name-component colorization for DM-list instead of name and colors patching",
        default: true,
    },
    randomizeForNonEdited: {
        type: OptionType.BOOLEAN,
        description: "Randomize color effects for not edited users.",
        default: false,
        hidden: false
    },
    randomizeOnServers: {
        type: OptionType.BOOLEAN,
        description: "Apply randomized effect on servers.",
        default: false
    },
    triggerNameRerender: {
        type: OptionType.BOOLEAN,
        description: "Trigger a name rerender by toggling this setting.",
        default: false,
        hidden: true
    },
});

export interface CustomUserProfile {
    useGlow?: boolean;
    useGradient?: boolean;
    nicknameGradient?: GradientStop[];
    color1?: string;
    color2?: string;
    color3?: string;
    nickname?: string;
    useColors?: boolean;
    isAnimated?: boolean;
    effectType?: EffectType;
    fontId?: FontType;
    avatarUrl?: string;
    username?: string;
    tagText?: string;
    tagColor?: string;
    tagTextColor?: string;
    profileBannerColor?: string;
    profilePrimaryColor?: string;
    profileAccentColor?: string;
    bannerUrl?: string;
    removeBanner?: boolean;
    removeEffect?: boolean;
    gradientAngle?: number;
    isRadialGradient?: boolean;
};

interface mentionProps {
    userId: string;
    channelId?: string;
    props?: {
        messageId?: string;
        groupId?: string;
    },
}

interface messageProps {
    message: Message | null | undefined;
    colorString?: string;
    colorStrings: colorStringsType;
    userOverride?: User;
    isRepliedMessage?: boolean;
    withMentionPrefix?: boolean;
}

interface memberListProfileReactionProps {
    user: User | null | undefined;
    type: "typingIndicator" | "membersList" | "profilesPopout" | "profilesTooltip" | "reactionsTooltip" | "reactionsPopout" | "voiceChannel" | "serverMembersList" | "DmMembersList";
    guildId?: string;
    tags?: any;
    displayNameStylesFont?: any,
    channel?: any,
}





const hoveringMessageMap = new Map<string, number>();
const hoveringRepliesMap = new Map<string, number>();
const hoveringReactionPopoutSet = new Set<string>();

function handleHoveringMessage(message: any, isHovering: boolean) {
    const messageId = message?.id;
    const repliedId = message?.messageReference?.message_id;
    const groupId = message?.showMeYourNameGroupId ?? "";

    useEffect(() => {
        if (!message) return;

        if (isHovering) {
            addHoveringMessage(messageId);
            addHoveringMessage(groupId);
            addHoveringReply(repliedId);
        } else {
            removeHoveringMessage(messageId);
            removeHoveringMessage(groupId);
            removeHoveringReply(repliedId);
        }
    }, [messageId, groupId, isHovering]);
}

function addHoveringMessage(id: string) {
    if (!id) return;

    const currentCount = hoveringMessageMap.get(id) || 0;
    hoveringMessageMap.set(id, currentCount + 1);

    if (currentCount === 0) {
        settings.store.triggerNameRerender = !settings.store.triggerNameRerender;
    }
}

function removeHoveringMessage(id: string) {
    if (!id) return;

    const currentCount = hoveringMessageMap.get(id) || 0;

    if (currentCount <= 1) {
        hoveringMessageMap.delete(id);
        settings.store.triggerNameRerender = !settings.store.triggerNameRerender;
    } else {
        hoveringMessageMap.set(id, currentCount - 1);
    }
}

function addHoveringReply(id: string) {
    if (!id) return;

    const currentCount = hoveringRepliesMap.get(id) || 0;
    hoveringRepliesMap.set(id, currentCount + 1);

    if (currentCount === 0) {
        settings.store.triggerNameRerender = !settings.store.triggerNameRerender;
    }
}

function removeHoveringReply(id: string) {
    if (!id) return;

    const currentCount = hoveringRepliesMap.get(id) || 0;

    if (currentCount <= 1) {
        hoveringRepliesMap.delete(id);
        settings.store.triggerNameRerender = !settings.store.triggerNameRerender;
    } else {
        hoveringRepliesMap.set(id, currentCount - 1);
    }
}

function addHoveringReactionPopout(id: string) {
    hoveringReactionPopoutSet.add(id);
    settings.store.triggerNameRerender = !settings.store.triggerNameRerender;
}

function removeHoveringReactionPopout(id: string) {
    hoveringReactionPopoutSet.delete(id);
    settings.store.triggerNameRerender = !settings.store.triggerNameRerender;
}

function getEffectType(effectId: number | null | undefined): string | null {
    switch (effectId) {
        case 1: return "solid";
        // Delegate gradient effect handling to the guild
        // gradient handler. This adds animation to DM
        // gradients which are usually static.
        // case 2: return "gradient";
        case 3: return "neon";
        case 4: return "toon";
        case 5: return "pop";
        default: return null;
    }
}

function getMyEffectType(effectId: number | null | undefined): string | null {
    switch (effectId) {
        case 0: return "solid";
        // Delegate gradient effect handling to the guild
        // gradient handler. This adds animation to DM
        // gradients which are usually static.
        // case 1: return "gradient";
        case 2: return "neon";
        case 3: return "toon";
        case 4: return "pop";
        default: return null;
    }
}

function computeEffectCSSVars(styles: any): Record<string, string> {
    if (!styles?.colors?.length) return {};

    const toHex = (c: string | number) => {
        if (typeof c === "number")
            return `#${(c >>> 0).toString(16).padStart(6, "0")}`;

        c = c.replace("#", "");
        return `#${c.padStart(6, "0").slice(0, 6)}`;
    };
    const primary = toHex(styles.colors[0]);
    const secondary = styles.colors.length > 1 ? toHex(styles.colors[1]) : primary;
    const adjusted = adjustColor(primary);

    return {
        "--smyn-effect-main-color": adjusted.main,
        "--smyn-effect-gradient-start": primary,
        "--smyn-effect-gradient-end": secondary,
        "--smyn-effect-light-1": adjusted.light1,
        "--smyn-effect-light-2": adjusted.light2,
        "--smyn-effect-dark-1": adjusted.dark1,
        "--smyn-effect-dark-2": adjusted.dark2,
        "--smyn-effect-neon-stroke": adjusted.neonStroke,
        "--smyn-effect-neon-flicker": `hsl(from ${adjusted.main} h calc(min(1, s) * ((s * 1.1) + 10)) 85)`,
        "--smyn-effect-toon-stroke": adjusted.toonStroke,
    };
}



function getProcessedNames(
    author: any,
    truncateAllNamesWithStreamerMode: boolean,
    discriminators: boolean,
    inGuild: boolean,
    friendNameOnlyInDirectMessages: boolean,
    customNameOnlyInDirectMessages: boolean
): {
    username: string | null;
    display: string | null;
    nick: string | null;
    friend: string | null;
    custom: string | null;
} {
    let discriminator: string | null = null;

    if (discriminators) {
        const userAuthor = author as User | null;

        if (userAuthor?.bot && !isNaN(userAuthor?.discriminator as any) && Number(userAuthor?.discriminator) !== 0) {
            discriminator = userAuthor.discriminator;

            if (!!userAuthor) {
                userAuthor.globalName = userAuthor.username;
            }
        }
    }

    const profile = profiles[author?.id];

    const username: string | null = !author?.username ? null
        : StreamerModeStore.enabled
            ? author.username[0] + "..."
            : author.username as string + (discriminator ? `#${discriminator}` : "");

    const display: string | null = !author?.globalName ? null
        : StreamerModeStore.enabled && (truncateAllNamesWithStreamerMode || author.globalName.toLowerCase() === author.username.toLowerCase())
            ? author.globalName[0] + "..."
            : author.globalName as string;

    const nick: string | null = !author?.nick ? null
        : StreamerModeStore.enabled && (truncateAllNamesWithStreamerMode || author.nick.toLowerCase() === author.username.toLowerCase())
            ? author.nick[0] + "..."
            : author.nick as string;

    const friendName: string | null = (author && !(inGuild && friendNameOnlyInDirectMessages)) ? RelationshipStore.getNickname(author?.id) || null : null;
    const friend: string | null = !friendName ? null
        : StreamerModeStore.enabled && (truncateAllNamesWithStreamerMode || friendName.toLowerCase() === author.username.toLowerCase())
            ? friendName[0] + "..."
            : friendName as string;

    const customName: string | null = (author && !(inGuild && customNameOnlyInDirectMessages)) ? profile?.nickname || null : null;
    const custom: string | null = !customName ? null
        : StreamerModeStore.enabled && (truncateAllNamesWithStreamerMode || customName.toLowerCase() === author.username.toLowerCase())
            ? customName[0] + "..."
            : customName;

    return { username, display, nick, friend, custom };
}

function resolveColor(
    colorStrings: colorStringsType,
    displayNameStyles: { effectId: number; colors: number[]; } | null | undefined,
    savedColor: string,
    canUseGradient: boolean,
    inGuild: boolean,
    ircColorsEnabled: boolean,
    isHovering: boolean,
    gradientAngle: number,
    isRadialGradient: boolean | undefined,
    useGradient: boolean | undefined,
    nicknameGradient: GradientStop[] | undefined,
): Record<string, any> | null {
    const defaultColor = getComputedStyle(document.documentElement).getPropertyValue("--text-strong").trim() || null;

    if (!defaultColor) { return null; }

    savedColor = savedColor.trim() || defaultColor;
    const isRoleColor = savedColor.toLowerCase().includes("role");
    const forceDefault = !inGuild && !ircColorsEnabled && (isRoleColor ? !isHovering : false);

    let gradient: any = null;
    let primaryColor: any = null;
    let secondaryColor: any = null;
    let tertiaryColor: any = null;
    let primaryAdjusted: any = null;
    let secondaryAdjusted: any = null;
    let tertiaryAdjusted: any = null;

    if (isRoleColor) {
        const percentage = roleColorPattern.exec(savedColor)?.[1] || "";
        if (percentage && isNaN(parseInt(percentage))) return null;

        primaryColor = forceDefault ? defaultColor : (toCSS(colorStrings?.primaryColor) || (!inGuild && toCSS(displayNameStyles?.colors?.[0])) || defaultColor);
        secondaryColor = forceDefault ? null : (toCSS(colorStrings?.secondaryColor) || (!inGuild && toCSS(displayNameStyles?.colors?.[1])) || null);
        tertiaryColor = forceDefault ? null : (toCSS(colorStrings?.tertiaryColor) || (!inGuild && toCSS(displayNameStyles?.colors?.[2])) || null);

        primaryAdjusted = percentage ? adjustBrightness(primaryColor, parseInt(percentage)) : primaryColor;
        secondaryAdjusted = secondaryColor && percentage ? adjustBrightness(secondaryColor, parseInt(percentage)) : secondaryColor;
        tertiaryAdjusted = tertiaryColor && percentage ? adjustBrightness(tertiaryColor, parseInt(percentage)) : tertiaryColor;
    } else {
        primaryColor = forceDefault ? defaultColor : toCSS(savedColor);
        primaryAdjusted = primaryColor;
    }

    gradient =
        !canUseGradient || forceDefault
            ? null
            : useGradient && nicknameGradient && nicknameGradient.length
                ? (
                    isRadialGradient
                        ? `conic-gradient(from var(--custom-gradient-angle), ${nicknameGradient
                            .map(s => `#${s.color.toString(16).padStart(6, "0")} ${s.pos * 100}%`)
                            .join(", ")
                        })`
                        : `linear-gradient(var(--custom-gradient-angle), ${nicknameGradient
                            .map(s => `#${s.color.toString(16).padStart(6, "0")} ${s.pos * 100}%`)
                            .join(", ")
                        })`
                )
                : !secondaryColor
                    ? null
                    : tertiaryColor
                        ? isRadialGradient
                            ? "conic-gradient(from var(--custom-gradient-angle), var(--custom-gradient-color-1), var(--custom-gradient-color-2), var(--custom-gradient-color-3), var(--custom-gradient-color-1))"
                            : "linear-gradient(var(--custom-gradient-angle),var(--custom-gradient-color-1),var(--custom-gradient-color-2),var(--custom-gradient-color-3),var(--custom-gradient-color-1))"
                        : isRadialGradient
                            ? "conic-gradient(from var(--custom-gradient-angle), var(--custom-gradient-color-1), var(--custom-gradient-color-2), var(--custom-gradient-color-1))"
                            : "linear-gradient(var(--custom-gradient-angle),var(--custom-gradient-color-1),var(--custom-gradient-color-2),var(--custom-gradient-color-1))";

    const baseNormalStyle = {
        "isolation": "isolate"
    };

    const baseGradientStyle = {
        "background-clip": "text",
        "background-size": isRadialGradient ? "" : "100px auto",
        "-webkit-text-fill-color": "transparent",
        "-webkit-background-clip": "text",
        "isolation": "isolate"
    };

    return {
        normal: {
            original: { ...baseNormalStyle, "color": primaryColor, "text-decoration-color": primaryColor, "-webkit-text-fill-color": primaryColor },
            adjusted: { ...baseNormalStyle, "color": primaryAdjusted, "text-decoration-color": primaryAdjusted, "-webkit-text-fill-color": primaryAdjusted },
        },
        gradient: gradient ? {
            animated: {
                ...baseGradientStyle,
                "color": primaryColor,
                "text-decoration-color": primaryColor,
                "--custom-gradient-color-1": primaryColor,
                "--custom-gradient-color-2": secondaryColor || primaryColor,
                "--custom-gradient-color-3": tertiaryColor || primaryColor,
                "--custom-gradient-angle": `${gradientAngle}deg`,
                "background-image": gradient,
                "animation": isRadialGradient ? "smyn-conic-animation var(--smyn-gradient-duration) linear infinite" : "smyn-animation var(--smyn-gradient-duration) linear infinite"
            },
            static: {
                original: {
                    ...baseGradientStyle,
                    "color": primaryColor,
                    "text-decoration-color": primaryColor,
                    "--custom-gradient-color-1": primaryColor,
                    "--custom-gradient-color-2": secondaryColor || primaryColor,
                    "--custom-gradient-color-3": tertiaryColor || primaryColor,
                    "background-image": gradient,
                },
                adjusted: {
                    ...baseGradientStyle,
                    "color": primaryAdjusted,
                    "text-decoration-color": primaryAdjusted,
                    "--custom-gradient-color-1": primaryAdjusted,
                    "--custom-gradient-color-2": secondaryAdjusted || primaryAdjusted,
                    "--custom-gradient-color-3": tertiaryAdjusted || primaryAdjusted,
                    "background-image": gradient,
                },
            }
        } : null,
    };
}

function getRandomCustomization(userId: string): CustomUserProfile {
    let seed = 0;
    for (let i = 0; i < userId.length; i++) {
        seed = (seed * 31 + userId.charCodeAt(i)) >>> 0;
    }

    const rand = () => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 0xffffffff;
    };

    const randomColor = () =>
        "#" + Math.floor(rand() * 0xffffff).toString(16).padStart(6, "0");

    const randomEnum = <T extends number>(e: any): T => {
        const values = Object.values(e).filter(v => typeof v === "number") as T[];
        return values[Math.floor(rand() * values.length)];
    };

    const EFFECT_TYPES = [
        EffectType.Solid,
        EffectType.Gradient,
        EffectType.Neon,
        EffectType.Toon,
        EffectType.Pop,
        EffectType.TripleGradient
    ];

    const FONT_TYPES = [
        FontType.GgSans,
        FontType.Temp,
        FontType.Sakura,
        FontType.Jellybean,
        FontType.Modern,
        FontType.Medieval,
        FontType.Bit8,
        FontType.Vampyre
    ];

    return {
        color1: randomColor(),
        color2: randomColor(),
        color3: randomColor(),

        effectType: randomEnum<EffectType>(EFFECT_TYPES),
        fontId: randomEnum<FontType>(FONT_TYPES),

        useColors: true,
        isAnimated: true,
    };
}

function renderUsername(
    author: User | GuildMember | null,
    channelId: string | null,
    messageId: string | null,
    type: "messages" | "replies" | "typingIndicator" | "mentions" | "membersList" | "profilesPopout" | "profilesTooltip" | "reactionsTooltip" | "reactionsPopout" | "voiceChannel" | "serverMembersList" | "DmMembersList",
    mentionSymbol: string,
    hookless: boolean,
    inGuild: boolean,
    colorString?: string,
    colorStrings?: { primaryColor: string | null, secondaryColor: string | null, tertiaryColor: string | null; } | null,
    displayNameStylesFont?: any | null
): [string | null, JSX.Element | null, string | null] {
    if (!hookless) {
        settings.use(["triggerNameRerender"]);
    }
    if (!profiles) return [null, null, null];
    const isMessage = type === "messages";
    const isReply = type === "replies";
    const isMention = type === "mentions";
    const isTyping = type === "typingIndicator";
    const isMember = type === "membersList";
    const isProfile = type === "profilesPopout";
    const isReactionsPopout = type === "reactionsPopout";
    const isReactionsTooltip = type === "reactionsTooltip";
    const isReaction = isReactionsTooltip || isReactionsPopout;
    const isVoice = type === "voiceChannel";
    const isServersMemberList = type === "serverMembersList";
    const isDmMembersList = type === "DmMembersList";

    const channel = channelId ? ChannelStore.getChannel(channelId) || null : null;
    const message = channelId && messageId ? MessageStore.getMessage(channelId, messageId) : null;
    const groupId = (message as any)?.showMeYourNameGroupId || null;
    const userId = !inGuild ? (author as User)?.id : (author as GuildMember)?.userId ?? null;


    const profile = !inGuild || settings.store.showOnServer
        ? profiles[userId]
        : settings.store.randomizeForNonEdited
            ? (!inGuild || settings.store.randomizeOnServers
                ? getRandomCustomization(userId)
                : undefined)
            : undefined;
    let useGradient = profile?.useGradient;
    let useGlow = profile?.useGlow;
    let nicknameGradient = profile?.nicknameGradient;
    let customEffectType = profile?.effectType;
    let fontId = profile?.fontId;
    let color1 =
        (useGradient
            ? colorToHex(nicknameGradient?.[0]?.color, false) ?? (profile?.color1 ? `${profile.color1}` : null)
            : (profile?.color1 ? `${profile.color1}` : null) ?? colorToHex(nicknameGradient?.[0]?.color, false)
        ) ?? null;
    let color2 =
        (customEffectType === 1 || customEffectType === 5
            ? (
                useGradient
                    ? colorToHex(nicknameGradient?.[1]?.color, false) ?? (profile?.color2 ? `${profile.color2}` : null)
                    : (profile?.color2 ? `${profile.color2}` : null) ?? colorToHex(nicknameGradient?.[1]?.color, false)
            )
            : color1
        ) ?? null;
    let color3 =
        (customEffectType === 5
            ? (
                useGradient
                    ? colorToHex(nicknameGradient?.[2]?.color, false) ?? (profile?.color3 ? `${profile.color3}` : null)
                    : (profile?.color3 ? `${profile.color3}` : null) ?? colorToHex(nicknameGradient?.[2]?.color, false)
            )
            : null
        ) ?? null;
    let gradientAngle = profile?.gradientAngle ?? 90;
    let isAnimated = profile?.isAnimated;
    let useColors = profile?.useColors;
    let isRadialGradient = profile?.isRadialGradient;

    const isHovering = settings.store.forceAnimatedNickname ? true : (isMessage || isMention)
        ? ((messageId && hoveringMessageMap.has(messageId)) || (groupId && hoveringMessageMap.has(groupId)))
        : isReply
            ? (messageId && hoveringRepliesMap.has(messageId)) || (groupId && hoveringRepliesMap.has(groupId))
            : isReactionsPopout
                ? hoveringReactionPopoutSet.has((author as User).id)
                : false;

    if (colorString && !colorStrings) {
        colorStrings = {
            primaryColor: colorString,
            secondaryColor: null,
            tertiaryColor: null
        };
    }
    if (useColors && color1) {
        colorStrings = {
            primaryColor: `#${color1}`,
            secondaryColor: (customEffectType == 1 || customEffectType == 5) && color2 ? `#${color2}` : null,
            tertiaryColor: customEffectType == 5 && color3 ? `#${color3}` : null
        };
    }

    const ircColorsEnabled = isPluginEnabled(ircColors.name);

    let authorColorStrings = colorStrings || (author as any)?.colorStrings || null;
    if (!authorColorStrings && (author as any)?.displayNameStyles?.colors) {
        const colors = (author as any).displayNameStyles.colors;

        authorColorStrings = {
            primaryColor: colors[0],
            secondaryColor: colors[1] ? colors[1] : null,
            tertiaryColor: colors[2] ? colors[2] : null
        };
    }
    const authorDisplayNameStyles = useColors && color2 ? { colors: [color1, color2, color3], effectId: customEffectType } : (!ircColorsEnabled && (author as any)?.displayNameStyles) || null;

    const effectType = customEffectType ? getMyEffectType(customEffectType) : authorDisplayNameStyles ? getEffectType(authorDisplayNameStyles.effectId) : null;
    const effectCSSVars = authorDisplayNameStyles ? computeEffectCSSVars(authorDisplayNameStyles) : {};
    const hasEffect = !!effectType;
    const needsEffectDataAttr = effectType === "neon" || effectType === "toon" || effectType === "pop";
    const shouldShowEffect = hasEffect && isHovering;
    const shouldAnimateEffect = true;//shouldShowEffect && !AccessibilityStore.useReducedMotion && isAnimated;

    const canUseGradient = color2 != null || ((author as GuildMember)?.guildId ? (GuildStore.getGuild((author as GuildMember).guildId) ?? {}).premiumFeatures?.features.includes("ENHANCED_ROLE_COLORS") : !inGuild);
    const useTopRoleStyle = isMention || isReactionsPopout || isMember || channel?.isDM() || channel?.isGroupDM();
    const topRoleStyle = author ? resolveColor(authorColorStrings, authorDisplayNameStyles, "Role", canUseGradient, inGuild, ircColorsEnabled, isHovering, gradientAngle, isRadialGradient, useGradient, useColors ? nicknameGradient : undefined) : null;
    const hasGradient = color2 != null || !!topRoleStyle?.gradient && Object.keys(topRoleStyle.gradient).length > 0;

    const textMutedValue = getComputedStyle(document.documentElement)?.getPropertyValue("--text-muted")?.trim() || "#72767d";
    const resolvedCustomNameColor = null;// author ? resolveColor(authorColorStrings, authorDisplayNameStyles, '', canUseGradient, inGuild, ircColorsEnabled, isHovering, gradientAngle) : null;
    const affixColor = { color: textMutedValue, "-webkit-text-fill-color": textMutedValue, isolation: "isolate", "white-space": "pre", "font-family": "var(--font-primary)", "letter-spacing": "normal" };
    const { username, display, nick, friend, custom } = getProcessedNames(author, false, false, inGuild, false, false);
    if (!author || !username) {
        return [null, null, null];
    }

    const names: Record<string, [string | null, object | null]> = {
        user: [username, resolvedCustomNameColor],          // discord username or login
        display: [display, resolvedCustomNameColor],        // discord displayName
        nick: [nick, resolvedCustomNameColor],              // discord server nickname
        friend: [friend, resolvedCustomNameColor],          // discord friend nickname
        custom: [custom, resolvedCustomNameColor]           // plugin custom nickname
    };

    const shouldGradientGlow = useGlow;         //isHovering && hasGradient;
    const shouldAnimateGradients = true;        //shouldGradientGlow;
    const shouldAnimateSecondaryNames = true;   //animateGradients && !ignoreGradients;

    // Only mentions and reactions popouts should patch in the gradient glow or else a double glow will appear on messages.
    const hoveringClass = (isHovering ? " smyn-gradient-hovered" : "");
    const gradientClasses = useTopRoleStyle
        ? "smyn-gradient smyn-gradient-inherit-bg" + hoveringClass
        : "smyn-gradient smyn-gradient-unset-bg" + hoveringClass;

    const firstGroupClasses = "smyn-name-group smyn-first-name-group";
    const firstNameClasses = "smyn-name smyn-first-name";
    const prefixClasses = "smyn-affix smyn-prefix";
    const suffixClasses = "smyn-affix smyn-suffix";

    const customName = names.custom[0] ?? "";
    const friendName = names.friend[0] ?? "";
    const nickName = names.nick[0] ?? "";
    const globalName = names.display[0] ?? "";
    const userName = names.user[0] ?? "";
    let finalName: string;
    if (customName) {
        finalName = settings.store.showUsernameInNickname && !isServersMemberList
            ? `${customName} (${userName})`
            : customName;
    } else {
        finalName =
            friendName ||
            nickName ||
            globalName ||
            userName;
    }

    const allDataText = mentionSymbol + finalName;
    const animationDuration = !isAnimated ? 0 : Math.max(1, 1.5 * ((names.custom[0]?.length ?? names.user[0]?.length ?? 12) / 12));

    const topLevelStyle = {
        // Allows names to wrap in reaction popouts.
        ...(isReactionsPopout
            ? { display: "flex", flexWrap: "wrap", lineHeight: "1.1em", fontSize: "0.9em" }
            : {}),
        ...(hasEffect ? effectCSSVars : {}),
        "--smyn-gradient-duration": `${animationDuration}s`
    } as React.CSSProperties;

    const nameElement = (
        <span
            style={{
                ...topLevelStyle,
                ...(topRoleStyle?.normal.original || {})
            }}
            className={`smyn-container ${displayNameStylesFont ?? ""} ${isServersMemberList || isDmMembersList ? "smyn-no-underline" : ""}`}
        >
            {(
                <span
                    className={EDITUSERS(firstGroupClasses, { [gradientClasses]: shouldGradientGlow })}
                    data-text={shouldGradientGlow ? allDataText : undefined}
                    style={(shouldGradientGlow && useTopRoleStyle && topRoleStyle ? topRoleStyle.gradient?.animated : undefined) as React.CSSProperties}
                >
                    <span
                        className={EDITUSERS(firstNameClasses, {
                            "smyn-effect-container": shouldShowEffect,
                            [`smyn-effect-${effectType}`]: shouldShowEffect,
                            "smyn-effect-animated": shouldAnimateEffect
                        })}
                        data-username-with-effects={needsEffectDataAttr && shouldShowEffect ? allDataText : undefined}
                        style={shouldShowEffect
                            ? undefined
                            : topRoleStyle ?
                                shouldAnimateGradients && topRoleStyle.gradient
                                    ? topRoleStyle.gradient.animated
                                    : topRoleStyle.gradient
                                        ? topRoleStyle.gradient.static.original
                                        : topRoleStyle.normal.original
                                : undefined
                        }>
                        {allDataText}</span>
                </span>
            )}

        </span>
    );

    return [allDataText, nameElement, allDataText];
}

function getTypingMemberListProfilesReactionsVoiceName(
    props: memberListProfileReactionProps,
): [string | null, JSX.Element | null, string | null] {
    const { user, type, displayNameStylesFont } = props;
    // props.guildId for member list & preview profile, props.tags.props.displayProfile.guildId
    // for full guild profile and main profile, which is indicated by whether it is null or not.
    const guildId = props.guildId || props.tags?.props?.displayProfile?.guildId || null;
    const member = guildId && user ? GuildMemberStore.getMember(guildId, user.id) : null;
    const author = user && member ? { ...user, ...member } : user || member || null;
    const shouldHookless = ["typingIndicator", "reactionsTooltip", "profilesTooltip"].includes(type);
    return renderUsername(author, null, null, type, "", shouldHookless, !!guildId, "", null, displayNameStylesFont);
}

function getTypingMemberListProfilesReactionsVoiceNameColorStrings(
    props: memberListProfileReactionProps
): colorStringsType | null {

    if (!props?.user?.id) return null;

    const profile = profiles[props.user.id];
    if (!profile) return null;

    const effectType = profile.effectType ?? 0;
    const useGradient = profile.useGradient;
    const g = profile.nicknameGradient;

    const color1 = (useGradient
        ? colorToHex(g?.[0]?.color) ?? (profile.color1 ? `#${profile.color1}` : null)
        : (profile.color1 ? `#${profile.color1}` : null) ?? colorToHex(g?.[0]?.color)) ?? null;

    const color2 =
        (effectType === 1 || effectType === 5
            ? (
                useGradient
                    ? colorToHex(g?.[1]?.color) ?? (profile.color2 ? `#${profile.color2}` : null)
                    : (profile.color2 ? `#${profile.color2}` : null) ?? colorToHex(g?.[1]?.color)
            )
            : color1) ?? null;

    const color3 =
        (effectType === 5
            ? (
                useGradient
                    ? colorToHex(g?.[2]?.color) ?? (profile.color3 ? `#${profile.color3}` : null)
                    : (profile.color3 ? `#${profile.color3}` : null) ?? colorToHex(g?.[2]?.color)
            )
            : null) ?? null;

    return {
        primaryColor: color1,
        secondaryColor: color2,
        tertiaryColor: color3
    };
}

function getTypingMemberListProfilesReactionsVoiceNameText(props: memberListProfileReactionProps): string | null {
    return getTypingMemberListProfilesReactionsVoiceName(props)[2];
}

function getTypingMemberListProfilesReactionsVoiceNameElement(props: memberListProfileReactionProps): JSX.Element | null {
    return getTypingMemberListProfilesReactionsVoiceName(props)[1];
}

let displayNameHash: string | null | undefined;

function getDisplayNameHash(): string | null {
    if (displayNameHash != null) return displayNameHash;
    const el = document.querySelector('[class*="dnsFont__"]');
    const match = el?.className.match(/dnsFont__(\w+)/);
    displayNameHash = match ? match[1] : null;
    return displayNameHash;
}

const fontClassMap: Record<FontType, string> = {
    [FontType.Sakura]: "cherryBomb",
    [FontType.Jellybean]: "chicle",
    [FontType.Modern]: "museoModerno",
    [FontType.Medieval]: "neoCastel",
    [FontType.Bit8]: "pixelify",
    [FontType.Vampyre]: "sinistre",
    [FontType.GgSans]: "",
    [FontType.Temp]: "zillaSlab"
};

function getFontClass(fontId?: number): string {
    const hash = getDisplayNameHash();
    if (!hash || fontId == null || fontId === 0) return "";

    const font = fontClassMap[DiscordFontIdToFontType[fontId] as FontType];
    if (!font) return "";

    return `dnsFont__${hash} ${font}__${hash}`;
}

function getTypingMemberListProfilesReactionsVoiceNameElement2(props: memberListProfileReactionProps): JSX.Element | null {
    props.displayNameStylesFont = getFontClass((props?.user as any)?.displayNameStyles?.fontId ?? '');
    return getTypingMemberListProfilesReactionsVoiceName(props)[1];
}

function getMessageName(props: messageProps): [string | null, JSX.Element | null, string | null] {
    //const { hideDefaultAtSign, replies } = settings.use(["hideDefaultAtSign", "replies"]);
    const hideDefaultAtSign = false;
    const replies = true;
    const { message, userOverride, isRepliedMessage, withMentionPrefix } = props;
    const isWebhook = !!message?.webhookId && !message?.interaction;
    const channel = message ? ChannelStore.getChannel(message.channel_id) || null : null;
    const target = userOverride || message?.author;
    if (!UserStore) return [null, null, null];
    const user = isWebhook ? target : target ? UserStore.getUser(target.id) : null;
    const member = isWebhook ? null : target && channel ? GuildMemberStore.getMember(channel.guild_id, target.id) : null;
    const author = user && member ? { ...user, ...member } : user || member || null;
    const mentionSymbol = hideDefaultAtSign && (!isRepliedMessage || replies) ? "" : withMentionPrefix ? "@" : "";
    return renderUsername(author, channel?.id || null, message?.id || null, isRepliedMessage ? "replies" : "messages", mentionSymbol, false, !!channel?.guild_id, props.colorString, props.colorStrings);
}

function getMessageNameElement(props: messageProps): JSX.Element | null {
    return getMessageName(props)[1];
}

function getMessageNameText(props: messageProps): string | null {
    return getMessageName(props)[0];
}

function getMentionNameElement(props: mentionProps): JSX.Element | null {
    //const { hideDefaultAtSign, mentions } = settings.use(["hideDefaultAtSign", "mentions"]);
    const hideDefaultAtSign = false;
    const mentions = true;
    const { channelId, userId, props: nestedProps } = props;
    const channel = channelId ? ChannelStore.getChannel(channelId) || null : null;
    if (!UserStore) return null;
    const user = UserStore.getUser(userId);
    const member = channel ? GuildMemberStore.getMember(channel.guild_id, userId) : null;
    const author = user && member ? { ...user, ...member } : user || member || null;
    const mentionSymbol = hideDefaultAtSign && mentions ? "" : "@";

    let colorString: string | undefined = undefined;
    let colorStrings: colorStringsType = undefined;

    if (isPluginEnabled(ircColors.name)) {
        const color = ircColors.calculateNameColorForMessageContext({ message: { author: author }, author: author, channel: channel });

        if (color) {
            colorString = color;
            colorStrings = { primaryColor: color, secondaryColor: null, tertiaryColor: null };
        }
    }

    return renderUsername(author, channelId || null, nestedProps?.messageId || null, "mentions", mentionSymbol, false, !!channel?.guild_id, colorString, colorStrings)[1];
}

export default definePlugin({
    name: "EditUsers",
    description: "Allows you to locally edit users like their color, displayName, avatar, tag, profile color and other stuff",
    authors: [Devs.Magic3000],
    contextMenus: {
        "user-context": userContextMenuPatch,
        "gdm-context": channelContextMenuPatch,
    },
    settings,
    requireSettingsMenu,
    getCustomColorString,
    getCustomNameString,
    patchUserObject,
    patchUserProfileObject,
    origGetUserProfile: null as any,
    UserStore,

    addHoveringMessage,
    removeHoveringMessage,
    handleHoveringMessage,
    addHoveringReactionPopout,
    removeHoveringReactionPopout,
    getMessageName,
    getMessageNameText,
    getMessageNameElement,
    getMentionNameElement,
    getTypingMemberListProfilesReactionsVoiceNameText,
    getTypingMemberListProfilesReactionsVoiceNameElement,
    getTypingMemberListProfilesReactionsVoiceNameElement2,
    getTypingMemberListProfilesReactionsVoiceNameColorStrings,

    async start() {
        await reloadProfiles();
        console.log(`profiles reloaded ${Object.keys(profiles).length}`, profiles);

        toCSSCache = new Map();
        toCSSProbe = document.createElement("div");
        convertToRGBCanvas = document.createElement("canvas");
        convertToRGBCanvas.width = convertToRGBCanvas.height = 1;
        convertToRGBCtx = convertToRGBCanvas.getContext("2d", { willReadFrequently: true });
        convertToRGBCache = new Map();

        //const data = await DataStore.get<CustomNicknameData>("SMYNCustomNicknames");
        //customNicknames = data ?? {};

        if (!UserStore) return;
        let origGetUser = UserStore.getUser;
        UserStore.getUser = (id: string) => {
            const user = origGetUser(id);
            return this.patchUserObject(user);
        };
        /*let getCurrentUser = UserStore.getCurrentUser;
        UserStore.getCurrentUser = () => {
            const user = getCurrentUser();
            return this.patchUserObject(user);
        };*/

        this.origGetUserProfile = UserProfileStore.getUserProfile;
        UserProfileStore.getUserProfile = (id: string) => {
            const userProfile = this.origGetUserProfile(id);
            return this.patchUserProfileObject(userProfile);
        };


    },

    stop() {
        toCSSCache?.clear();
        toCSSCache = null;
        toCSSProbe = null;
        convertToRGBCache?.clear();
        convertToRGBCache = null;
        convertToRGBCanvas = null;
        convertToRGBCtx = null;
    },


    flux: {
        RELATIONSHIP_UPDATE(data) {
            // Allows rerendering when changing friend names.
            settings.store.triggerNameRerender = !settings.store.triggerNameRerender;
        },

        RUNNING_STREAMER_TOOLS_CHANGE(data) {
            // Allows rerendering when toggling streamer mode.
            settings.store.triggerNameRerender = !settings.store.triggerNameRerender;
        },

        ACCESSIBILITY_SYSTEM_PREFERS_REDUCED_MOTION_CHANGED(data) {
            // Allows rerendering when toggling reduced motion.
            settings.store.triggerNameRerender = !settings.store.triggerNameRerender;
        },

        ACCESSIBILITY_SET_PREFERS_REDUCED_MOTION(data) {
            // Allows rerendering when toggling reduced motion.
            settings.store.triggerNameRerender = !settings.store.triggerNameRerender;
        }
    },

    settingsAboutComponent: () => (
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <Button onClick={() => exportConfig()}>
                Export config
            </Button>
            <Button onClick={() => importConfig()}>
                Import config
            </Button>
        </div>
    ),

    patches: [
        {
            find: '="SYSTEM_TAG"',
            group: true,
            replacement: [
                {
                    // Replace names in messages and replies.
                    match: /(?<=colorString:(\i),colorStrings:(\i).{0,900}?)style:.{0,120}?,(onClick:\i,onContextMenu:\i,children:)(.{0,250}?),"data-text":(\i\+\i)/,
                    replace: "$3$self.getMessageNameElement({...arguments[0],colorString:$1,colorStrings:$2})??($4),\"data-text\":$self.getMessageNameText(arguments[0])??($5)"
                },
                {
                    // Pass the message object to the should-animate checker.
                    match: /(\(\{)(shouldSubscribe)/,
                    replace: "$1message:arguments[0].message,$2"
                }
            ]
        },
        {
            // Replace names in the typing indicator.
            find: "activityInviteEducationActivity:",
            replacement: {
                match: /(?=\i.\i.getName\((\i.guild_id),\i.id,(\i)\))/,
                replace: "$self.getTypingMemberListProfilesReactionsVoiceNameText({user:$2,type:\"typingIndicator\",guildId:$1})??"
            },
        },
        {
            // Replace names in DMs list.
            find: "ImpressionNames.DM_LIST_RIGHT_CLICK_MENU_SHOWN",
            replacement: {
                match: /(=\s*)(\(0,.\.jsx[s]?\)\(.\..,\{)/,
                replace: "$1$self.getTypingMemberListProfilesReactionsVoiceNameElement2({user:r,type:\"DmMembersList\"})??$2"
            },
            predicate: () => settings.store.additionalDMListMembersCustomization
        },
        {
            // Replace names in DMs list.
            find: "ImpressionNames.DM_LIST_RIGHT_CLICK_MENU_SHOWN",
            replacement: {
                match: /(?<=getMentionCount\(\i.id\)>0\),\i=)/,
                replace: "$self.getTypingMemberListProfilesReactionsVoiceNameText({...arguments[0],type:\"DmMembersList\"})??"
            },
            predicate: () => !settings.store.additionalDMListMembersCustomization
        },
        {
            // Replace names in the friends list.
            find: "hasUniqueUsername()}),usernameClass",
            replacement: {
                match: /(?<=nick:)(\i)/,
                replace: "$self.getTypingMemberListProfilesReactionsVoiceNameText({user:arguments[0].user,type:\"membersList\"})??$1"
            },
        },
        {
            // Don't block name style in friends list just
            // because the name is the same as the username.
            find: "location:\"DiscordTag\"});",
            replacement: {
                match: /(?<=forceUsername:(\i),.{0,550}?displayNameStyles:)\i!==\i\?(\i.displayNameStyles):null/,
                replace: "!$1?$2:null"
            },
        },
        {
            // Replace name in solo DM title bar and tooltip.
            find: "channel.isSystemDM(),",
            replacement: {
                match: /(?<=}\);)(return.{0,500}?{text:)(\i,position:"bottom",children:.{0,40}?children:)(\i\?\?\i.\i.getName\(\i\))/,
                replace: "const smynName=arguments[0].channel.recipients.length===1?$self.getTypingMemberListProfilesReactionsVoiceNameText({user:$self.UserStore.getUser(arguments[0].channel.recipients[0]),type:\"profilesPopout\"})??null:null;$1smynName??$2smynName??$3"
            },
        },
        {
            // Track hovering on messages to animate gradients.
            // Attach the group ID to their messages to allow animating gradients within a group.
            find: "CUSTOM_GIFT?\"\":",
            replacement: {
                match: /(isHovered:(\i).{0,1300}?\(\i,\i,\i\);)(let \i=\i.id===\i)/,
                replace: "$1arguments[0].message.showMeYourNameGroupId=!!arguments[0].groupId?`g-${arguments[0].groupId}`:null;$self.handleHoveringMessage(arguments[0].message,$2);$3"
            },
        },
        {
            // Replace names in mentions.
            find: ".USER_MENTION)",
            replacement: [
                {
                    match: /(let \i=\i=>\(0,)/,
                    replace: "const showMeYourNameMention=$self.getMentionNameElement(arguments[0]);$1"
                },
                {
                    match: /(?<=onContextMenu:\i,\.\.\.\i,children:)/,
                    replace: "showMeYourNameMention??",
                    predicate: () => !isPluginEnabled(mentionAvatars.name),
                }
            ]
        },
        {
            // Pass on the props to the mention renderer so that hovering second-level
            // message mentions can accurately be tracked based on props.messageId
            find: "noStyleAndInteraction},",
            replacement: {
                match: /(className:"mention",)/,
                replace: "$1props:arguments[2],"
            }
        },
        {
            // Replace element in the server member list.
            find: "displayNameStylesFont:_",
            replacement: {
                match: /\(0,(\w+)\.jsx\)\(u\.gyj,{/,
                replace: "$self.getTypingMemberListProfilesReactionsVoiceNameElement({...e,type:\"serverMembersList\",displayNameStylesFont:_})??(0,$1.jsx)(u.gyj,{",
                predicate: () => settings.store.additionalServerMembersCustomization
            }
        },
        {
            // Replace names in the member list.
            find: "let{colorRoleName:",
            replacement: {
                match: /(let{colorRoleName:\i,colorString:\i,colorStrings:\i,)name:(\i)/,
                replace: "$1showMeYourNameName:$2=$self.getTypingMemberListProfilesReactionsVoiceNameText({...arguments[0],type:\"membersList\"})??(arguments[0].name)",
                predicate: () => !settings.store.additionalServerMembersCustomization
            }
        },
        {
            // Replace colorStrings in the member list.
            find: "let{colorRoleName:",
            replacement: {
                match: /(let{colorRoleName:\i,colorString:\i,)colorStrings:(\i)/,
                replace: "$1showMeYourNameName:$2=$self.getTypingMemberListProfilesReactionsVoiceNameColorStrings({...arguments[0]})??(arguments[0].colorStrings)",
                predicate: () => !settings.store.additionalServerMembersCustomization
            }
        },
        {
            // Replace names in profile popouts.
            find: "shouldWrap:!0,loop:!0,inProfile:!0",
            replacement: {
                match: /(tags:\i,)nickname:(\i)/,
                replace: "$1showMeYourNameNickname:$2=$self.getTypingMemberListProfilesReactionsVoiceNameText({...arguments[0],type:\"profilesPopout\"})??(arguments[0].nickname)"
            },
        },
        {
            // Replace names in the profile tooltip for switching between guild and global profiles.
            // You must open a profile modal before the code this is patching will be searchable.
            find: 'id:"view-server-profile",',
            group: true,
            replacement: [
                {
                    match: /(displayName:)(\i.\i.getName\(void 0,void 0,\i\))/,
                    replace: "$1$self.getTypingMemberListProfilesReactionsVoiceNameText({user:arguments[0].user,guildId:null,type:\"profilesTooltip\"})??($2)"
                },
                {
                    match: /(displayName:)(\i.\i.getName\(\i,\i,\i\))/,
                    replace: "$1$self.getTypingMemberListProfilesReactionsVoiceNameText({user:arguments[0].user,guildId:arguments[0].guildId,type:\"profilesTooltip\"})??($2)"
                }
            ]
        },
        {
            // Replace names in reaction tooltips.
            find: "reactionTooltip1,",
            replacement: {
                match: /(\i.\i.getName\((\i),\i\?\.id,(\i)\))/,
                replace: "$self.getTypingMemberListProfilesReactionsVoiceNameText({user:$3,guildId:$2,type:\"reactionsTooltip\"})??($1)"
            }
        },
        {
            find: ".MESSAGE,userId:",
            group: true,
            replacement: [
                {
                    // Track hovering over reaction popouts.
                    match: /(?<=\(0,\i.\i\)\(\i.\i,{className:\i.\i,)(?=(?:align:\i\.\i\.\i\.CENTER|onContextMenu:\i=>))/g,
                    replace: "onMouseEnter:()=>{$self.addHoveringReactionPopout(arguments[0].user.id)},onMouseLeave:()=>{$self.removeHoveringReactionPopout(arguments[0].user.id)},"
                },
                {
                    // Replace names in reaction popouts.
                    match: /(?<=Child,{className:\i.\i,children:)/g,
                    replace: "($self.getTypingMemberListProfilesReactionsVoiceNameElement({user:arguments[0].user,guildId:arguments[0].guildId,type:\"reactionsPopout\"}))??"
                }
            ]
        },
        {
            // Replace names in voice channels.
            find: ",connectUserDragSource:",
            replacement: {
                match: /(serverDeaf:\i,)nick:(\i)/,
                replace: "$1showMeYourNameVoice:$2=$self.getTypingMemberListProfilesReactionsVoiceNameText({user:arguments[0].user,guildId:arguments[0].channel.guild_id,type:\"voiceChannel\"})??(arguments[0].nick)"
            }
        },

        // tags
        {
            find: ".STAFF_ONLY_DM:",
            replacement: [
                {
                    match: /(?<=type:(\i).*?\.BOT:.{0,25})default:(\i)=/,
                    replace: "default:$2=$self.getTagText($1);",
                },
            ]
        },
        // global avatar spoof
        {
            find: "getUserBannerURL",
            replacement: {
                match: /function \w+\(e\)\{let t,\{id:\w+,banner:\w+,canAnimate:\w+,size:\w+\}=e;/,
                replace: `
				  $&
				  const custom = $self.getCustomBannerUrl?.(e?.id);
				  if (custom) return custom;
				`
            }
        },
        // always show colored displayNameStyles
        {
            find: "data-username-with-effects",
            replacement: {
                match: /i!==h\.G\.PLAIN/,
                replace: "true"
            }
        },

    ],

    // for tags
    renderMessageDecoration(props) {
        try {
            var userId = props?.message?.author?.id;
            var color = `#${(profiles[userId]?.tagColor ?? "5865F2")}`;
            var textColor = `#${(profiles[userId]?.tagTextColor ?? "ffffff")}`;
            const colorClass = `editusers-color-${userId}`;
            ensureTagStyle(userId, color, textColor);
            if (userId && profiles[userId]?.tagText) {
                return <Tag
                    useRemSizes={true}
                    className={EDITUSERS("message-tag", colorClass, props.message.author.isVerifiedBot() && "message-verified")}
                    type={userId}>
                </Tag>;
            }
        }
        catch (exc) {
            console.log('Failed to renderMessageDecoration', exc);
        }
        return null;
    },

    // tags
    renderMemberListDecorator(props) {
        try {
            if (props.type == 'guild') return null; // Don't render in the guild list.
            var user = props.user;
            if (!user) return null;
            var userId = user.id;
            var color = `#${(profiles[userId]?.tagColor ?? "5865F2")}`;
            var textColor = `#${(profiles[userId]?.tagTextColor ?? "ffffff")}`;
            const colorClass = `editusers-color-${userId}`;
            ensureTagStyle(userId, color, textColor);
            if (userId && profiles[userId]?.tagText) {
                return <Tag
                    className={EDITUSERS(colorClass)}
                    type={userId}>
                </Tag>;
            }
        }
        catch (exc) {
            console.log('Failed to renderMemberListDecorator', exc);
        }
        return null;
    },

    // tags
    getTagText(tagId: string) {
        return profiles[tagId]?.tagText ?? getIntlMessage("APP_TAG");;
    },

    // global avatar spoof
    getCustomBannerUrl(userId: string) {
        const profile = profiles[userId];
        return profile?.removeBanner ? 'https://mwittrien.github.io/BetterDiscordAddons/Themes/_res/svgs/empty.png' : profile?.bannerUrl;
    },
});