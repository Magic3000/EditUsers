import { set } from "@api/DataStore";
import { Heading } from "@components/Heading";
import { classNameFactory } from "@utils/css";
import {
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalProps,
    ModalRoot
} from "@utils/modal";
import {
    ColorPicker,
    TextInput,
    Select,
    useState,
    useEffect
} from "@webpack/common";

import GradientColorPicker from "./GradientColorPicker";
import { GradientStop } from "./GradientColorPicker";

import {
    profiles,
    DATASTORE_PROFILES_KEY,
    EffectType,
    FontType
} from "./index";
import { FormSwitch } from "@components/FormSwitch";
import { Button } from "@components/Button";
import { findComponentByCodeLazy } from "@webpack";
import { Slider } from "@plugins/componentsDev/components";
import { Settings } from "@api/Settings";

const ManaButton = findComponentByCodeLazy('"data-mana-component":"button"') as React.ComponentType<{
    variant?: "expressive";
    size?: "md";
    text?: string;
    disabled?: boolean;
    onClick?: (e: React.MouseEvent) => void;
    className?: string;
}>;

const cl = classNameFactory("vc-customUser-");

export function SetUserModal({ id, modalProps }: { id: string; modalProps: ModalProps; }) {

    const profile = profiles[id] ?? {};

    const initialUseGlow = profile.useGlow ?? false;
    const initialUseGradient = profile.useGradient ?? false;
    const nicknameGradient: GradientStop[] =
        profile.nicknameGradient ?? [
            { pos: 0, color: parseInt(profile.color1 ?? "dfdefa", 16) },
            { pos: 1, color: parseInt(profile.color2 ?? "dfdefa", 16) }
        ];
    const initialColor1 = parseInt(profile.color1 ?? "dfdefa", 16);
    const initialColor2 = parseInt(profile.color2 ?? "dfdefa", 16);
    const initialColor3 = parseInt(profile.color3 ?? "dfdefa", 16);
    const initialName = profile.nickname ?? "";
    const initialUseColors = profile.useColors ?? false;
    const initialAnimated = profile.isAnimated ?? true;
    const initialEffect = profile.effectType ?? EffectType.Solid;
    const initialFont = profile.fontId ?? FontType.Vampyre;
    const initialAvatar = profile.avatarUrl ?? "";
    const initialUsername = profile.username ?? "";
    const initialTagText = profile.tagText ?? "";
    const initialTagColor = parseInt(profile.tagColor ?? "5865F2", 16);
    const initialTagTextColor = parseInt(profile.tagTextColor ?? "ffffff", 16);
    const initialBannerEnabled = profile.profileBannerColor != null;
    const initialPrimaryEnabled = profile.profilePrimaryColor != null;
    const initialAccentEnabled = profile.profileAccentColor != null;
    const initialBannerUrl = profile.bannerUrl ?? "";
    const initialRemoveBanner = profile.removeBanner ?? false;
    const initialRemoveEffect = profile.removeEffect ?? false;
    const initialGradientAngle = profile.gradientAngle ?? 90;
    const initialIsRadialGradient = profile.isRadialGradient ?? false;

    const [useGlow, setUseGlow] = useState(initialUseGlow);
    const [useGradient, setUseGradient] = useState(initialUseGradient);
    const [gradientStops, setGradientStops] = useState<GradientStop[]>(nicknameGradient);
    const [color1, setColor1] = useState(initialColor1);
    const [color2, setColor2] = useState(initialColor2);
    const [color3, setColor3] = useState(initialColor3);
    const [tagColor, setTagColor] = useState<number | null>(initialTagColor);
    const [tagTextColor, setTagTextColor] = useState<number | null>(initialTagTextColor);
    const [nickname, setNickname] = useState(initialName);
    const [useColors, setUseColors] = useState(initialUseColors);
    const [isAnimated, setIsAnimated] = useState(initialAnimated);
    const [effectType, setEffectType] = useState(initialEffect);
    const [fontId, setFontId] = useState(initialFont);
    const [avatarUrl, setAvatarUrl] = useState(initialAvatar);
    const [username, setUsername] = useState(initialUsername);
    const [tagText, setTagText] = useState(initialTagText);
    const [bannerUrl, setBannerUrl] = useState(initialBannerUrl);
    const [removeBanner, setRemoveBanner] = useState(initialRemoveBanner);
    const [removeEffect, setRemoveEffect] = useState(initialRemoveEffect);
    const [gradientAngle, setGradientAngle] = useState(initialGradientAngle);
    const [isRadialGradient, setIsRadialGradient] = useState(initialIsRadialGradient);

    const [isBannerColorEnabled, setIsBannerColorEnabled] = useState(initialBannerEnabled);
    const [profileBannerColor, setProfileBannerColor] =
        useState<number | undefined>(
            initialBannerEnabled
                ? parseInt(profile.profileBannerColor!, 16)
                : undefined
        );

    const [isPrimaryColorEnabled, setIsPrimaryColorEnabled] = useState(initialPrimaryEnabled);
    const [profilePrimaryColor, setProfilePrimaryColor] =
        useState<number | undefined>(
            initialPrimaryEnabled
                ? parseInt(profile.profilePrimaryColor!, 16)
                : undefined
        );

    const [isAccentColorEnabled, setIsAccentColorEnabled] = useState(initialAccentEnabled);
    const [profileAccentColor, setProfileAccentColor] =
        useState<number | undefined>(
            initialAccentEnabled
                ? parseInt(profile.profileAccentColor!, 16)
                : undefined
        );

    const [closed, setClosed] = useState(false);

    useEffect(() => {
        if (closed) return;
        const timer = setTimeout(() => {
            persist();
        }, 200);

        return () => clearTimeout(timer);
    }, [
        useGlow,
        useGradient,
        gradientStops,
        color1,
        color2,
        color3,
        tagColor,
        tagTextColor,
        nickname,
        useColors,
        isAnimated,
        effectType,
        fontId,
        avatarUrl,
        username,
        tagText,
        bannerUrl,
        removeBanner,
        removeEffect,
        gradientAngle,
        isRadialGradient,
        profileBannerColor,
        profilePrimaryColor,
        profileAccentColor
    ]);

    function handleKey(e: React.KeyboardEvent) {
        if (e.key === "Enter") saveAll();
    }

    async function saveAll() {
        setClosed(true);
        await persist();
        modalProps.onClose();
    }

    async function persist() {
        profiles[id] = {
            useGlow,
            useGradient,
            nicknameGradient: gradientStops,
            color1: color1.toString(16).padStart(6, "0"),
            color2: color2.toString(16).padStart(6, "0"),
            color3: color3.toString(16).padStart(6, "0"),
            nickname: nickname.trim() || undefined,
            useColors,
            isAnimated,
            effectType,
            fontId,
            avatarUrl: avatarUrl.trim() || undefined,
            username: username.trim() || undefined,
            tagText: tagText.trim() || undefined,
            tagColor: tagColor?.toString(16).padStart(6, "0"),
            tagTextColor: tagTextColor?.toString(16).padStart(6, "0"),
            profileBannerColor:
                profileBannerColor != null
                    ? profileBannerColor.toString(16).padStart(6, "0")
                    : undefined,
            profilePrimaryColor:
                profilePrimaryColor != null
                    ? profilePrimaryColor.toString(16).padStart(6, "0")
                    : undefined,
            profileAccentColor:
                profileAccentColor != null
                    ? profileAccentColor.toString(16).padStart(6, "0")
                    : undefined,
            bannerUrl: bannerUrl.trim() || undefined,
            removeBanner,
            removeEffect,
            gradientAngle,
            isRadialGradient
        };

        await set(DATASTORE_PROFILES_KEY, profiles);
        Settings.plugins.EditUsers.triggerNameRerender =
            !Settings.plugins.EditUsers.triggerNameRerender;
    }

    async function deleteAll() {
        delete profiles[id];
        await set(DATASTORE_PROFILES_KEY, profiles);
        modalProps.onClose();
    }

    const colorPresets = [
        "#a9c9ff", "#ffbbec", "#ffc3a0",
        "#ff6445", "#ffb845", "#f0ff45", "#45ffbb", "#45a5ff",
        "#9945ff", "#ff45dd", "#ffffff", "#000000",
    ];

    return (
        <ModalRoot {...modalProps}>
            <ModalHeader>
                <Heading tag="h1" style={{ flexGrow: 1, margin: 0 }}>
                    Edit Users
                </Heading>
                <ModalCloseButton onClick={modalProps.onClose} />
            </ModalHeader>
            <ModalContent className={cl("modal-content")} onKeyDown={handleKey}>
                <Heading tag="h3" style={{ marginBottom: 8, fontSize: "16px", fontWeight: "400", lineHeight: "1.25", color: "var(--text-subtle)" }}>
                    {"Apply customization for selected user such as custom nickname, globalname, colors, avatar picture, banner and other."}
                </Heading>
                <div style={{ paddingTop: "10px", flexGrow: 0 }}></div>
                <Heading tag="h3" style={{ marginBottom: 8, fontSize: "14px", fontWeight: 600 }}>
                    Display Name
                </Heading>
                <TextInput style={{ marginBottom: 8 }}
                    value={nickname}
                    onChange={setNickname}
                    placeholder="Enter display name"
                    autoFocus
                />
                <Heading tag="h3" style={{ marginBottom: 8, fontSize: "14px", fontWeight: 600 }}>
                    Username
                </Heading>
                <TextInput style={{ marginBottom: 8 }}
                    value={username}
                    onChange={setUsername}
                    placeholder="Enter username"
                />
                <Heading tag="h3" style={{ marginBottom: 8, fontSize: "14px", fontWeight: 600 }}>
                    Avatar Url
                </Heading>
                <TextInput
                    value={avatarUrl}
                    onChange={setAvatarUrl}
                    placeholder="https://..."
                />
                <Heading tag="h1" style={{ marginBottom: 8, marginTop: 16 }}>
                    Colorization
                </Heading>
                <FormSwitch
                    title="Use Colors"
                    value={useColors}
                    onChange={setUseColors}
                />
                <FormSwitch
                    title="Use Glow"
                    value={useGlow}
                    onChange={setUseGlow}
                />
                <FormSwitch
                    title="Enable animation"
                    value={isAnimated}
                    onChange={setIsAnimated}
                />
                <FormSwitch
                    title="Use radial gradient"
                    value={isRadialGradient}
                    onChange={setIsRadialGradient}
                />
                <Heading tag="h2" style={{ marginBottom: 8, fontSize: "14px", fontWeight: 600 }}>
                    Gradient Angle
                </Heading>
                <Slider
                    minValue={0}
                    maxValue={360}
                    initialValue={gradientAngle}
                    onValueChange={setGradientAngle}
                    stickToMarkers={false}
                    onValueRender={v => `${v.toFixed(2)}°`}
                    onMarkerRender={v => `${v}°`}
                    markers={[0, 45, 90, 135, 180, 225, 270, 315, 360]}
                ></Slider>
                <div style={{ marginBottom: 16, marginTop: 16 }}>
                    <FormSwitch
                        title="Use Gradient"
                        value={useGradient}
                        onChange={setUseGradient}
                        hideBorder
                    />
                </div>
                <Heading tag="h3" style={{ marginBottom: 8, fontSize: "16px", fontWeight: "400", lineHeight: "1.25", color: "var(--text-subtle)" }}>
                    {"Apply custom gradient with certain keys instead of default Discord 2 or 3 colors colorization."}
                </Heading>
                {useGradient && (
                    <GradientColorPicker
                        value={gradientStops}
                        suggestedColors={colorPresets}
                        onChange={setGradientStops}
                    />
                )}
                {!useGradient && (
                    <>
                        <Heading tag="h2" style={{ marginBottom: 8, fontSize: "16px", fontWeight: "400", lineHeight: "1.25", color: "var(--text-subtle)" }}>
                            {"Main Color"}
                        </Heading>
                        <ColorPicker
                            color={color1}
                            suggestedColors={colorPresets}
                            onChange={(value) => setColor1(value ?? 0)}
                            showEyeDropper={false}
                        />
                        <Heading tag="h2" style={{ marginBottom: 8, fontSize: "16px", fontWeight: "400", lineHeight: "1.25", color: "var(--text-subtle)" }}>
                            {"Gradient End Color"}
                        </Heading>
                        <ColorPicker
                            color={color2}
                            suggestedColors={colorPresets}
                            onChange={(value) => setColor2(value ?? 0)}
                            showEyeDropper={false}
                        />
                        <Heading tag="h2" style={{ marginBottom: 8, fontSize: "16px", fontWeight: "400", lineHeight: "1.25", color: "var(--text-subtle)" }}>
                            {"Triple Gradiend Middle Color"}
                        </Heading>
                        <ColorPicker
                            color={color3}
                            suggestedColors={colorPresets}
                            onChange={(value) => setColor3(value ?? 0)}
                            showEyeDropper={false}
                        />
                    </>
                )}

                <Heading tag="h1" style={{ marginBottom: 8, marginTop: 16 }}>
                    Nameplate effect and font
                </Heading>
                <Heading tag="h3" style={{ marginBottom: 8, fontSize: "16px", fontWeight: "400", lineHeight: "1.25", color: "var(--text-subtle)" }}>
                    {"Effect type"}
                </Heading>
                <Select
                    options={[
                        { label: "Solid", value: EffectType.Solid },
                        { label: "Gradient", value: EffectType.Gradient, default: true },
                        { label: "Neon", value: EffectType.Neon },
                        { label: "Toon", value: EffectType.Toon },
                        { label: "Pop", value: EffectType.Pop },
                        { label: "Triple Gradient", value: EffectType.TripleGradient },
                    ]}
                    closeOnSelect={true}
                    select={setEffectType}
                    isSelected={(v: EffectType) => v === effectType}
                    serialize={(v: EffectType) => v.toString()}
                />
                <Heading tag="h3" style={{ marginBottom: 8, marginTop: 8, fontSize: "16px", fontWeight: "400", lineHeight: "1.25", color: "var(--text-subtle)" }}>
                    {"Font style"}
                </Heading>
                <Select
                    options={[
                        { label: "gg sans", value: FontType.GgSans },
                        { label: "Tempo", value: FontType.Temp },
                        { label: "Sakura", value: FontType.Sakura },
                        { label: "Jellybean", value: FontType.Jellybean },
                        { label: "Modern", value: FontType.Modern },
                        { label: "Medieval", value: FontType.Medieval },
                        { label: "8Bit", value: FontType.Bit8 },
                        { label: "Vampyre", value: FontType.Vampyre, default: true }
                    ]}
                    closeOnSelect={true}
                    select={setFontId}
                    isSelected={(v: FontType) => v === fontId}
                    serialize={(v: FontType) => v.toString()}
                />

                <Heading tag="h1" style={{ marginBottom: 8, marginTop: 16 }}>
                    Tag
                </Heading>
                <Heading tag="h3" style={{ marginBottom: 8, fontSize: "14px", fontWeight: 600 }}>
                    Custom Tag Text
                </Heading>
                <TextInput
                    value={tagText}
                    onChange={setTagText}
                    placeholder="TEST"
                />
                <Heading tag="h3" style={{ marginBottom: 8, fontSize: "14px", fontWeight: 600 }}>
                    Custom Tag Color
                </Heading>
                <ColorPicker
                    color={tagColor}
                    suggestedColors={colorPresets}
                    onChange={setTagColor}
                    showEyeDropper={false}
                />
                <Heading tag="h3" style={{ marginBottom: 8, fontSize: "14px", fontWeight: 600 }}>
                    Custom Tag Text Color
                </Heading>
                <ColorPicker
                    color={tagTextColor}
                    suggestedColors={colorPresets}
                    onChange={setTagTextColor}
                    showEyeDropper={false}
                />

                <Heading tag="h1" style={{ marginBottom: 8, marginTop: 16 }}>
                    Profile Customization
                </Heading>
                <FormSwitch
                    title="Remove profile banner"
                    value={removeBanner}
                    onChange={setRemoveBanner}
                />
                <FormSwitch
                    title="Remove profile effect"
                    value={removeEffect}
                    onChange={setRemoveEffect}
                />
                <Heading tag="h3" style={{ marginBottom: 8, fontSize: "14px", fontWeight: 600 }}>
                    Profile Banner Url
                </Heading>
                <TextInput
                    value={bannerUrl}
                    onChange={setBannerUrl}
                    placeholder="https://..."
                />
                <FormSwitch
                    title="Enable Profile Banner Custom Color"
                    value={isBannerColorEnabled}
                    onChange={(v: boolean) => {
                        setIsBannerColorEnabled(v);

                        if (!v) {
                            setProfileBannerColor(undefined);
                        } else if (profileBannerColor == null) {
                            setProfileBannerColor(0xffffff);
                        }
                    }}
                    hideBorder
                />
                {isBannerColorEnabled && profileBannerColor != null && (
                    <ColorPicker
                        color={profileBannerColor}
                        suggestedColors={colorPresets}
                        onChange={(value) => setProfileBannerColor(value ?? undefined)}
                        showEyeDropper={false}
                    />
                )}

                <FormSwitch
                    title="Enable Profile Primary Custom Color"
                    value={isPrimaryColorEnabled}
                    onChange={(v: boolean) => {
                        setIsPrimaryColorEnabled(v);

                        if (!v) {
                            setProfilePrimaryColor(undefined);
                        } else if (profilePrimaryColor == null) {
                            setProfilePrimaryColor(0xffffff);
                        }
                    }}
                    hideBorder
                />
                {isPrimaryColorEnabled && profilePrimaryColor != null && (
                    <ColorPicker
                        color={profilePrimaryColor}
                        suggestedColors={colorPresets}
                        onChange={(value) => setProfilePrimaryColor(value ?? undefined)}
                        showEyeDropper={false}
                    />
                )}

                <FormSwitch
                    title="Enable Profile Accent Custom Color"
                    value={isAccentColorEnabled}
                    onChange={(v: boolean) => {
                        setIsAccentColorEnabled(v);

                        if (!v) {
                            setProfileAccentColor(undefined);
                        } else if (profileAccentColor == null) {
                            setProfileAccentColor(0xffffff);
                        }
                    }}
                    hideBorder
                />
                {isAccentColorEnabled && profileAccentColor != null && (
                    <ColorPicker
                        color={profileAccentColor}
                        suggestedColors={colorPresets}
                        onChange={(value) => setProfileAccentColor(value ?? undefined)}
                        showEyeDropper={false}
                    />
                )}

            </ModalContent>

            <ModalFooter className={cl("modal-footer")}>
                <ManaButton
                    size="md"
                    variant="expressive"
                    onClick={saveAll}
                    className={cl("random")}
                    text="Save profile"
                />
                <Button style={{ marginRight: 16 }}
                    onClick={deleteAll}
                    variant="dangerPrimary"
                >Clear</Button>
            </ModalFooter>
        </ModalRoot>
    );
}