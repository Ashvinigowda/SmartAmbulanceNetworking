import pandas as pd
import matplotlib.pyplot as plt
from pathlib import Path

results = Path("experiment_results")
out = results / "graphs"
out.mkdir(parents=True, exist_ok=True)

df = pd.read_csv(results / "fairness_modes_summary.csv")
modes = ["BE", "VI", "VO"]
labels = {
    "BE": "Best Effort (BE)",
    "VI": "Video (VI)",
    "VO": "Voice (VO)"
}

def plot_metric(column, ylabel, title, filename):
    grouped = df.groupby("mode")[column].agg(["mean", "std"])
    grouped = grouped.reindex(modes)

    fig, ax = plt.subplots(figsize=(8, 5))
    ax.bar(
        modes,
        grouped["mean"],
        yerr=grouped["std"],
        capsize=6
    )
    ax.set_xlabel("Ambulance Access Category")
    ax.set_ylabel(ylabel)
    ax.set_title(title)
    ax.grid(axis="y", linestyle="--", alpha=0.4)
    fig.tight_layout()
    fig.savefig(out / filename, dpi=200)
    plt.close(fig)
    print(f"Created: {out / filename}")

plot_metric(
    "ambulance_delay_ms",
    "Mean delay (ms)",
    "Ambulance Delay: BE vs VI vs VO",
    "priority_modes_ambulance_delay.png"
)

plot_metric(
    "ambulance_throughput_kbps",
    "Throughput (kbps)",
    "Ambulance Throughput: BE vs VI vs VO",
    "priority_modes_ambulance_throughput.png"
)

plot_metric(
    "ambulance_rx",
    "Packets received",
    "Ambulance Packet Reception: BE vs VI vs VO",
    "priority_modes_ambulance_received.png"
)

plot_metric(
    "normal_throughput_kbps",
    "Normal traffic throughput (kbps)",
    "Normal Traffic Throughput: BE vs VI vs VO",
    "priority_modes_normal_throughput.png"
)

plot_metric(
    "normal_rx_weighted_delay_ms",
    "RX-weighted delay (ms)",
    "Normal Traffic Delay: BE vs VI vs VO",
    "priority_modes_normal_delay.png"
)

print("\nAll priority-mode graphs generated.")
