import { set } from "@api/DataStore";
import { HeadingPrimary, HeadingSecondary, HeadingTertiary } from "@components/Heading";
import { classNameFactory } from "@utils/css";
import { Margins } from "@utils/margins";
import {
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalProps,
    ModalRoot
} from "@utils/modal";
import {
    Switch,
    ColorPicker,
    TextInput,
    Select,
    useState
} from "@webpack/common";

import {
    profiles,
    DATASTORE_PROFILES_KEY,
    EffectType,
    FontType
} from "./index";
import { FluxDispatcher } from "@webpack/common";
import { FormSwitch } from "@components/FormSwitch";
import { Button } from "@components/Button";
import { findComponentByCodeLazy } from "@webpack";

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

    const initialColor1 = parseInt(profile.color1 ?? "dfdefa", 16);
    const initialColor2 = parseInt(profile.color2 ?? "dfdefa", 16);
    const initialName = profile.nickname ?? "";
    const initialAnimated = profile.isAnimated ?? true;
    const initialEffect = profile.effectType ?? EffectType.Solid;
    const initialFont = profile.fontId ?? FontType.Vampyre;
    const initialAvatar = profile.avatarUrl ?? "";
    const initialGlobalName = profile.globalName ?? "";
    const initialTagText = profile.tagText ?? "";
    const initialTagBadgeUrl = profile.tagBadgeUrl ?? "";
    const initialTagColor = parseInt(profile.tagColor ?? "5865F2", 16);
    const initialTagTextColor = parseInt(profile.tagTextColor ?? "ffffff", 16);
    const initialBannerEnabled = profile.profileBannerColor != null;
    const initialPrimaryEnabled = profile.profilePrimaryColor != null;
    const initialAccentEnabled = profile.profileAccentColor != null;
    const initialBannerUrl = profile.bannerUrl ?? "";
    const initialRemoveBanner = profile.removeBanner ?? false;
    const initialRemoveEffect = profile.removeEffect ?? false;


    const [color1, setColor1] = useState(initialColor1);
    const [color2, setColor2] = useState(initialColor2);
    const [tagColor, setTagColor] = useState<number | null>(initialTagColor);
    const [tagTextColor, setTagTextColor] = useState<number | null>(initialTagTextColor);
    const [nickname, setNickname] = useState(initialName);
    const [isAnimated, setIsAnimated] = useState(initialAnimated);
    const [effectType, setEffectType] = useState(initialEffect);
    const [fontId, setFontId] = useState(initialFont);
    const [avatarUrl, setAvatarUrl] = useState(initialAvatar);
    const [globalName, setGlobalName] = useState(initialGlobalName);
    const [tagText, setTagText] = useState(initialTagText);
    const [tagBadgeUrl, setTagBadgeUrl] = useState(initialTagBadgeUrl);
    const [bannerUrl, setBannerUrl] = useState(initialBannerUrl);
    const [removeBanner, setRemoveBanner] = useState(initialRemoveBanner);
    const [removeEffect, setRemoveEffect] = useState(initialRemoveEffect);

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

    function handleKey(e: React.KeyboardEvent) {
        if (e.key === "Enter") saveAll();
    }

    async function saveAll() {
        profiles[id] = {
            color1: color1.toString(16).padStart(6, "0"),
            color2: color2.toString(16).padStart(6, "0"),
            nickname: nickname.trim() || undefined,
            isAnimated,
            effectType,
            fontId,
            avatarUrl: avatarUrl.trim() || undefined,
            globalName: globalName.trim() || undefined,
            tagText: tagText.trim() || undefined,
            tagBadgeUrl: tagBadgeUrl.trim() || undefined,
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
        };

        await set(DATASTORE_PROFILES_KEY, profiles);
        modalProps.onClose();
    }

    async function deleteAll() {
        delete profiles[id];
        await set(DATASTORE_PROFILES_KEY, profiles);
        modalProps.onClose();
    }

    const colorPresets = [
        "#ff6445", "#ffb845", "#f0ff45", "#45ffbb", "#45a5ff",
        "#9945ff", "#ff45dd", "#ffffff", "#000000",
    ];

    return (
        <ModalRoot {...modalProps}>
            <ModalHeader className={cl("modal-header")}>
                <HeadingPrimary>Custom User</HeadingPrimary>
                <ModalCloseButton onClick={modalProps.onClose} />
            </ModalHeader>

            <ModalContent className={cl("modal-content")} onKeyDown={handleKey}>
                {/* ===== nickname ===== */}
                <section className={Margins.bottom16}>
                    <HeadingSecondary>Display Name</HeadingSecondary>
                    <TextInput
                        value={nickname}
                        onChange={setNickname}
                        placeholder="Enter display name"
                        autoFocus
                    />
                </section>

                {/* ===== globalName ===== */}
                <section className={Margins.bottom16}>
                    <HeadingSecondary>Global Name</HeadingSecondary>
                    <TextInput
                        value={globalName}
                        onChange={setGlobalName}
                        placeholder="Enter global name"
                    />
                </section>

                {/* ===== tagText ===== */}
                <section className={Margins.bottom16}>
                    <HeadingSecondary>Custom Tag Text</HeadingSecondary>
                    <TextInput
                        value={tagText}
                        onChange={setTagText}
                        placeholder="TEST"
                    />
                </section>

                {/* ===== tag color ===== */}
                <section className={Margins.bottom16}>
                    <HeadingSecondary>Tag Color</HeadingSecondary>
                    <ColorPicker
                        color={tagColor}
                        suggestedColors={colorPresets}
                        onChange={setTagColor}
                        showEyeDropper={false}
                    />
                </section>

                {/* ===== tag text color ===== */}
                <section className={Margins.bottom16}>
                    <HeadingSecondary>Tag Text Color</HeadingSecondary>
                    <ColorPicker
                        color={tagTextColor}
                        suggestedColors={colorPresets}
                        onChange={setTagTextColor}
                        showEyeDropper={false}
                    />
                </section>

                {/* ===== tagBadgeUrl ===== */}
                <section className={Margins.bottom16}>
                    <HeadingSecondary>Custom Tag Image</HeadingSecondary>
                    <TextInput
                        value={tagBadgeUrl}
                        onChange={setTagBadgeUrl}
                        placeholder="https://..."
                    />
                </section>

                <section className={Margins.bottom16}>
                    <HeadingSecondary>Avatar URL</HeadingSecondary>
                    <TextInput
                        value={avatarUrl}
                        onChange={setAvatarUrl}
                        placeholder="https://..."
                    />
                </section>

                {/* ===== color 1 ===== */}
                <section className={Margins.bottom16}>
                    <HeadingSecondary>Gradient Color 1</HeadingSecondary>
                    <ColorPicker
                        color={color1}
                        suggestedColors={colorPresets}
                        onChange={(value) => setColor1(value ?? 0)}
                        showEyeDropper={false}
                    />
                </section>

                {/* ===== color 2 ===== */}
                <section className={Margins.bottom16}>
                    <HeadingSecondary>Gradient Color 2</HeadingSecondary>
                    <ColorPicker
                        color={color2}
                        suggestedColors={colorPresets}
                        onChange={(value) => setColor2(value ?? 0)}
                        showEyeDropper={false}
                    />
                </section>

                {/* ===== animated ===== */}
                <section className={Margins.bottom16}>
                    <HeadingSecondary>Animated</HeadingSecondary>
                    <FormSwitch
                        title="Enable animation"
                        value={isAnimated}
                        onChange={setIsAnimated}
                    />
                </section>

                {/* ===== effect ===== */}
                <section className={Margins.bottom16}>
                    <HeadingSecondary>Nameplate font and effect</HeadingSecondary>
                    <Select
                        options={[
                            { label: "Solid", value: EffectType.Solid },
                            { label: "Gradient", value: EffectType.Gradient, default: true },
                            { label: "Neon", value: EffectType.Neon },
                            { label: "Toon", value: EffectType.Toon },
                            { label: "Pop", value: EffectType.Pop }
                        ]}
                        closeOnSelect={true}
                        select={(v: EffectType) => setEffectType(v)}
                        isSelected={(v: EffectType) => v === effectType}
                        serialize={(v: EffectType) => v.toString()}
                    />
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
                        select={(v: FontType) => setFontId(v)}
                        isSelected={(v: FontType) => v === fontId}
                        serialize={(v: FontType) => v.toString()}
                    />
                </section>

                <section className={Margins.bottom16}>
                    <HeadingSecondary>Profile Customization</HeadingSecondary>
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
                    <TextInput
                        title="Custom profile banner URL"
                        value={bannerUrl}
                        onChange={setBannerUrl}
                        placeholder="https://..."
                    />
                    <HeadingSecondary></HeadingSecondary>
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
                        <section className={Margins.bottom16}>
                            <ColorPicker
                                color={profileBannerColor}
                                suggestedColors={colorPresets}
                                onChange={(value) => setProfileBannerColor(value ?? undefined)}
                                showEyeDropper={false}
                            />
                        </section>
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
                        <section className={Margins.bottom16}>
                            <ColorPicker
                                color={profilePrimaryColor}
                                suggestedColors={colorPresets}
                                onChange={(value) => setProfilePrimaryColor(value ?? undefined)}
                                showEyeDropper={false}
                            />
                        </section>
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
                        <section className={Margins.bottom16}>
                            <ColorPicker
                                color={profileAccentColor}
                                suggestedColors={colorPresets}
                                onChange={(value) => setProfileAccentColor(value ?? undefined)}
                                showEyeDropper={false}
                            />
                        </section>
                    )}
                </section>

            </ModalContent>

            <ModalFooter className={cl("modal-footer")}>
                <ManaButton
                    size="md"
                    variant="expressive"
                    onClick={saveAll}
                    className={cl("random")}
                    text="Save profile"
                />
                <Button
                    onClick={deleteAll}
                    variant="dangerPrimary"
                >Clear</Button>
            </ModalFooter>
        </ModalRoot>
    );
}