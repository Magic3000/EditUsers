import "./styles.css";

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { get } from "@api/DataStore";
import { definePluginSettings, Settings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { classNameFactory } from "@utils/css";
import { getIntlMessage } from "@utils/discord";
import { openModal } from "@utils/modal";
import definePlugin, { OptionType } from "@utils/types";
import { Channel, User } from "@vencord/discord-types";
import { extractAndLoadChunksLazy, findLazy } from "@webpack";
import { ChannelStore, Menu, SelectedChannelStore, UserStore, React, UserProfileStore } from "@webpack/common";
import { SetUserModal } from "./SetUserModal";
import { Button } from "@components/Button";
import { FluxDispatcher } from "@webpack/common";

export const DATASTORE_PROFILES_KEY = "vencord-editusers";

export let profiles: Record<string, CustomUserProfile> = {};

export async function reloadProfiles() {
    profiles =
        await get<Record<string, CustomUserProfile>>(DATASTORE_PROFILES_KEY) || {};
}
const requireSettingsMenu = extractAndLoadChunksLazy(['type:"USER_SETTINGS_MODAL_OPEN"']);

const cl = classNameFactory("vc-mut-");

export const Tag = findLazy(m => m.Types?.[0] === "BOT") as React.ComponentType<{ type?: number | null, className?: string, useRemSizes?: boolean; }> & { Types: Record<string, number>; };

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

export function getCustomColorString(id: string | undefined, withHash?: boolean): string | undefined {
    if (!id || !Settings.plugins.EditUsers.enabled) return;

    const color = profiles[id]?.color1;
    if (!color) return;

    return withHash ? `#${color}` : color;
}

export function getCustomNameString(id: string | undefined): string | undefined {
    if (!id || !Settings.plugins.EditUsers.enabled) return;
    return profiles[id]?.nickname;
}

function normalizeAvatarUrl(url: string) {
    if (!url) return url;

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

export function patchUserProfileObject(this: any, userProfile: any) {
    if (!userProfile) return userProfile;

    const id = userProfile?.userId;
    if (!id) return userProfile;

    const profile = profiles[id];
    if (!profile) return userProfile;

    const newUserProfileObject =
        new (userProfile.constructor as any)(userProfile);

    const origUserProfile = this.origGetUserProfile(id);

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

export function patchUserObject(user: any) {
    const id = user?.id;
    if (!id) return user;

    const newUserObject = new (user.constructor as any)(user);

    const profile = profiles[id];
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
        let globalName = profile.globalName;
        if (globalName) {
            newUserObject.globalName = globalName;
        }

        if (profile.isAnimated) {
            newUserObject.displayNameStyles = {
                effectDisplayType: 2,
                loop: profile.isAnimated,
                fontId: FontIdMap[profile.fontId ?? 0],
                effectId: (profile.effectType ?? 0) + 1,
                colors: [
                    profile.color1,
                    profile.color2
                ]
            };
        }
    }

    return newUserObject;
}

const injectedTagStyles = new Map<string, [string, string]>();

function ensureTagStyle(userId: string, color: string, textColor: string = "var(--white-500)") {
    const className = `vc-mut-editusers-color-${userId}`;
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

const FontIdMap: Record<FontType, number> = {
    [FontType.GgSans]: 11,
    [FontType.Temp]: 12,
    [FontType.Sakura]: 3,
    [FontType.Jellybean]: 4,
    [FontType.Modern]: 6,
    [FontType.Medieval]: 7,
    [FontType.Bit8]: 8,
    [FontType.Vampyre]: 10,
};

const settings = definePluginSettings({
    forceAnimatedNickname: {
        type: OptionType.BOOLEAN,
        description: "Force nickname to be animated like you always hover on it",
        default: true,
    }
});

export interface CustomUserProfile {
    color1?: string;
    color2?: string;
    nickname?: string;
    isAnimated?: boolean;
    effectType?: EffectType;
    fontId?: FontType;
    avatarUrl?: string;
    globalName?: string;
    tagText?: string;
    tagColor?: string;
    tagTextColor?: string;
    tagBadgeUrl?: string;
    profileBannerColor?: string;
    profilePrimaryColor?: string;
    profileAccentColor?: string;
    bannerUrl?: string;
    removeBanner?: boolean;
    removeEffect?: boolean;
};

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

    async start() {
        await reloadProfiles();

        let origGetUser = UserStore.getUser;
        UserStore.getUser = (id: string) => {
            const user = origGetUser(id);
            return this.patchUserObject(user);
        };

        this.origGetUserProfile = UserProfileStore.getUserProfile;
        UserProfileStore.getUserProfile = (id: string) => {
            const userProfile = this.origGetUserProfile(id);
            return this.patchUserProfileObject(userProfile);
        };

    },

    stop() {
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
            replacement: {
                match: /(?<=colorString:\i,colorStrings:\i,colorRoleName:\i.*?}=)(\i),/,
                replace: "$self.wrapMessageColorProps($1, arguments[0]),"
            },
            predicate: () => !Settings.plugins.IrcColors.enabled,
            noWarn: true
        },
        {
            find: ".STAFF_ONLY_DM:",
            replacement: [
                {
                    match: /(?<=type:(\i).*?\.BOT:.{0,25})default:(\i)=/,
                    replace: "default:$2=$self.getTagText($1);",
                },
            ]
        },
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
        {
            find: "data-username-with-effects",
            replacement: {
                match: /i!==h\.G\.PLAIN/,
                replace: "true"
            }
        },
        {
            find: "PrivateChannel.renderAvatar",
            replacement: {
                match: /(\i\]:\i\}\),children:\i\}\),)(?=.{0,100}isSystemDM\(\))/,
                replace: "$1style:{color:`${$self.colorDMList(arguments[0])}`},"
            }
        },
        {
            find: "PrivateChannel.renderAvatar",
            replacement: {
                match: /(name:\(0,.\.jsx\)\(\i\.\i,\{[^]*?children:)(\i)/,
                replace: "$1$self.patchDmName(arguments[0], $2)"
            }
        },
        {
            find: '"AvatarWithText"',
            replacement: [
                {
                    match: /(\}=\i)/,
                    replace: ",style$1"
                },
                {
                    match: /(?<="div",\{className:\i\.\i,)(?=children:\[)/,
                    replace: "style:style||{},"
                },
            ]
        },
        {
            find: '"Reply Chain Nudge")',
            replacement: {
                match: /(className:.{0,15},colorString:)(\i),/,
                replace: "$1$self.colorInReplyingTo(arguments[0]) ?? $2,",
            }
        },
    ],

    renderMessageDecoration(props) {
        try {
            var userId = props?.message?.author?.id;
            var color = `#${(profiles[userId]?.tagColor ?? "5865F2")}`;
            var textColor = `#${(profiles[userId]?.tagTextColor ?? "ffffff")}`;
            const colorClass = `editusers-color-${userId}`;
            ensureTagStyle(userId, color, textColor);
            if (userId && profiles[userId]?.tagText) {
                return userId && <Tag
                    useRemSizes={true}
                    className={cl("message-tag", colorClass, props.message.author.isVerifiedBot() && "message-verified")}
                    type={userId}
                    verified={false}>
                </Tag>;
            }
        }
        catch (exc) {
            console.log('Failed to renderMessageDecoration', exc);
        }
    },

    renderMemberListDecorator(props) {
        try {
            var user = props.user;
            if (!user) return;
            var userId = user.id;
            var color = `#${(profiles[userId]?.tagColor ?? "5865F2")}`;
            var textColor = `#${(profiles[userId]?.tagTextColor ?? "ffffff")}`;
            const colorClass = `editusers-color-${userId}`;
            ensureTagStyle(userId, color, textColor);
            if (userId && profiles[userId]?.tagText) {
                return userId && <Tag
                    className={cl(colorClass)}
                    type={userId}
                    verified={false}>
                </Tag>;
            }
        }
        catch (exc) {
            console.log('Failed to renderMemberListDecorator', exc);
        }
    },

    getTagText(tagId: string) {
        return profiles[tagId]?.tagText ?? getIntlMessage("APP_TAG");;
    },

    wrapMessageColorProps(colorProps: { nick: string, colorString: string, colorStrings?: Record<"primaryColor" | "secondaryColor" | "tertiaryColor", string>; }, context: any) {
        try {
            const channelId = SelectedChannelStore.getChannelId();
            const channel = ChannelStore.getChannel(channelId);
            const isDM = channel.isDM() || channel.isMultiUserDM();
            const colorString = this.colorIfServer(context);
            const customName = this.nickname(context);
            if (customName != '') {
                colorProps.nick = customName;
            }
            if (colorString === colorProps.colorString) return colorProps;
            if (!isDM) return colorProps;

            return {
                ...colorProps,
                colorString,
                colorStrings: colorProps.colorStrings && {
                    primaryColor: colorString,
                    secondaryColor: undefined,
                    tertiaryColor: undefined
                }
            };
        } catch (e) {
            console.error("Failed to calculate message color strings:", e);
            return colorProps;
        }
    },

    colorDMList(context: any): string | undefined {
        const id = context?.user?.id ?? context?.channel?.id;
        const colorString = getCustomColorString(id, true);

        return colorString ?? "inherit";
    },

    getCustomBannerUrl(userId: string) {
        const profile = profiles[userId];
        return profile?.removeBanner ? 'https://mwittrien.github.io/BetterDiscordAddons/Themes/_res/svgs/empty.png' : profile?.bannerUrl;
    },

    patchDmName(context: any, node: any) {
        try {
            let id = context?.user?.id;
            let isServer = false;
            if (!id) {
                isServer = true;
                id = context?.channel?.id;
            }
            const customName = this.dmNickname(context, id, isServer);
            const profile = profiles[id];

            let props = [];
            if (node.type == Symbol.for("react.fragment")) {
                props = node.props.children[0].props;
            }
            else {
                props = node.props;
            }

            if (customName != '')
                props.userName = customName;

            if (isServer) return node;

            function animate() {
                props.effectDisplayType = 2;
                props.loop = true;
            }

            if (settings.store.forceAnimatedNickname && props.displayNameStyles) {

                props.displayNameStyles.effectDisplayType = 2;
                props.displayNameStyles.loop = true;
                animate();
            }

            if (!profile) return node;

            if (profile.isAnimated) animate();
            props.displayNameStyles = {
                effectDisplayType: 2,
                loop: profile.isAnimated,
                fontId: FontIdMap[profile.fontId],
                effectId: profile.effectType + 1,
                colors: [
                    profile.color1,
                    profile.color2
                ]
            };

        } catch (e) {
            console.error("patchDmName failed", e);
        }

        return node;
    },

    colorIfServer(context: any): string | undefined {
        const userId = context?.message?.author?.id;
        const colorString = context?.author?.colorString;

        const color = getCustomColorString(userId, true);
        return color ?? colorString ?? undefined;
    },

    colorInReplyingTo(a: any) {
        const { id } = a.reply.message.author;
        return getCustomColorString(id, true);
    },

    nickname(context: any): string | undefined {
        const userId = context?.message?.author?.id;
        const globalName = context?.message?.author?.globalName;
        const displayName = getCustomNameString(userId);
        if (displayName) {
            return `${displayName} (${globalName})`;
        }
        return '';
    },

    dmNickname(context: any, id: any, isServer: any): string | undefined {
        let globalName = '';
        if (!isServer) {
            globalName = context?.user?.globalName;
            globalName = `(${globalName})`;
        }
        const displayName = getCustomNameString(id);
        if (displayName) {
            return `${displayName} ${globalName}`;
        }
        return '';
    },
});