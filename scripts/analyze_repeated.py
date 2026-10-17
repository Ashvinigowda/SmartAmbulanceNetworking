import re
import csv
from pathlib import Path
from statistics import mean, stdev

folder = Path("experiment_results/repeated_logs")
records = []

for run in range(1, 6):
    for priority in (0, 1):
        path = folder / f"trial_{run}_priority_{priority}.txt"

        if not path.exists():
            print(f"MISSING: {path}")
            continue

        text = path.read_text(errors="replace")

        if "=== AGGREGATE RESULTS ===" not in text:
            print(f"INCOMPLETE: {path}")
            continue

        flow = re.search(
            r"Flow 1 \| Source 10\.1\.1\.1\s*"
            r"TX packets: (\d+) \| RX packets: (\d+) \| "
            r"FlowMonitor lost: (\d+)\s*"
            r"Throughput: ([\d.]+) kbps \| "
            r"Delay: ([\d.]+) ms \| Jitter: ([\d.]+) ms",
            text
        )

        aggregate = re.search(
            r"Total TX: (\d+)\s*"
            r"Total RX: (\d+)\s*"
            r"FlowMonitor lost count: (\d+)\s*"
            r"Delivery ratio: ([\d.]+)%",
            text
        )

        if not flow or not aggregate:
            print(f"COULD NOT PARSE: {path}")
            continue

        records.append({
            "trial": run,
            "priority": "ON" if priority else "OFF",
            "ambulance_tx": int(flow[1]),
            "ambulance_rx": int(flow[2]),
            "ambulance_flowmonitor_lost": int(flow[3]),
            "throughput_kbps": float(flow[4]),
            "delay_ms": float(flow[5]),
            "jitter_ms": float(flow[6]),
            "total_tx": int(aggregate[1]),
            "total_rx": int(aggregate[2]),
            "aggregate_flowmonitor_lost": int(aggregate[3]),
            "delivery_ratio_percent": float(aggregate[4]),
        })

if not records:
    raise SystemExit("No valid results parsed. Check the saved log files.")

out = Path("experiment_results/repeated_summary.csv")
out.parent.mkdir(parents=True, exist_ok=True)

with out.open("w", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=records[0].keys())
    writer.writeheader()
    writer.writerows(records)

print(f"\nValid trials parsed: {len(records)}/10")
print(f"CSV saved to: {out}")

metrics = [
    "delay_ms",
    "throughput_kbps",
    "ambulance_rx",
    "jitter_ms",
    "delivery_ratio_percent",
]

for priority in ("OFF", "ON"):
    subset = [r for r in records if r["priority"] == priority]
    print(f"\n=== PRIORITY {priority}: {len(subset)} trials ===")

    for metric in metrics:
        values = [r[metric] for r in subset]
        if values:
            sd = stdev(values) if len(values) > 1 else 0.0
            print(
                f"{metric}: mean={mean(values):.3f}, "
                f"sample SD={sd:.3f}"
            )

off = [r for r in records if r["priority"] == "OFF"]
on = [r for r in records if r["priority"] == "ON"]

if len(off) == 5 and len(on) == 5:
    off_delay = mean(r["delay_ms"] for r in off)
    on_delay = mean(r["delay_ms"] for r in on)
    off_rx = mean(r["ambulance_rx"] for r in off)
    on_rx = mean(r["ambulance_rx"] for r in on)

    if off_delay:
        print(
            f"\nMean ambulance delay reduction: "
            f"{(off_delay - on_delay) / off_delay * 100:.2f}%"
        )
    print(f"Mean ambulance packets received: OFF={off_rx:.1f}, ON={on_rx:.1f}")
else:
    print("\nWarning: not all 10 trials were parsed; compare cautiously.")
