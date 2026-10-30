import re
import csv
from pathlib import Path
from statistics import mean, stdev

folder = Path("experiment_results/fairness_modes")
output = Path("experiment_results/fairness_modes_summary.csv")

flow_pattern = re.compile(
    r"Flow (\d+) \| Source ([\d.]+)\s*"
    r"TX packets: (\d+) \| RX packets: (\d+) \| "
    r"FlowMonitor lost: (\d+)\s*"
    r"Throughput: ([\d.]+) kbps \| "
    r"Delay: ([\d.]+) ms \| Jitter: ([\d.]+) ms"
)

aggregate_pattern = re.compile(
    r"Total TX: (\d+)\s*"
    r"Total RX: (\d+)\s*"
    r"FlowMonitor lost count: (\d+)\s*"
    r"Delivery ratio: ([\d.]+)%"
)

records = []

for mode, name in ((0, "BE"), (1, "VI"), (2, "VO")):
    for trial in range(1, 6):
        path = folder / f"mode_{mode}_trial_{trial}.txt"

        if not path.exists():
            print(f"MISSING: {path}")
            continue

        text = path.read_text(errors="replace")
        flows = list(flow_pattern.finditer(text))
        aggregate = aggregate_pattern.search(text)

        ambulance = next(
            (f for f in flows if f.group(2) == "10.1.1.1"),
            None
        )
        normal = [f for f in flows if f.group(2) != "10.1.1.1"]

        if not ambulance or not aggregate or len(normal) != 9:
            print(f"PARSE ERROR: {path}")
            continue

        normal_tx = sum(int(f.group(3)) for f in normal)
        normal_rx = sum(int(f.group(4)) for f in normal)
        normal_delay_sum = sum(
            int(f.group(4)) * float(f.group(7)) for f in normal
        )

        records.append({
            "mode": name,
            "trial": trial,
            "ambulance_rx": int(ambulance.group(4)),
            "ambulance_throughput_kbps": float(ambulance.group(6)),
            "ambulance_delay_ms": float(ambulance.group(7)),
            "ambulance_jitter_ms": float(ambulance.group(8)),
            "normal_tx": normal_tx,
            "normal_rx": normal_rx,
            "normal_throughput_kbps": sum(
                float(f.group(6)) for f in normal
            ),
            "normal_rx_weighted_delay_ms": (
                normal_delay_sum / normal_rx if normal_rx else 0.0
            ),
            "normal_delivery_percent": (
                100 * normal_rx / normal_tx if normal_tx else 0.0
            ),
            "total_tx": int(aggregate.group(1)),
            "total_rx": int(aggregate.group(2)),
            "aggregate_flowmonitor_lost": int(aggregate.group(3)),
            "delivery_ratio_percent": float(aggregate.group(4)),
        })

if not records:
    raise SystemExit("No valid results found.")

with output.open("w", newline="") as file:
    writer = csv.DictWriter(file, fieldnames=records[0].keys())
    writer.writeheader()
    writer.writerows(records)

print(f"\nParsed {len(records)}/15 runs.")
print(f"Detailed CSV: {output}")

metrics = [
    "ambulance_delay_ms",
    "ambulance_throughput_kbps",
    "ambulance_rx",
    "normal_rx",
    "normal_throughput_kbps",
    "normal_rx_weighted_delay_ms",
    "normal_delivery_percent",
    "delivery_ratio_percent",
]

for mode in ("BE", "VI", "VO"):
    subset = [r for r in records if r["mode"] == mode]
    print(f"\n=== MODE {mode}: {len(subset)} trials ===")

    for metric in metrics:
        values = [r[metric] for r in subset]
        if values:
            sd = stdev(values) if len(values) > 1 else 0.0
            print(
                f"{metric}: mean={mean(values):.3f}, "
                f"sample SD={sd:.3f}"
            )

print("\n=== MEAN AMBULANCE DELAY REDUCTION VS BE ===")
be = [r["ambulance_delay_ms"] for r in records if r["mode"] == "BE"]

if len(be) == 5:
    baseline = mean(be)
    for mode in ("VI", "VO"):
        values = [
            r["ambulance_delay_ms"]
            for r in records if r["mode"] == mode
        ]
        if len(values) == 5 and baseline:
            reduction = (baseline - mean(values)) / baseline * 100
            print(f"{mode}: {reduction:.2f}%")
else:
    print("Cannot compare: BE baseline has fewer than five valid trials.")
