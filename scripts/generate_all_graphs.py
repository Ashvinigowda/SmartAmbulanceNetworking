#!/usr/bin/env python3
"""
Graph Generation Script for Smart Ambulance Networking NS-3.45 Simulation.
Reads all_experiments.csv and produces publication-quality comparative charts.
"""

import sys
from pathlib import Path
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

# Directories
PROJECT_DIR = Path("/home/ashwini/ambulance-ns3-project")
CSV_PATH = PROJECT_DIR / "results" / "experiment_results" / "csv" / "all_experiments.csv"
GRAPHS_DIR = PROJECT_DIR / "results" / "experiment_results" / "graphs"
GRAPHS_DIR.mkdir(parents=True, exist_ok=True)

# Plot styling configuration
plt.style.use("seaborn-v0_8-whitegrid" if "seaborn-v0_8-whitegrid" in plt.style.available else "default")
plt.rcParams.update({
    "font.size": 11,
    "axes.labelsize": 12,
    "axes.titlesize": 13,
    "xtick.labelsize": 10,
    "ytick.labelsize": 10,
    "legend.fontsize": 10,
    "figure.titlesize": 14,
    "grid.alpha": 0.35,
    "grid.linestyle": "--"
})


def load_data():
    if not CSV_PATH.exists():
        print(f"Error: {CSV_PATH} not found. Run experiments first.")
        sys.exit(1)
    df = pd.read_csv(CSV_PATH)
    return df


def plot_delay_vs_sources(df):
    """Graph 1: Ambulance Delay vs Number of Ordinary Sources"""
    sub = df[df["exp_id"].str.startswith("EXP2_SOURCES_")].sort_values("ordinary_sources")
    if sub.empty:
        return

    fig, ax = plt.subplots(figsize=(8, 5))
    ax.plot(sub["ordinary_sources"], sub["amb_delay_ms"], marker="o", linewidth=2.5, color="#D32F2F", label="Ambulance Delay")
    ax.set_title("Ambulance Latency Under Increasing Network Congestion")
    ax.set_xlabel("Number of Ordinary Traffic Sources")
    ax.set_ylabel("Average Delay (ms)")
    ax.set_xticks(sub["ordinary_sources"])
    for x, y in zip(sub["ordinary_sources"], sub["amb_delay_ms"]):
        ax.annotate(f"{y:.2f} ms", (x, y), textcoords="offset points", xytext=(0, 8), ha="center", fontweight="bold")
    ax.legend()
    fig.tight_layout()
    out = GRAPHS_DIR / "ambulance_delay_vs_sources.png"
    fig.savefig(out, dpi=200)
    plt.close(fig)
    print(f"Created: {out.name}")


def plot_throughput_vs_sources(df):
    """Graph 2: Ambulance Throughput vs Number of Ordinary Sources"""
    sub = df[df["exp_id"].str.startswith("EXP2_SOURCES_")].sort_values("ordinary_sources")
    if sub.empty:
        return

    fig, ax = plt.subplots(figsize=(8, 5))
    ax.plot(sub["ordinary_sources"], sub["amb_throughput_kbps"], marker="s", linewidth=2.5, color="#1976D2", label="Ambulance Throughput")
    ax.set_title("Ambulance Achieved Throughput vs Ordinary Traffic Load")
    ax.set_xlabel("Number of Ordinary Traffic Sources")
    ax.set_ylabel("Throughput (kbps)")
    ax.set_xticks(sub["ordinary_sources"])
    ax.legend()
    fig.tight_layout()
    out = GRAPHS_DIR / "ambulance_throughput_vs_sources.png"
    fig.savefig(out, dpi=200)
    plt.close(fig)
    print(f"Created: {out.name}")


def plot_delivery_ratio_vs_sources(df):
    """Graph 3: Delivery Ratio vs Number of Ordinary Sources"""
    sub = df[df["exp_id"].str.startswith("EXP2_SOURCES_")].sort_values("ordinary_sources")
    if sub.empty:
        return

    fig, ax = plt.subplots(figsize=(8, 5))
    ax.plot(sub["ordinary_sources"], sub["amb_pdr_percent"], marker="^", linewidth=2.5, color="#2E7D32", label="Ambulance PDR (%)")
    ax.plot(sub["ordinary_sources"], sub["net_pdr_percent"], marker="x", linewidth=2.0, linestyle="--", color="#F57C00", label="Overall Network PDR (%)")
    ax.set_title("Packet Delivery Ratio (PDR): Ambulance vs Overall Network")
    ax.set_xlabel("Number of Ordinary Traffic Sources")
    ax.set_ylabel("Delivery Ratio (%)")
    ax.set_ylim(0, 105)
    ax.set_xticks(sub["ordinary_sources"])
    ax.legend()
    fig.tight_layout()
    out = GRAPHS_DIR / "delivery_ratio_vs_sources.png"
    fig.savefig(out, dpi=200)
    plt.close(fig)
    print(f"Created: {out.name}")


def plot_delay_vs_ambulances(df):
    """Graph 4: Ambulance Delay vs Number of Ambulances"""
    sub = df[df["exp_id"].str.startswith("EXP3_AMBULANCES_")].sort_values("ambulances")
    if sub.empty:
        return

    fig, ax = plt.subplots(figsize=(8, 5))
    bars = ax.bar(sub["ambulances"].astype(str), sub["amb_delay_ms"], color="#8E24AA", width=0.5, edgecolor="black", alpha=0.85)
    ax.set_title("Ambulance Delay Under Multiple Simultaneous Emergency Vehicles")
    ax.set_xlabel("Number of Moving Ambulances")
    ax.set_ylabel("Average Delay (ms)")
    for b in bars:
        h = b.get_height()
        ax.annotate(f"{h:.2f} ms", (b.get_x() + b.get_width() / 2, h), textcoords="offset points", xytext=(0, 4), ha="center", fontweight="bold")
    fig.tight_layout()
    out = GRAPHS_DIR / "ambulance_delay_vs_ambulances.png"
    fig.savefig(out, dpi=200)
    plt.close(fig)
    print(f"Created: {out.name}")


def plot_throughput_vs_ambulances(df):
    """Graph 5: Ambulance Throughput vs Number of Ambulances"""
    sub = df[df["exp_id"].str.startswith("EXP3_AMBULANCES_")].sort_values("ambulances")
    if sub.empty:
        return

    fig, ax = plt.subplots(figsize=(8, 5))
    ax.plot(sub["ambulances"], sub["amb_throughput_kbps"], marker="D", linewidth=2.5, color="#00897B", label="Aggregate Ambulance Throughput")
    ax.set_title("Total Emergency Traffic Throughput vs Ambulance Count")
    ax.set_xlabel("Number of Ambulances")
    ax.set_ylabel("Throughput (kbps)")
    ax.set_xticks(sub["ambulances"])
    ax.legend()
    fig.tight_layout()
    out = GRAPHS_DIR / "ambulance_throughput_vs_ambulances.png"
    fig.savefig(out, dpi=200)
    plt.close(fig)
    print(f"Created: {out.name}")


def plot_static_vs_mobile(df):
    """Graph 6: Static vs Mobile Performance Comparison"""
    sub = df[df["exp_id"].isin(["EXP1_STATIC", "EXP1_MOBILE"])]
    if sub.empty:
        return

    metrics = ["amb_delay_ms", "amb_jitter_ms", "amb_throughput_kbps"]
    labels = ["Delay (ms)", "Jitter (ms)", "Throughput (kbps)"]

    fig, axes = plt.subplots(1, 3, figsize=(12, 4.5))
    modes = sub["mobility_mode"].tolist()
    colors = ["#455A64", "#0288D1"]

    for i, m in enumerate(metrics):
        vals = sub[m].tolist()
        bars = axes[i].bar(modes, vals, color=colors, width=0.45, edgecolor="black", alpha=0.85)
        axes[i].set_title(labels[i])
        for b in bars:
            h = b.get_height()
            axes[i].annotate(f"{h:.2f}", (b.get_x() + b.get_width() / 2, h), textcoords="offset points", xytext=(0, 4), ha="center", fontweight="bold")

    fig.suptitle("Performance Comparison: Static Baseline vs Random Waypoint Mobility", fontweight="bold")
    fig.tight_layout()
    out = GRAPHS_DIR / "static_vs_mobile_comparison.png"
    fig.savefig(out, dpi=200)
    plt.close(fig)
    print(f"Created: {out.name}")


def plot_propagation_models(df):
    """Graph 7: Propagation Models Comparison"""
    sub = df[df["exp_id"].str.startswith("EXP5_PROP_")]
    if sub.empty:
        return

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(11, 4.5))
    props = sub["prop_model"].tolist()
    delays = sub["amb_delay_ms"].tolist()
    pdrs = sub["amb_pdr_percent"].tolist()

    ax1.bar(props, delays, color="#E64A19", width=0.5, edgecolor="black", alpha=0.85)
    ax1.set_title("Ambulance Delay by Propagation Model")
    ax1.set_ylabel("Delay (ms)")

    ax2.bar(props, pdrs, color="#388E3C", width=0.5, edgecolor="black", alpha=0.85)
    ax2.set_title("Ambulance PDR by Propagation Model")
    ax2.set_ylabel("PDR (%)")
    ax2.set_ylim(0, 105)

    fig.tight_layout()
    out = GRAPHS_DIR / "propagation_models_comparison.png"
    fig.savefig(out, dpi=200)
    plt.close(fig)
    print(f"Created: {out.name}")


def plot_priority_disabled_vs_enabled(df):
    """Graph 8: Priority Disabled vs Enabled (BE vs VI vs VO)"""
    sub = df[df["exp_id"].isin(["EXP4_PRIORITY_OFF", "EXP4_PRIORITY_ON_BE", "EXP4_PRIORITY_ON_VI", "EXP4_PRIORITY_ON_VO"])]
    if sub.empty:
        return

    labels = ["Priority OFF", "QoS: BE", "QoS: VI", "QoS: VO"]
    delays = sub["amb_delay_ms"].tolist()
    jitters = sub["amb_jitter_ms"].tolist()

    x = np.arange(len(labels))
    width = 0.35

    fig, ax = plt.subplots(figsize=(9, 5))
    ax.bar(x - width/2, delays, width, label="Delay (ms)", color="#C2185B", edgecolor="black", alpha=0.85)
    ax.bar(x + width/2, jitters, width, label="Jitter (ms)", color="#7B1FA2", edgecolor="black", alpha=0.85)

    ax.set_title("Emergency Traffic Prioritization: OFF vs IEEE 802.11e ACs (50 Sources)")
    ax.set_xticks(x)
    ax.set_xticklabels(labels)
    ax.set_ylabel("Milliseconds (ms)")
    ax.legend()

    fig.tight_layout()
    out = GRAPHS_DIR / "priority_disabled_vs_enabled.png"
    fig.savefig(out, dpi=200)
    plt.close(fig)
    print(f"Created: {out.name}")


def plot_ordinary_traffic_impact(df):
    """Graph 9: Ordinary Traffic Performance under Emergency Prioritization"""
    sub = df[df["exp_id"].isin(["EXP4_PRIORITY_OFF", "EXP4_PRIORITY_ON_VO"])]
    if sub.empty:
        return

    fig, ax = plt.subplots(figsize=(7, 4.5))
    labels = ["Priority OFF", "Priority ON (VO)"]
    net_pdr = sub["net_pdr_percent"].tolist()
    amb_pdr = sub["amb_pdr_percent"].tolist()

    x = np.arange(len(labels))
    width = 0.3

    ax.bar(x - width/2, amb_pdr, width, label="Ambulance PDR", color="#2E7D32", edgecolor="black", alpha=0.85)
    ax.bar(x + width/2, net_pdr, width, label="Overall Network PDR", color="#546E7A", edgecolor="black", alpha=0.85)

    ax.set_title("Trade-off: Ambulance Protection vs Ordinary Traffic PDR")
    ax.set_xticks(x)
    ax.set_xticklabels(labels)
    ax.set_ylabel("Delivery Ratio (%)")
    ax.set_ylim(0, 105)
    ax.legend()

    fig.tight_layout()
    out = GRAPHS_DIR / "ordinary_traffic_impact_qos.png"
    fig.savefig(out, dpi=200)
    plt.close(fig)
    print(f"Created: {out.name}")


def plot_throughput_vs_offered_load(df):
    """Graph 10: Throughput vs Offered Load across PHY Configurations"""
    sub = df[df["exp_id"].str.startswith("EXP6_")]
    if sub.empty:
        return

    fig, ax = plt.subplots(figsize=(9, 5))
    for phy in ["ErpOfdmRate6Mbps", "ErpOfdmRate24Mbps", "ErpOfdmRate54Mbps"]:
        subset = sub[sub["phy_rate"] == phy].sort_values("ordinary_rate")
        if not subset.empty:
            label = phy.replace("ErpOfdmRate", "")
            ax.plot(subset["ordinary_rate"], subset["amb_throughput_kbps"], marker="o", linewidth=2.2, label=f"PHY: {label}")

    ax.set_title("Throughput vs Offered Background Load Across 802.11g PHY Modes")
    ax.set_xlabel("Offered Ordinary Data Rate per Source")
    ax.set_ylabel("Ambulance Throughput (kbps)")
    ax.legend(title="PHY Modulation")
    fig.tight_layout()
    out = GRAPHS_DIR / "throughput_vs_offered_load.png"
    fig.savefig(out, dpi=200)
    plt.close(fig)
    print(f"Created: {out.name}")


def plot_application_message_delivery(df):
    """Graph 11: Application Message Delivery Breakdown"""
    sub = df[df["exp_id"] == "EXP8_EMERGENCY_APP_MSGS"]
    if sub.empty:
        # Fallback to any recent run
        sub = df.tail(1)

    row = sub.iloc[0]
    fig, ax = plt.subplots(figsize=(8, 4.5))
    types = ["Telemetry", "Emergency Alerts", "Hospital Pre-Alerts", "Ordinary Telemetry"]
    counts = [
        row.get("app_valid_msgs", 0) - row.get("app_alerts_rx", 0) - row.get("app_prealerts_rx", 0) - row.get("app_ordinary_rx", 0),
        row.get("app_alerts_rx", 0),
        row.get("app_prealerts_rx", 0),
        row.get("app_ordinary_rx", 0)
    ]
    # Ensure non-negative
    counts = [max(0, c) for c in counts]

    colors = ["#1976D2", "#D32F2F", "#F57C00", "#388E3C"]
    bars = ax.bar(types, counts, color=colors, width=0.5, edgecolor="black", alpha=0.85)
    ax.set_title("Application-Layer Messages Successfully Validated & Received")
    ax.set_ylabel("Delivered Message Count")
    for b in bars:
        h = b.get_height()
        ax.annotate(f"{h}", (b.get_x() + b.get_width() / 2, h), textcoords="offset points", xytext=(0, 4), ha="center", fontweight="bold")

    fig.tight_layout()
    out = GRAPHS_DIR / "application_message_delivery.png"
    fig.savefig(out, dpi=200)
    plt.close(fig)
    print(f"Created: {out.name}")


def plot_reproducibility_variability(df):
    """Graph 12: Performance Variability Across Random Seeds (EXP 7)"""
    sub = df[df["exp_id"].str.startswith("EXP7_RUN_")].sort_values("run")
    if sub.empty:
        return

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(11, 4.5))

    runs = sub["run"].tolist()
    delays = sub["amb_delay_ms"].tolist()
    pdrs = sub["amb_pdr_percent"].tolist()

    mean_delay = np.mean(delays)
    std_delay = np.std(delays)

    ax1.plot(runs, delays, marker="o", color="#303F9F", linewidth=2.2, label="Trial Delay")
    ax1.axhline(mean_delay, color="#D32F2F", linestyle="--", label=f"Mean: {mean_delay:.2f} ms")
    ax1.fill_between(runs, mean_delay - std_delay, mean_delay + std_delay, color="#D32F2F", alpha=0.15, label="±1 Std Dev")
    ax1.set_title("Ambulance Delay Consistency (5 Random Seeds)")
    ax1.set_xlabel("RngRun Number")
    ax1.set_ylabel("Delay (ms)")
    ax1.set_xticks(runs)
    ax1.legend()

    ax2.plot(runs, pdrs, marker="s", color="#388E3C", linewidth=2.2, label="Trial PDR")
    ax2.set_title("Ambulance Delivery Ratio Consistency")
    ax2.set_xlabel("RngRun Number")
    ax2.set_ylabel("PDR (%)")
    ax2.set_ylim(0, 105)
    ax2.set_xticks(runs)
    ax2.legend()

    fig.tight_layout()
    out = GRAPHS_DIR / "reproducibility_variability.png"
    fig.savefig(out, dpi=200)
    plt.close(fig)
    print(f"Created: {out.name}")


def main():
    print(f"Reading dataset: {CSV_PATH}")
    df = load_data()
    print(f"Loaded {len(df)} simulation experiment records.")

    plot_delay_vs_sources(df)
    plot_throughput_vs_sources(df)
    plot_delivery_ratio_vs_sources(df)
    plot_delay_vs_ambulances(df)
    plot_throughput_vs_ambulances(df)
    plot_static_vs_mobile(df)
    plot_propagation_models(df)
    plot_priority_disabled_vs_enabled(df)
    plot_ordinary_traffic_impact(df)
    plot_throughput_vs_offered_load(df)
    plot_application_message_delivery(df)
    plot_reproducibility_variability(df)

    print(f"\nAll graphs successfully written to: {GRAPHS_DIR}")


if __name__ == "__main__":
    main()
