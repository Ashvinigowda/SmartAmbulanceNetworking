
import csv
import re
import subprocess
from pathlib import Path

import matplotlib.pyplot as plt
import pandas as pd

ROOT = Path(__file__).resolve().parent
PYTHON = "/home/ashwini/.local/bin/python3.13"
NS3 = ROOT / "ns3"
RESULTS = ROOT / "experiment_results"
LOGS = RESULTS / "logs"
GRAPHS = RESULTS / "graphs"

SOURCE_COUNTS = [2, 5, 10]
DATA_RATE = "2Mbps"

for directory in (LOGS, GRAPHS):
    directory.mkdir(parents=True, exist_ok=True)


def extract(pattern, text, default=None, cast=float):
    match = re.search(pattern, text, re.MULTILINE)
    if not match:
        return default
    return cast(match.group(1))


def run_experiment(sources, priority):
    label = "on" if priority else "off"
    name = f"sources_{sources}_priority_{label}"
    log_path = LOGS / f"{name}.txt"

    command = [
        PYTHON,
        str(NS3),
        "run",
        (
            f"ambulance-congestion --numberOfSources={sources} "
            f"--dataRate={DATA_RATE} "
            f"--priorityEnabled={priority}"
        ),
    ]

    print(f"\nRunning: {name}")

    result = subprocess.run(
        command,
        cwd=ROOT,
        capture_output=True,
        text=True,
        timeout=600,
    )

    output = result.stdout + "\n" + result.stderr
    log_path.write_text(output, encoding="utf-8")

    if result.returncode != 0:
        raise RuntimeError(
            f"Experiment failed: {name}\n"
            f"Check the log: {log_path}\n{output[-3000:]}"
        )

    # Flow 1 is the ambulance in the current C++ program.
    flow_match = re.search(
        r"Flow 1 \| Source:?\s*(\S+)\s*\n"
        r"TX packets:\s*(\d+)\s*\|\s*RX packets:\s*(\d+)"
        r"\s*\|\s*FlowMonitor lost:\s*(\d+)\s*\n"
        r"Throughput:\s*([\d.]+)\s*kbps"
        r"\s*\|\s*Delay:\s*([\d.]+)\s*ms"
        r"\s*\|\s*Jitter:\s*([\d.]+)\s*ms",
        output,
    )

    if not flow_match:
        # Also support the earlier version of the C++ output.
        flow_match = re.search(
            r"Flow 1 \| Source:?\s*(\S+)\s*\n"
            r"\s*TX packets:\s*(\d+)\s*\n"
            r"\s*RX packets:\s*(\d+)\s*\n"
            r"\s*Lost packets \(FlowMonitor\):\s*(\d+)\s*\n"
            r"\s*Throughput:\s*([\d.]+)\s*kbps\s*\n"
            r"\s*Average delay:\s*([\d.]+)\s*ms\s*\n"
            r"\s*Average jitter:\s*([\d.]+)\s*ms",
            output,
        )

    if not flow_match:
        raise RuntimeError(
            f"Could not parse ambulance Flow 1 in {log_path}. "
            "The log has been preserved."
        )

    source, tx, rx, lost, throughput, delay, jitter = flow_match.groups()

    total_tx = extract(r"Total TX:\s*(\d+)", output, cast=int)
    total_rx = extract(r"Total RX:\s*(\d+)", output, cast=int)
    total_lost = extract(
        r"FlowMonitor lost count:\s*(\d+)", output, cast=int
    )

    if total_tx is None or total_rx is None:
        total_tx = extract(r"Total transmitted:\s*(\d+)", output, cast=int)
        total_rx = extract(r"Total received:\s*(\d+)", output, cast=int)
        total_lost = extract(
            r"FlowMonitor lost count:\s*(\d+)", output, cast=int
        )

    if total_tx is None or total_rx is None:
        raise RuntimeError(f"Could not parse aggregate results in {log_path}")

    print(
        f"  Ambulance delay: {delay} ms | "
        f"RX: {rx}/{tx} | throughput: {throughput} kbps"
    )

    return {
        "sources": sources,
        "data_rate_per_source": DATA_RATE,
        "priority": "ON" if priority else "OFF",
        "ambulance_source_ip": source,
        "ambulance_tx_packets": int(tx),
        "ambulance_rx_packets": int(rx),
        "ambulance_flowmonitor_lost": int(lost),
        "ambulance_throughput_kbps": float(throughput),
        "ambulance_delay_ms": float(delay),
        "ambulance_jitter_ms": float(jitter),
        "aggregate_tx_packets": total_tx,
        "aggregate_rx_packets": total_rx,
        "aggregate_flowmonitor_lost": total_lost,
        "aggregate_delivery_ratio_pct": (
            100.0 * total_rx / total_tx if total_tx else 0.0
        ),
        "log_file": str(log_path.relative_to(ROOT)),
    }


def make_graph(df, metric, ylabel, filename):
    pivot = df.pivot(
        index="sources", columns="priority", values=metric
    )

    ax = pivot.reindex(columns=["OFF", "ON"]).plot(
        kind="bar", figsize=(8, 5)
    )
    ax.set_title(f"Ambulance {ylabel}: Priority OFF vs ON")
    ax.set_xlabel("Number of traffic sources")
    ax.set_ylabel(ylabel)
    ax.legend(title="Priority")
    ax.grid(axis="y", alpha=0.3)

    plt.tight_layout()
    plt.savefig(GRAPHS / filename, dpi=160)
    plt.close()


def main():
    rows = []

    for sources in SOURCE_COUNTS:
        for priority in (0, 1):
            rows.append(run_experiment(sources, priority))

    df = pd.DataFrame(rows)
    csv_path = RESULTS / "experiment_summary.csv"
    df.to_csv(csv_path, index=False)

    make_graph(
        df, "ambulance_delay_ms", "Average delay (ms)",
        "ambulance_delay.png"
    )
    make_graph(
        df, "ambulance_throughput_kbps", "Throughput (kbps)",
        "ambulance_throughput.png"
    )
    make_graph(
        df, "ambulance_rx_packets", "Received packets",
        "ambulance_received_packets.png"
    )
    make_graph(
        df, "ambulance_jitter_ms", "Average jitter (ms)",
        "ambulance_jitter.png"
    )

    print("\nAll six experiments completed.")
    print(f"CSV summary: {csv_path}")
    print(f"Logs: {LOGS}")
    print(f"Graphs: {GRAPHS}")
    print("\nAmbulance comparison:")
    print(
        df[
            [
                "sources",
                "priority",
                "ambulance_delay_ms",
                "ambulance_throughput_kbps",
                "ambulance_rx_packets",
                "ambulance_jitter_ms",
            ]
        ].to_string(index=False)
    )


if __name__ == "__main__":
    main()
