import pandas as pd
import matplotlib.pyplot as plt
from pathlib import Path

results = Path("experiment_results")
out = results / "graphs"
out.mkdir(parents=True, exist_ok=True)

df = pd.read_csv(results / "load_summary.csv")
sources_order = [2, 5, 10]
priorities = ["OFF", "ON"]

metrics = [
    ("ambulance_delay_ms", "Ambulance delay (ms)",
     "Load vs Ambulance Delay", "load_ambulance_delay.png"),
    ("ambulance_throughput_kbps", "Ambulance throughput (kbps)",
     "Load vs Ambulance Throughput", "load_ambulance_throughput.png"),
    ("ambulance_rx", "Ambulance packets received",
     "Load vs Ambulance Packet Reception", "load_ambulance_received.png"),
    ("ambulance_jitter_ms", "Ambulance jitter (ms)",
     "Load vs Ambulance Jitter", "load_ambulance_jitter.png"),
    ("delivery_ratio_percent", "Aggregate delivery ratio (%)",
     "Load vs Aggregate Packet Delivery Ratio", "load_delivery_ratio.png"),
]

for column, ylabel, title, filename in metrics:
    fig, ax = plt.subplots(figsize=(8, 5))

    for priority in priorities:
        subset = df[df["priority"] == priority]
        grouped = subset.groupby("sources")[column].agg(["mean", "std"])
        grouped = grouped.reindex(sources_order)

        ax.errorbar(
            grouped.index,
            grouped["mean"],
            yerr=grouped["std"],
            marker="o",
            capsize=5,
            linewidth=2,
            label=f"Priority {priority}"
        )

    ax.set_xticks(sources_order)
    ax.set_xlabel("Number of traffic sources")
    ax.set_ylabel(ylabel)
    ax.set_title(title)
    ax.grid(True, linestyle="--", alpha=0.4)
    ax.legend()
    fig.tight_layout()
    fig.savefig(out / filename, dpi=200)
    plt.close(fig)
    print(f"Created: {out / filename}")

print("\nAll five load-experiment graphs generated.")
