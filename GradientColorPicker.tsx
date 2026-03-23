import { useState, useRef, useEffect } from "@webpack/common";
import { ColorPicker } from "@webpack/common/components";

export type GradientStop = {
    pos: number;
    color: number;
};

type Props = {
    value: GradientStop[];
    onChange?(stops: GradientStop[]): void;
    suggestedColors?: string[];
};

function hex(c: number) {
    return "#" + c.toString(16).padStart(6, "0");
}

function gradientCSS(stops: GradientStop[]) {
    return `linear-gradient(90deg, ${[...stops]
        .sort((a, b) => a.pos - b.pos)
        .map(s => `${hex(s.color)} ${s.pos * 100}%`)
        .join(",")
        })`;
}

export default function GradientColorPicker(props: Props) {

    const [open, setOpen] = useState(false);
    const [stops, setStops] = useState<GradientStop[]>(props.value);
    const [selected, setSelected] = useState(0);

    const ref = useRef<HTMLDivElement>(null);
    const barRef = useRef<HTMLDivElement>(null);

    const css = gradientCSS(stops);

    function update(next: GradientStop[]) {
        setStops(next);
        props.onChange?.(next);
    }

    function updateColor(color: number) {
        const next = [...stops];
        next[selected].color = color;
        update(next);
    }

    function addStop(e: React.MouseEvent<HTMLDivElement>) {

        const rect = barRef.current!.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;

        const next = [...stops, { pos, color: 0xffffff }];
        next.sort((a, b) => a.pos - b.pos);

        update(next);
        setSelected(next.findIndex(s => s.pos === pos));
    }

    function removeStop(i: number) {
        if (stops.length <= 2) return;

        const next = stops.filter((_, index) => index !== i);
        update(next);

        if (selected >= next.length) setSelected(next.length - 1);
    }

    function startDrag(i: number, e: React.MouseEvent) {

        e.stopPropagation();

        function move(ev: MouseEvent) {

            const rect = barRef.current!.getBoundingClientRect();
            let pos = (ev.clientX - rect.left) / rect.width;

            pos = Math.max(0, Math.min(1, pos));

            const next = [...stops];
            next[i].pos = pos;

            update(next);
        }

        function up() {
            window.removeEventListener("mousemove", move);
            window.removeEventListener("mouseup", up);
        }

        window.addEventListener("mousemove", move);
        window.addEventListener("mouseup", up);
    }

    useEffect(() => {

        function close(e: MouseEvent) {
            if (!ref.current?.contains(e.target as Node)) {
                setOpen(false);
            }
        }

        return () => window.removeEventListener("mousedown", close);

    }, []);

    return (
        <div style={{ position: "relative", display: "inline-block" }} ref={ref}>

            {/* swatch */}

            <button
                onClick={() => setOpen(!open)}
                style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    border: "none",
                    cursor: "pointer",
                    background: css
                }}
            />

            {/* popup */}

            {open && (
                <>
                    {/* overlay */}
                    <div
                        onClick={() => setOpen(false)}
                        style={{
                            position: "fixed",
                            inset: 0,
                            background: "rgba(0,0,0,0.6)",
                            zIndex: 999
                        }}
                    />

                    {/* popup */}
                    <div
                        onMouseDown={(e) => e.stopPropagation()}
                        style={{
                            position: "absolute",
                            top: 56,
                            zIndex: 1000,
                            width: 320,
                            padding: 16,
                            borderRadius: 12,
                            background: "var(--background-floating)",
                            border: "1px solid var(--background-modifier-accent)",
                            boxShadow: "var(--shadow-high)"
                        }}
                    >

                        <ColorPicker
                            color={stops[selected].color}
                            suggestedColors={props.suggestedColors}
                            showEyeDropper={false}
                            onChange={v => updateColor(v ?? 0)}
                        />

                        {/* gradient bar */}

                        <div
                            ref={barRef}
                            onClick={addStop}
                            style={{
                                marginTop: 12,
                                height: 20,
                                borderRadius: 6,
                                background: css,
                                position: "relative",
                                cursor: "pointer"
                            }}
                        >

                            {stops.map((s, i) => (
                                <div
                                    key={i}
                                    onMouseDown={e => startDrag(i, e)}
                                    onContextMenu={(e) => {
                                        e.preventDefault();
                                        removeStop(i);
                                    }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelected(i);
                                    }}
                                    style={{
                                        position: "absolute",
                                        left: `${s.pos * 100}%`,
                                        top: -4,
                                        transform: "translateX(-50%)",
                                        width: 10,
                                        height: 28,
                                        borderRadius: 3,
                                        background: hex(s.color),
                                        border: i === selected
                                            ? "2px solid white"
                                            : "1px solid black",
                                        cursor: "pointer"
                                    }}
                                />
                            ))}

                        </div>

                    </div>
                </>
            )}
        </div>
    );
}