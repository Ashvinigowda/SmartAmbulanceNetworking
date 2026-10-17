import re
import csv
from pathlib import Path
from statistics import mean, stdev

folder = Path("experiment_results/load_trials")
records = []

flow_pattern = re.compile(
    r"Flow (\d+) \| Source ([\d.]+)\s*"
    r"TX packets: (\d+) \| RX packets: (\d+) \| "
    r"FlowMonitor lost: (\d+)\s*"
    r"Throughput: ([\d.]+) kbps \| "
    r"Delay: ([\d.]+) ms \| Jitter: ([\d.]+) ms"
)

for sources in (2, 5, 10):
    for trial in range(1, 6):
        for priority in (0, 1):
            path = folder / (
                f"sources_{sources}_trial_{trial}_priority_{priority}.txt"
            )
            if not path.exists():
                continue

            text = path.read_text(errors="replace")
            flows = list(flow_pattern.finditer(text))

            # Source 10.1.1.1 is the ambulance.
            normal = [f for f in flows if f.group(2) != "10.1.1.1"]
            if len(normal) != sources - 1:
                print(f"Warning: unexpected flow count in {path}")
                continue

            tx = sum(int(f.group(3)) for f in normal)
            rx = sum(int(f.group(4)) for f in normal)
            throughput = sum(float(f.group(6)) for f in normal)

            # RX-weighted mean flow delay, not a network-wide packet trace.
            delay_weight = sum(
                int(f.group(4)) * float(f.group(7)) for f in normal
            )
            mean_delay = delay_weight / rx if rx else 0.0

            records.append({
                "sources": sources,
                "trial": trial,
                "priority": "ON" if priority else "OFF",
                "normal_tx": tx,
                "normal_rx": rx,
                "normal_throughput_kbps": throughput,
                "normal_rx_weighted_delay_ms": mean_delay,
                "normal_delivery_percent": 100 * rx / tx if tx else 0.0,
            })

out = Path("experiment_results/fairness_summary.csv")
with out.open("w", newline="") as file:
    writer = csv.DictWriter(file, fieldnames=records[0].keys())
    writer.writeheader()
    writer.writerows(records)

print(f"Parsed normal traffic for {len(records)}/30 runs.")
print(f"Saved: {out}")

metrics = [
    "normal_rx",
    "normal_throughput_kbps",
    "normal_rx_weighted_delay_ms",
    "normal_delivery_percent",
]

for sources in (2, 5, 10):
    print(f"\n=== {sources} SOURCES: NORMAL TRAFFIC ===")
    for priority in ("OFF", "ON"):
        subset = [
            r for r in records
            if r["sources"] == sources and r["priority"] == priority
        ]
        print(f"\nPriority {priority}: {len(subset)} trials")
        for metric in metrics:
            values = [r[metric] for r in subset]
            if values:
                sd = stdev(values) if len(values) > 1 else 0.0
                print(
                    f"{metric}: mean={mean(values):.3f}, "
                    f"sample SD={sd:.3f}"
                )
