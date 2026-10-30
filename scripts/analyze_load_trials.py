import re
import csv
from pathlib import Path
from statistics import mean, stdev

folder = Path("experiment_results/load_trials")
output = Path("experiment_results/load_summary.csv")

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

for sources in (2, 5, 10):
    for trial in range(1, 6):
        for priority in (0, 1):
            path = folder / (
                f"sources_{sources}_trial_{trial}_priority_{priority}.txt"
            )

            if not path.exists():
                print(f"MISSING: {path}")
                continue

            text = path.read_text(errors="replace")
            flows = list(flow_pattern.finditer(text))
            aggregate = aggregate_pattern.search(text)

            if not flows or not aggregate:
                print(f"PARSE ERROR: {path}")
                continue

            ambulance = next(
                (f for f in flows if f.group(2) == "10.1.1.1"),
                None
            )

            if ambulance is None:
                print(f"AMBULANCE FLOW MISSING: {path}")
                continue

            records.append({
                "sources": sources,
                "trial": trial,
                "priority": "ON" if priority else "OFF",
                "ambulance_tx": int(ambulance.group(3)),
                "ambulance_rx": int(ambulance.group(4)),
                "ambulance_flowmonitor_lost": int(ambulance.group(5)),
                "ambulance_throughput_kbps": float(ambulance.group(6)),
                "ambulance_delay_ms": float(ambulance.group(7)),
                "ambulance_jitter_ms": float(ambulance.group(8)),
                "total_tx": int(aggregate.group(1)),
                "total_rx": int(aggregate.group(2)),
                "aggregate_flowmonitor_lost": int(aggregate.group(3)),
                "delivery_ratio_percent": float(aggregate.group(4)),
            })

output.parent.mkdir(parents=True, exist_ok=True)

if records:
    with output.open("w", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=records[0].keys())
        writer.writeheader()
        writer.writerows(records)

print(f"\nSuccessfully parsed {len(records)}/30 runs.")
print(f"Detailed results saved to: {output}")

metrics = [
    "ambulance_delay_ms",
    "ambulance_throughput_kbps",
    "ambulance_rx",
    "ambulance_jitter_ms",
    "delivery_ratio_percent",
]

for sources in (2, 5, 10):
    print(f"\n{'=' * 18} SOURCES: {sources} {'=' * 18}")

    for priority in ("OFF", "ON"):
        subset = [
            r for r in records
            if r["sources"] == sources and r["priority"] == priority
        ]

        print(f"\nPriority {priority}: {len(subset)} trials")

        for metric in metrics:
            values = [r[metric] for r in subset]
            if not values:
                print(f"  {metric}: NO DATA")
                continue

            sd = stdev(values) if len(values) > 1 else 0.0
            print(
                f"  {metric}: mean={mean(values):.3f}, "
                f"sample SD={sd:.3f}"
            )

    off = [
        r for r in records
        if r["sources"] == sources and r["priority"] == "OFF"
    ]
    on = [
        r for r in records
        if r["sources"] == sources and r["priority"] == "ON"
    ]

    if len(off) == 5 and len(on) == 5:
        off_delay = mean(r["ambulance_delay_ms"] for r in off)
        on_delay = mean(r["ambulance_delay_ms"] for r in on)
        off_rx = mean(r["ambulance_rx"] for r in off)
        on_rx = mean(r["ambulance_rx"] for r in on)

        reduction = (
            (off_delay - on_delay) / off_delay * 100
            if off_delay else 0
        )

        print(f"\n  Mean delay reduction: {reduction:.2f}%")
        print(f"  Mean ambulance RX: OFF={off_rx:.1f}, ON={on_rx:.1f}")
    else:
        print("\n  WARNING: Incomplete trial group; comparison is provisional.")
