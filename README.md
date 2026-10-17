# Priority-Based Emergency Ambulance Communication in Congested Networks Using NS-3

## Overview

This project evaluates how Wi-Fi Quality of Service (QoS) priority affects
ambulance traffic under increasing network load. It uses NS-3.45 to simulate
an ad-hoc Wi-Fi network containing one ambulance traffic source, normal traffic
sources, and a common UDP receiver.

## Objectives

- Simulate low, medium, and high offered traffic loads.
- Compare ambulance performance with priority disabled and enabled.
- Compare Best Effort (BE), Video (VI), and Voice (VO) access categories.
- Measure throughput, average delay, jitter, packet reception, and delivery ratio.
- Analyze the impact of emergency priority on normal traffic.

## Technologies

- NS-3.45
- C++
- IEEE 802.11g ad-hoc Wi-Fi with QoS enabled
- UDP applications and PacketSink
- FlowMonitor
- Python, pandas, and Matplotlib
- Ubuntu on WSL2

## Project structure

- `src/`: simulation source files.
- `scripts/`: experiment, analysis, and graph-generation scripts.
- `results/experiment_results/`: CSV summaries, raw logs, graphs, and baseline backup.
- `results/xml/`: exported FlowMonitor XML files.
- `docs/`: demonstration and results notes.

## Experiments

The load experiment contains 30 runs: 2, 5, and 10 sources, with priority
OFF and ON, using five trials per configuration.

The access-category experiment contains 15 runs: five trials each for BE,
VI, and VO with 10 sources.

## Key findings

For the 10-source configuration, mean ambulance delay across five trials was:

| Mode | Mean ambulance delay |
|---|---:|
| BE | 289.993 ms |
| VI | 6.314 ms |
| VO | 4.355 ms |

VO reduced mean ambulance delay by 98.50% relative to BE in this configuration.
VI and VO also changed normal-traffic performance, showing a trade-off between
emergency traffic and ordinary traffic.

These results describe the tested simulation configuration; they are not
guarantees of performance in a real-world ambulance network.

## Run the simulation

Install/configure NS-3.45 separately, then copy the files from `src/` into
the NS-3.45 `scratch/` directory. Build and run the programs using the
commands in `docs/DEMO_GUIDE.md`.

## Limitations

The current model uses fixed node positions, a single ad-hoc Wi-Fi network,
UDP traffic, and a common receiver. It does not model ambulance mobility,
cellular communication, or a dedicated roadside unit.

## Results

See `results/experiment_results/graphs/` for graphs and the CSV files for
trial-level measurements. Raw experiment logs are retained for traceability.
